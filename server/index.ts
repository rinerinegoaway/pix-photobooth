// . PIX signaling + static server (Bun).
//
//   bun run server    ->  ws://localhost:8787/ws  (and serves ./dist after `bun run build`)
//
// What this process sees:  display names, WebRTC session descriptions and ICE candidates
//                          (which contain network addresses), and countdown timing.
// What it never sees:      camera video, photos or recordings. Those travel peer-to-peer.
// What it stores:          an in-memory room table, dropped on expiry or restart; room ids are
//                          never logged. Separately (see community.ts) it writes anonymous usage
//                          totals and submitted feedback to DATA_DIR. Never photos or video.

import { existsSync } from 'node:fs'
import { join, normalize, sep } from 'node:path'
import { COUNTDOWN_CHOICES, COUNTDOWN_SECONDS, SHOTS_PER_SESSION } from '../src/lib/protocol.ts'
import type { ClientMessage, ErrorCode, ServerMessage } from '../src/lib/protocol.ts'
import { handleCommunityRequest, recordEvent } from './community.ts'

const PORT = Number(process.env.PORT ?? 8787)
const DIST = join(import.meta.dir, '..', 'dist')
const TRUST_PROXY = process.env.TRUST_PROXY === '1'
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

const ROOM_MAX_AGE_MS = 3 * 60 * 60 * 1000
const ROOM_EMPTY_GRACE_MS = 5 * 60 * 1000
const PEER_RESUME_GRACE_MS = 10 * 60 * 1000
const MAX_ROOMS = 2000
const ROOMS_PER_10_MIN = Number(process.env.ROOMS_PER_10_MIN ?? 8)
const CAPTURE_ACK_WAIT_MS = 5000
const COUNTDOWN_LEAD_MS = 700
const MAX_NAME = 24

const STUN_URLS = (process.env.STUN_URLS ?? 'stun:stun.l.google.com:19302').split(',')
const TURN_URLS = (process.env.TURN_URLS ?? '').split(',').filter(Boolean)

interface SocketData {
  ip: string
  room: Room | null
  seat: Seat | null
  tokens: number
  refilledAt: number
}

type Ws = Bun.ServerWebSocket<SocketData>

interface Seat {
  id: string
  secret: string
  role: 'host' | 'guest'
  name: string
  ws: Ws | null
  ready: boolean
  disconnectedAt: number | null
}

interface Countdown {
  cid: string
  shot: number
  captureAt: number
  acked: Set<string>
  timer: ReturnType<typeof setTimeout>
}

interface Room {
  id: string
  createdAt: number
  seats: Seat[]
  countdown: Countdown | null
  emptySince: number | null
  lastSessionAt: number
}

const rooms = new Map<string, Room>()

// ---------- helpers ----------

/** Active sessions = shared booth rooms where at least one participant is connected right now. */
function countActiveRooms(): number {
  let active = 0
  for (const room of rooms.values()) if (room.seats.some(seat => seat.ws !== null)) active++
  return active
}

// Crockford-style alphabet without look-alike characters. 16 symbols ≈ 78 bits.
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'

function randomString(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length * 2))
  let out = ''
  for (const byte of bytes) {
    // Rejection sampling avoids modulo bias.
    if (byte < 240 && out.length < length) out += ALPHABET[byte % ALPHABET.length]
  }
  return out.length === length ? out : randomString(length)
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), b => b.toString(16).padStart(2, '0')).join('')
}

function send(ws: Ws | null | undefined, message: ServerMessage) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(message))
}

function fail(ws: Ws, code: ErrorCode, message: string) {
  send(ws, { t: 'error', code, message })
}

function cleanName(value: unknown): string {
  // eslint-disable-next-line no-control-regex
  const text = typeof value === 'string' ? value.replace(/[\u0000-\u001f<>]/g, '').trim() : ''
  return (text || 'Guest').slice(0, MAX_NAME)
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function otherSeat(room: Room, seat: Seat): Seat | undefined {
  return room.seats.find(candidate => candidate !== seat)
}

function clearCountdown(room: Room) {
  if (room.countdown) clearTimeout(room.countdown.timer)
  room.countdown = null
}

function cancelCountdown(room: Room, reason: string) {
  if (!room.countdown) return
  clearCountdown(room)
  for (const seat of room.seats) send(seat.ws, { t: 'cancelled', reason })
}

function dropRoom(room: Room) {
  clearCountdown(room)
  for (const seat of room.seats) {
    const ws = seat.ws
    seat.ws = null
    if (ws) {
      ws.data.room = null
      ws.data.seat = null
      ws.close(1000, 'room closed')
    }
  }
  rooms.delete(room.id)
}

// ---------- rate limiting ----------

const windows = new Map<string, number[]>()

function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const hits = (windows.get(key) ?? []).filter(time => now - time < windowMs)
  if (hits.length >= limit) {
    windows.set(key, hits)
    return false
  }
  hits.push(now)
  windows.set(key, hits)
  return true
}

