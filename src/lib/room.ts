import type { ClientMessage, ServerMessage, SignalPayload } from './protocol'

// Browser side of the long-distance booth.
//   - WebSocket to the signaling server: room membership, SDP/ICE relay, server-timed countdowns.
//   - WebRTC peer connection: live video travels directly between the two browsers.
//   - WebRTC data channel: each person sends their own captured frame straight to the other.

export type SignalingState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'
export type LinkState = 'none' | 'negotiating' | 'connected' | 'disconnected' | 'failed'

export interface CountdownInfo {
  cid: string
  shot: number
  /** performance.now()-based moments converted from server time using the measured clock offset. */
  startsAt: number
  captureAt: number
}

export interface ShotResult {
  cid: string
  ok: boolean
  missingPeer: boolean
}

export interface RoomSnapshot {
  signaling: SignalingState
  roomId: string | null
  role: 'host' | 'guest' | null
  selfName: string
  peerName: string | null
  /** The partner is connected to the signaling server. */
  peerPresent: boolean
  link: LinkState
  remoteStream: MediaStream | null
  remoteMirrored: boolean
  dataReady: boolean
  /** The partner has agreed to record the shared session (mutual consent). */
  peerRecordConsent: boolean
  peerReady: boolean
  countdown: CountdownInfo | null
  lastResult: ShotResult | null
  notice: string
  error: string
  /** Set once the room can no longer be used (left, expired, partner gone for good). */
  ended: null | 'left' | 'expired'
  expiresAt: number | null
}

const initial: RoomSnapshot = {
  signaling: 'idle',
  roomId: null,
  role: null,
  selfName: '',
  peerName: null,
  peerPresent: false,
  link: 'none',
  remoteStream: null,
  remoteMirrored: true,
  dataReady: false,
  peerRecordConsent: false,
  peerReady: false,
  countdown: null,
  lastResult: null,
  notice: '',
  error: '',
  ended: null,
  expiresAt: null,
}

interface StoredSession {
  room: string
  peer: string
  secret: string
}

const STORAGE_KEY = 'pix.room-session'
const CHUNK = 16 * 1024