function takeToken(ws: Ws): boolean {
  const data = ws.data
  const now = Date.now()
  data.tokens = Math.min(40, data.tokens + ((now - data.refilledAt) / 1000) * 20)
  data.refilledAt = now
  if (data.tokens < 1) return false
  data.tokens -= 1
  return true
}

function clientIp(req: Request, srv: Bun.Server<SocketData>): string {
  if (TRUST_PROXY) {
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    if (forwarded) return forwarded
  }
  return srv.requestIP(req)?.address ?? 'unknown'
}

// ---------- message handling ----------

function describeJoin(room: Room, seat: Seat): ServerMessage {
  const other = otherSeat(room, seat)
  return {
    t: 'joined',
    room: room.id,
    peer: seat.id,
    secret: seat.secret,
    role: seat.role,
    other: other ? { name: other.name, connected: other.ws !== null, ready: other.ready } : null,
    expiresAt: room.createdAt + ROOM_MAX_AGE_MS,
  }
}

function attach(ws: Ws, room: Room, seat: Seat) {
  // A newer connection for the same seat replaces the stale one.
  const previous = seat.ws
  seat.ws = ws
  seat.disconnectedAt = null
  room.emptySince = null
  ws.data.room = room
  ws.data.seat = seat
  if (previous && previous !== ws) {
    previous.data.room = null
    previous.data.seat = null
    previous.close(1000, 'replaced')
  }
}

function handleCreate(ws: Ws, message: Extract<ClientMessage, { t: 'create' }>) {
  if (!allow(`create:${ws.data.ip}`, ROOMS_PER_10_MIN, 10 * 60 * 1000)) {
    return fail(ws, 'rate-limited', 'Too many rooms were created from this network. Try again in a few minutes.')
  }
  if (rooms.size >= MAX_ROOMS) return fail(ws, 'server-busy', 'The server is busy. Try again shortly.')
  let id = randomString(16)
  while (rooms.has(id)) id = randomString(16)
  const seat: Seat = {
    id: randomHex(8),
    secret: randomHex(24),
    role: 'host',
    name: cleanName(message.name),
    ws: null,
    ready: false,
    disconnectedAt: null,
  }
  const room: Room = { id, createdAt: Date.now(), seats: [seat], countdown: null, emptySince: null, lastSessionAt: 0 }
  rooms.set(id, room)
  attach(ws, room, seat)
  send(ws, describeJoin(room, seat))
}

function handleJoin(ws: Ws, message: Extract<ClientMessage, { t: 'join' }>) {
  if (!allow(`join:${ws.data.ip}`, 30, 60 * 1000)) {
    return fail(ws, 'rate-limited', 'Too many attempts. Wait a minute and try again.')
  }
  const code = typeof message.room === 'string' ? message.room.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : ''
  const room = rooms.get(code)
  if (!room) return fail(ws, 'not-found', 'We could not find that room. It may have expired.')

  let seat: Seat | undefined
  let resumed = false
  const resume = message.resume
  if (resume && typeof resume.peer === 'string' && typeof resume.secret === 'string') {
    const match = room.seats.find(candidate => candidate.id === resume.peer)
    if (!match || !constantTimeEqual(match.secret, resume.secret)) {
      return fail(ws, 'not-allowed', 'This seat could not be resumed.')
    }
    seat = match
    resumed = true
  }

  if (!seat) {
    if (room.seats.length >= 2) return fail(ws, 'room-full', 'This room already has two people in it.')
    seat = {
      id: randomHex(8),
      secret: randomHex(24),
      role: 'guest',
      name: cleanName(message.name),
      ws: null,
      ready: false,
      disconnectedAt: null,
    }
    room.seats.push(seat)
  } else if (message.name) {
    seat.name = cleanName(message.name)
  }

  attach(ws, room, seat)
  seat.ready = false
  send(ws, describeJoin(room, seat))
  const other = otherSeat(room, seat)
  if (other) {
    send(other.ws, { t: 'peer-joined', name: seat.name, mediaIntact: Boolean(resumed && resume?.mediaIntact) })
    send(other.ws, { t: 'ready-state', peerReady: false })
  }
  // A new or resumed participant interrupts any running countdown so both sides stay aligned.
  cancelCountdown(room, 'A participant joined.')
}

function startCountdown(room: Room, seat: Seat, shot: unknown, requested: unknown) {
  const ws = seat.ws
  if (!ws) return
  if (typeof shot !== 'number' || !Number.isInteger(shot) || shot < 0 || shot >= SHOTS_PER_SESSION) {
    return fail(ws, 'bad-message', 'Invalid shot number.')
  }
  const other = otherSeat(room, seat)
  if (!other || !other.ws) return fail(ws, 'not-ready', 'Your partner is not connected yet.')
  if (!seat.ready || !other.ready) return fail(ws, 'not-ready', 'Both cameras need to be ready first.')
  if (room.countdown) return fail(ws, 'busy', 'A countdown is already running.')

  // The first shot starts a session. Retaking photo 1 shortly afterwards is the same session.
  if (shot === 0 && Date.now() - room.lastSessionAt > 5 * 60 * 1000) {
    room.lastSessionAt = Date.now()
    recordEvent('session')
  }
  const now = Date.now()
  const seconds = COUNTDOWN_CHOICES.find(choice => choice === requested) ?? COUNTDOWN_SECONDS
  const startsAt = now + COUNTDOWN_LEAD_MS
  const captureAt = startsAt + seconds * 1000
  const cid = randomHex(6)
  room.countdown = {
    cid,
    shot,
    captureAt,
    acked: new Set(),
    timer: setTimeout(() => finishCountdown(room, cid, true), captureAt - now + CAPTURE_ACK_WAIT_MS),
  }
  for (const member of room.seats) {
    send(member.ws, { t: 'countdown', cid, shot, startsAt, captureAt })
  }
}

function finishCountdown(room: Room, cid: string, timedOut: boolean) {
  const countdown = room.countdown
  if (!countdown || countdown.cid !== cid) return
  clearCountdown(room)
  for (const seat of room.seats) {
    if (!timedOut) {
      send(seat.ws, { t: 'shot-complete', cid })
    } else {
      const other = otherSeat(room, seat)
      send(seat.ws, {
        t: 'shot-failed',
        cid,
        reason: 'timeout',
        missingPeer: Boolean(other && !countdown.acked.has(other.id)),
      })
    }
  }
}

function handleMessage(ws: Ws, raw: string | Buffer) {
  if (!takeToken(ws)) return fail(ws, 'rate-limited', 'Slow down a little.')
  if (typeof raw !== 'string') return fail(ws, 'bad-message', 'Unsupported message.')
  let message: ClientMessage
  try {
    message = JSON.parse(raw) as ClientMessage
  } catch {
    return fail(ws, 'bad-message', 'Malformed message.')
  }
  if (!message || typeof message !== 'object' || typeof message.t !== 'string') {
    return fail(ws, 'bad-message', 'Malformed message.')
  }

  switch (message.t) {
    case 'ping':
      return send(ws, { t: 'pong', c: Number(message.c) || 0, s: Date.now() })
    case 'create':
      if (ws.data.room) return fail(ws, 'bad-message', 'Already in a room.')
      return handleCreate(ws, message)
    case 'join':
      if (ws.data.room) return fail(ws, 'bad-message', 'Already in a room.')
      return handleJoin(ws, message)
  }

  const { room, seat } = ws.data
  if (!room || !seat) return fail(ws, 'not-allowed', 'Join a room first.')
  const other = otherSeat(room, seat)

  switch (message.t) {
    case 'signal': {
      const data = message.data
      if (!data || typeof data !== 'object' || typeof data.k !== 'string') {
        return fail(ws, 'bad-message', 'Malformed signal.')
      }
      return send(other?.ws, { t: 'signal', data })
    }
    case 'ready':
      seat.ready = message.ready === true
      send(other?.ws, { t: 'ready-state', peerReady: seat.ready })
      if (!seat.ready) cancelCountdown(room, 'A camera is no longer ready.')
      return
    case 'countdown':
      return startCountdown(room, seat, message.shot, message.seconds)
    case 'cancel':
      return cancelCountdown(room, 'Cancelled.')
    case 'captured': {
      const countdown = room.countdown
      if (!countdown || countdown.cid !== message.cid) return
      // Ignore acknowledgements that arrive before the capture moment.
      if (Date.now() < countdown.captureAt - 500) return
      countdown.acked.add(seat.id)
      if (countdown.acked.size >= room.seats.length) finishCountdown(room, countdown.cid, false)
      return
    }
    case 'leave':
      return leaveRoom(ws, true)
  }
}