function storage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function loadSession(): StoredSession | null {
  try {
    const raw = storage()?.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

function saveSession(session: StoredSession | null) {
  try {
    if (session) storage()?.setItem(STORAGE_KEY, JSON.stringify(session))
    else storage()?.removeItem(STORAGE_KEY)
  } catch {
    /* private mode: resuming after a reload just won't be available */
  }
}

export function storedRoomCode(): string | null {
  return loadSession()?.room ?? null
}

function signalingUrl(): string {
  const configured = import.meta.env.VITE_SIGNALING_URL as string | undefined
  if (configured) return configured
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${window.location.host}/ws`
}

function iceUrl(): string {
  return signalingUrl().replace(/^ws/, 'http').replace(/\/ws$/, '/api/ice')
}

export class RoomClient {
  private listeners = new Set<() => void>()
  private snap: RoomSnapshot = initial
  private ws: WebSocket | null = null
  private session: StoredSession | null = null
  private pendingOpen: ClientMessage | null = null
  private intentional = false
  private retries = 0
  private reconnectTimer: number | undefined
  private pingTimer: number | undefined
  private pings = new Map<number, { perf: number; wall: number }>()
  private pingCounter = 0
  private bestRtt = Infinity
  private offset = 0
  private iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
  private pc: RTCPeerConnection | null = null
  private dc: RTCDataChannel | null = null
  private pendingIce: RTCIceCandidateInit[] = []
  private disconnectTimer: number | undefined
  private rebuilds = 0
  private localStream: MediaStream | null = null
  private localMirrored = true
  private recordConsent = false
  private wantReady = false
  private sentReady = false
  private frames = new Map<string, Blob>()
  private frameWaiters = new Map<string, (blob: Blob | null) => void>()
  private incoming: { cid: string; size: number; chunks: ArrayBuffer[]; got: number } | null = null

  // ----- store plumbing -----

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.snap

  private set(patch: Partial<RoomSnapshot>) {
    this.snap = { ...this.snap, ...patch }
    this.listeners.forEach(listener => listener())
  }

  // ----- public API -----

  async create(name: string): Promise<void> {
    this.prepare(name)
    this.pendingOpen = { t: 'create', name }
    await this.connect()
  }

  async join(room: string, name: string): Promise<void> {
    this.prepare(name)
    const saved = loadSession()
    const resume = saved && saved.room === room ? { peer: saved.peer, secret: saved.secret, mediaIntact: false } : undefined
    this.pendingOpen = { t: 'join', room, name, resume }
    await this.connect()
  }

  /**
   * Leaves the room and tears everything down. `forget` also discards the saved seat so the room
   * can't be resumed (an explicit leave); pass false when only resetting before a new attempt.
   */
  leave(forget = true) {
    const hadRoom = this.snap.signaling !== 'idle' || this.ws !== null
    const active = hadRoom || this.session !== null
    this.intentional = true
    window.clearTimeout(this.reconnectTimer)
    window.clearInterval(this.pingTimer)
    window.clearTimeout(this.disconnectTimer)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.sendRaw({ t: 'leave' })
    this.ws?.close(1000, 'leave')
    this.ws = null
    this.closePeer()
    this.session = null
    this.wantReady = false
    this.sentReady = false
    if (forget && active) saveSession(null)
    this.failWaiters()
    this.frames.clear()
    this.snap = { ...initial, ended: hadRoom ? 'left' : null }
    this.listeners.forEach(listener => listener())
  }

  /** The camera stream to publish. Pass null when the camera stops. */
  setLocalStream(stream: MediaStream | null, mirrored: boolean) {
    const previous = this.localStream
    this.localStream = stream
    this.localMirrored = mirrored
    if (this.dc?.readyState === 'open') this.sendDc({ k: 'hello', mirrored })
    const pc = this.pc
    if (!pc || !stream) return
    const track = stream.getVideoTracks()[0]
    const sender = pc.getSenders().find(item => item.track?.kind === 'video' || item.track === null)
    if (sender && track) {
      void sender.replaceTrack(track).catch(() => this.set({ error: 'Your new camera could not be shared. Rejoin the room to retry.' }))
    } else if (track && previous !== stream) {
      pc.addTrack(track, stream)
      this.renegotiate()
    }
  }

  /** Tell the partner whether we agree to record the shared session. */
  setRecordConsent(on: boolean) {
    this.recordConsent = on
    this.sendDc({ k: 'rec', on })
  }

  setReady(ready: boolean) {
    this.wantReady = ready
    if (this.session) this.syncReady()
  }

  private syncReady() {
    if (this.sentReady === this.wantReady) return
    this.sentReady = this.wantReady
    this.sendRaw({ t: 'ready', ready: this.wantReady })
  }

  requestShot(shot: number, seconds = 3) {
    this.set({ lastResult: null, error: '' })
    this.sendRaw({ t: 'countdown', shot, seconds })
  }

  cancelCountdown() {
    this.sendRaw({ t: 'cancel' })
  }

  reportCaptured(cid: string) {
    this.sendRaw({ t: 'captured', cid })
  }

  clearNotice() {
    this.set({ notice: '', error: '' })
  }

  /** Server-synchronised "now" as a performance.now() value for a given server timestamp. */
  private toPerf(serverTime: number): number {
    return performance.now() + (serverTime - (Date.now() + this.offset))
  }

  async sendFrame(cid: string, blob: Blob): Promise<boolean> {
    const dc = this.dc
    if (!dc || dc.readyState !== 'open') return false
    try {
      const buffer = await blob.arrayBuffer()
      dc.send(JSON.stringify({ k: 'frame', cid, size: buffer.byteLength }))
      dc.bufferedAmountLowThreshold = 256 * 1024
      for (let offset = 0; offset < buffer.byteLength; offset += CHUNK) {
        if (dc.readyState !== 'open') return false
        if (dc.bufferedAmount > 1_000_000) {
          await new Promise<void>(resolve => dc.addEventListener('bufferedamountlow', () => resolve(), { once: true }))
        }
        dc.send(buffer.slice(offset, offset + CHUNK))
      }
      return true
    } catch {
      return false
    }
  }

  waitForFrame(cid: string, timeoutMs: number): Promise<Blob | null> {
    const ready = this.frames.get(cid)
    if (ready) {
      this.frames.delete(cid)
      return Promise.resolve(ready)
    }
    return new Promise(resolve => {
      const timer = window.setTimeout(() => {
        this.frameWaiters.delete(cid)
        resolve(null)
      }, timeoutMs)
      this.frameWaiters.set(cid, blob => {
        window.clearTimeout(timer)
        resolve(blob)
      })
    })
  }

  // ----- signaling socket -----

  private prepare(name: string) {
    this.leave(false)
    this.intentional = false
    this.retries = 0
    this.snap = { ...initial, selfName: name, signaling: 'connecting' }
    this.listeners.forEach(listener => listener())
  }

  private async connect(): Promise<void> {
    try {
      const response = await fetch(iceUrl(), { cache: 'no-store' })
      if (response.ok) {
        const config = (await response.json()) as { iceServers?: RTCIceServer[] }
        if (config.iceServers?.length) this.iceServers = config.iceServers
      }
    } catch {
      /* fall back to the default STUN server */
    }
    if (this.intentional) return
    this.openSocket()
  }

  private openSocket() {
    let socket: WebSocket
    try {
      socket = new WebSocket(signalingUrl())
    } catch {
      this.set({ signaling: 'closed', error: 'Could not reach the booth server.' })
      return
    }
    this.ws = socket
    socket.onopen = () => {
      if (this.ws !== socket) return
      this.retries = 0
      this.set({ signaling: 'open', notice: '' })
      const first = this.pendingOpen
      this.pendingOpen = null
      if (first) this.sendRaw(first)
      else if (this.session) {
        this.sendRaw({
          t: 'join',
          room: this.session.room,
          name: this.snap.selfName,
          resume: {
            peer: this.session.peer,
            secret: this.session.secret,
            mediaIntact: this.pc?.connectionState === 'connected',
          },
        })
      }
      this.startPings()
    }
    socket.onmessage = event => {
      if (this.ws !== socket || typeof event.data !== 'string') return
      try {
        this.handle(JSON.parse(event.data) as ServerMessage)
      } catch {
        /* ignore malformed frames */
      }
    }
    socket.onclose = () => {
      if (this.ws !== socket) return
      this.ws = null
      window.clearInterval(this.pingTimer)
      if (this.intentional || this.snap.ended) return
      if (!this.session) {
        this.set({ signaling: 'closed', error: this.snap.error || 'The connection to the booth server was lost.' })
        return
      }
      this.scheduleReconnect()
    }
    socket.onerror = () => {
      /* onclose follows and handles recovery */
    }
  }

  private scheduleReconnect() {
    this.retries++
    if (this.retries > 12) {
      this.set({ signaling: 'closed', error: 'We could not reconnect to the room. Check your connection and rejoin.' })
      return
    }
    this.set({ signaling: 'reconnecting', countdown: null })
    const delay = Math.min(8000, 600 * 2 ** (this.retries - 1))
    this.reconnectTimer = window.setTimeout(() => {
      if (!this.intentional) this.openSocket()
    }, delay)
  }

  private startPings() {
    window.clearInterval(this.pingTimer)
    this.bestRtt = Infinity
    const ping = () => {
      const c = ++this.pingCounter
      this.pings.set(c, { perf: performance.now(), wall: Date.now() })
      this.sendRaw({ t: 'ping', c })
    }
    ;[0, 150, 300, 450, 600].forEach(delay => window.setTimeout(ping, delay))
    this.pingTimer = window.setInterval(ping, 15000)
  }

  private sendRaw(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message))
  }

  private sendSignal(data: SignalPayload) {
    this.sendRaw({ t: 'signal', data })
  }

  private handle(message: ServerMessage) {
    switch (message.t) {
      case 'pong': {
        const sent = this.pings.get(message.c)
        this.pings.delete(message.c)
        if (!sent) break
        const rtt = performance.now() - sent.perf
        if (rtt < this.bestRtt) {
          this.bestRtt = rtt
          this.offset = message.s - (sent.wall + rtt / 2)
        }
        break
      }
      case 'joined': {
        this.session = { room: message.room, peer: message.peer, secret: message.secret }
        saveSession(this.session)
        this.set({
          roomId: message.room,
          role: message.role,
          peerName: message.other?.name ?? null,
          peerPresent: Boolean(message.other?.connected),
          peerReady: Boolean(message.other?.ready),
          expiresAt: message.expiresAt,
          error: '',
        })
        // The host makes the offer whenever a partner is present and media is not already flowing.
        if (message.role === 'host' && message.other?.connected && this.pc?.connectionState !== 'connected') {
          void this.hostOffer()
        }
        // The server clears readiness on every (re)join; announce ours again if still wanted.
        this.sentReady = false
        this.syncReady()
        break
      }
      case 'peer-joined':
        this.set({ peerName: message.name, peerPresent: true, peerReady: false, notice: '' })
        if (this.snap.role === 'host' && !(message.mediaIntact && this.pc?.connectionState === 'connected')) {
          void this.hostOffer()
        }
        break
      case 'peer-status':
        this.set({
          peerPresent: message.connected,
          peerReady: false,
          countdown: null,
          notice: message.connected ? '' : `${this.snap.peerName ?? 'Your partner'} lost their connection. Waiting for them to come back…`,
        })
        break
      case 'peer-left':
        this.closePeer()
        this.set({
          peerPresent: false,
          peerName: null,
          peerReady: false,
          countdown: null,
          link: 'none',
          notice: 'Your partner left the room. Share the link again to invite them back.',
        })
        break
      case 'signal':
        void this.onSignal(message.data)
        break
      case 'ready-state':
        this.set({ peerReady: message.peerReady })
        break
      case 'countdown':
        this.set({
          lastResult: null,
          notice: '',
          countdown: {
            cid: message.cid,
            shot: message.shot,
            startsAt: this.toPerf(message.startsAt),
            captureAt: this.toPerf(message.captureAt),
          },
        })
        break
      case 'cancelled':
        this.set({ countdown: null, notice: message.reason })
        break
      case 'shot-complete':
        this.set({
          countdown: this.snap.countdown?.cid === message.cid ? null : this.snap.countdown,
          lastResult: { cid: message.cid, ok: true, missingPeer: false },
        })
        break
      case 'shot-failed':
        this.set({
          countdown: null,
          lastResult: { cid: message.cid, ok: false, missingPeer: message.missingPeer },
        })
        break
      case 'error':
        if (message.code === 'not-found' && this.session) {
          this.endSession('expired', 'This room has expired.')
        } else if (message.code === 'not-allowed' && this.session) {
          this.endSession('expired', 'This seat could not be resumed. Start a new room.')
        } else {
          this.set({ error: message.message })
          if (!this.session) this.set({ signaling: 'closed' })
        }
        break
    }
  }

  private endSession(reason: 'expired' | 'left', error: string) {
    this.intentional = true
    this.ws?.close(1000, reason)
    this.ws = null
    this.session = null
    saveSession(null)
    this.closePeer()
    this.set({ signaling: 'closed', ended: reason, error, countdown: null, peerPresent: false, link: 'none' })
  }

  // ----- WebRTC -----

  private newPeer(): RTCPeerConnection {
    this.closePeer()
    const pc = new RTCPeerConnection({ iceServers: this.iceServers })
    this.pc = pc
    this.pendingIce = []
    pc.onicecandidate = event => {
      if (event.candidate && this.pc === pc) this.sendSignal({ k: 'ice', c: event.candidate.toJSON() })
    }
    pc.ontrack = event => {
      if (this.pc !== pc) return
      const stream = event.streams[0] ?? new MediaStream([event.track])
      this.set({ remoteStream: stream })
    }
    pc.ondatachannel = event => this.bindChannel(event.channel)
    pc.onconnectionstatechange = () => {
      if (this.pc !== pc) return
      window.clearTimeout(this.disconnectTimer)
      switch (pc.connectionState) {
        case 'connected':
          this.rebuilds = 0
          this.set({ link: 'connected' })
          break
        case 'connecting':
          this.set({ link: 'negotiating' })
          break
        case 'disconnected':
          this.set({ link: 'disconnected', countdown: null })
          // Brief network blips usually heal themselves; if not, rebuild the connection.
          this.disconnectTimer = window.setTimeout(() => {
            if (this.pc === pc && pc.connectionState !== 'connected') this.recover()
          }, 6000)
          break
        case 'failed':
          this.set({ link: 'failed', countdown: null })
          this.recover()
          break
      }
    }
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) pc.addTrack(track, this.localStream)
    }
    this.set({ link: 'negotiating', remoteStream: null })
    return pc
  }

  private recover() {
    if (!this.snap.peerPresent) return
    if (this.rebuilds >= 4) {
      this.set({ link: 'failed', error: 'We could not connect your cameras. A restrictive network may be blocking direct video.' })
      return
    }
    this.rebuilds++
    if (this.snap.role === 'host') void this.hostOffer()
    else this.sendSignal({ k: 'need-offer' })
  }

  private renegotiate() {
    if (this.snap.role === 'host') void this.hostOffer()
    else this.sendSignal({ k: 'need-offer' })
  }

  private async hostOffer() {
    try {
      const pc = this.newPeer()
      this.bindChannel(pc.createDataChannel('pix', { ordered: true }))
      const offer = await pc.createOffer()
      if (this.pc !== pc) return
      await pc.setLocalDescription(offer)
      if (offer.sdp) this.sendSignal({ k: 'offer', sdp: offer.sdp })
    } catch {
      this.set({ link: 'failed', error: 'Could not start the video connection.' })
    }
  }

  private async onSignal(data: SignalPayload) {
    try {
      if (data.k === 'need-offer') {
        if (this.snap.role === 'host' && this.snap.peerPresent) await this.hostOffer()
        return
      }
      if (data.k === 'offer') {
        const pc = this.newPeer()
        await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp })
        await this.flushIce(pc)
        const answer = await pc.createAnswer()
        if (this.pc !== pc) return
        await pc.setLocalDescription(answer)
        if (answer.sdp) this.sendSignal({ k: 'answer', sdp: answer.sdp })
        return
      }
      const pc = this.pc
      if (!pc) return
      if (data.k === 'answer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp })
        await this.flushIce(pc)
      } else if (data.k === 'ice') {
        if (pc.remoteDescription) await pc.addIceCandidate(data.c).catch(() => undefined)
        else this.pendingIce.push(data.c)
      }
    } catch {
      this.set({ link: 'failed', error: 'The video connection hit a problem. Trying again…' })
      this.recover()
    }
  }

  private async flushIce(pc: RTCPeerConnection) {
    const queued = this.pendingIce
    this.pendingIce = []
    for (const candidate of queued) await pc.addIceCandidate(candidate).catch(() => undefined)
  }

  private closePeer() {
    window.clearTimeout(this.disconnectTimer)
    const pc = this.pc
    this.pc = null
    if (this.dc) {
      this.dc.onopen = this.dc.onclose = this.dc.onmessage = null
      this.dc = null
    }
    if (pc) {
      pc.onicecandidate = pc.ontrack = pc.ondatachannel = pc.onconnectionstatechange = null
      pc.getSenders().forEach(sender => {
        try {
          pc.removeTrack(sender)
        } catch {
          /* already closed */
        }
      })
      pc.close()
    }
    this.pendingIce = []
    this.incoming = null
    if (this.snap.remoteStream || this.snap.dataReady) this.set({ remoteStream: null, dataReady: false, peerRecordConsent: false })
  }

  private bindChannel(channel: RTCDataChannel) {
    channel.binaryType = 'arraybuffer'
    this.dc = channel
    channel.onopen = () => {
      if (this.dc !== channel) return
      this.set({ dataReady: true })
      this.sendDc({ k: 'hello', mirrored: this.localMirrored })
      this.sendDc({ k: 'rec', on: this.recordConsent })
    }
    channel.onclose = () => {
      if (this.dc === channel) this.set({ dataReady: false })
    }
    channel.onmessage = event => {
      if (this.dc !== channel) return
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data) as { k: string; mirrored?: boolean; on?: boolean; cid?: string; size?: number }
          if (message.k === 'hello') this.set({ remoteMirrored: message.mirrored !== false })
          else if (message.k === 'rec') this.set({ peerRecordConsent: message.on === true })
          else if (message.k === 'frame' && message.cid && typeof message.size === 'number' && message.size < 8_000_000) {
            this.incoming = { cid: message.cid, size: message.size, chunks: [], got: 0 }
          }
        } catch {
          /* ignore */
        }
        return
      }
      const incoming = this.incoming
      if (!incoming) return
      const chunk = event.data as ArrayBuffer
      incoming.chunks.push(chunk)
      incoming.got += chunk.byteLength
      if (incoming.got >= incoming.size) {
        this.incoming = null
        const blob = new Blob(incoming.chunks, { type: 'image/jpeg' })
        const waiter = this.frameWaiters.get(incoming.cid)
        if (waiter) {
          this.frameWaiters.delete(incoming.cid)
          waiter(blob)
        } else {
          this.frames.set(incoming.cid, blob)
        }
      }
    }
    if (channel.readyState === 'open') channel.onopen?.(new Event('open'))
  }

  private sendDc(payload: object) {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(payload))
  }

  private failWaiters() {
    for (const waiter of this.frameWaiters.values()) waiter(null)
    this.frameWaiters.clear()
  }
}