function leaveRoom(ws: Ws, permanent: boolean) {
  const { room, seat } = ws.data
  ws.data.room = null
  ws.data.seat = null
  if (!room || !seat) return
  if (seat.ws !== ws) return // Replaced by a newer connection; nothing to announce.
  seat.ws = null
  seat.ready = false

  const other = otherSeat(room, seat)
  if (permanent) {
    room.seats = room.seats.filter(candidate => candidate !== seat)
    cancelCountdown(room, 'Your partner left.')
    send(other?.ws, { t: 'peer-left' })
  } else {
    seat.disconnectedAt = Date.now()
    cancelCountdown(room, 'Connection to your partner was interrupted.')
    send(other?.ws, { t: 'peer-status', connected: false })
  }
  if (room.seats.every(candidate => candidate.ws === null)) room.emptySince = Date.now()
}

// ---------- housekeeping ----------

setInterval(() => {
  const now = Date.now()
  for (const room of [...rooms.values()]) {
    const expired = now - room.createdAt > ROOM_MAX_AGE_MS
    const abandoned = room.emptySince !== null && now - room.emptySince > ROOM_EMPTY_GRACE_MS
    if (expired || abandoned || room.seats.length === 0) {
      dropRoom(room)
      continue
    }
    for (const seat of [...room.seats]) {
      if (seat.ws === null && seat.disconnectedAt !== null && now - seat.disconnectedAt > PEER_RESUME_GRACE_MS) {
        room.seats = room.seats.filter(candidate => candidate !== seat)
        send(otherSeat(room, seat)?.ws, { t: 'peer-left' })
      }
    }
  }
  for (const [key, hits] of windows) {
    if (hits.every(time => now - time > 10 * 60 * 1000)) windows.delete(key)
  }
}, 30_000).unref()

// ---------- HTTP ----------

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'none'",
  ].join('; '),
}

function iceConfig() {
  const iceServers: { urls: string[]; username?: string; credential?: string }[] = [{ urls: STUN_URLS }]
  if (TURN_URLS.length > 0) {
    iceServers.push({
      urls: TURN_URLS,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    })
  }
  return { iceServers }
}

async function serveStatic(pathname: string): Promise<Response> {
  let requested = ''
  try {
    requested = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '')
  } catch {
    return new Response('Bad request', { status: 400 })
  }
  const target = join(DIST, requested)
  if (requested && target.startsWith(DIST + sep)) {
    const file = Bun.file(target)
    if (await file.exists()) return new Response(file, { headers: SECURITY_HEADERS })
  }
  const index = Bun.file(join(DIST, 'index.html'))
  if (await index.exists()) {
    return new Response(index, { headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8' } })
  }
  return new Response('. PIX signaling server is running. Run `bun run build` to serve the app from here.', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

const server = Bun.serve<SocketData>({
  port: PORT,
  async fetch(req, srv) {
    const url = new URL(req.url)
    if (url.pathname === '/ws') {
      const origin = req.headers.get('origin')
      if (ALLOWED_ORIGINS.length > 0 && (!origin || !ALLOWED_ORIGINS.includes(origin))) {
        return new Response('Forbidden', { status: 403 })
      }
      const upgraded = srv.upgrade(req, {
        data: { ip: clientIp(req, srv), room: null, seat: null, tokens: 40, refilledAt: Date.now() },
      })
      return upgraded ? undefined : new Response('Expected a WebSocket upgrade', { status: 426 })
    }
    const origin = req.headers.get('origin')
    const community = await handleCommunityRequest(
      req,
      url,
      clientIp(req, srv),
      countActiveRooms(),
      origin && ALLOWED_ORIGINS.includes(origin) ? origin : null,
    )
    if (community) return community
    if (url.pathname === '/api/ice') {
      return Response.json(iceConfig(), { headers: { 'Cache-Control': 'no-store' } })
    }
    if (url.pathname === '/api/health') return Response.json({ ok: true })
    if (!existsSync(DIST)) return serveStatic('/')
    return serveStatic(url.pathname)
  },
  websocket: {
    maxPayloadLength: 64 * 1024,
    idleTimeout: 60,
    sendPings: true,
    message(ws, raw) {
      handleMessage(ws, raw)
    },
    close(ws) {
      leaveRoom(ws, false)
    },
  },
})

console.log(`. PIX signaling listening on :${server.port}`)

export { server }
