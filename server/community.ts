// Community features: anonymous usage counters and the feedback inbox.
//
// What is stored (on the host's disk, in DATA_DIR, default ./data):
//   stats.json      two running totals: strips finished, sessions started. No identifiers, no content.
//   feedback.jsonl  one line per submitted message: type, message, and the optional name/email the
//                   sender typed. IP addresses and booth content are never stored.
// Counters are self-reported by browsers and unauthenticated, so treat them as friendly estimates.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = process.env.DATA_DIR ?? join(import.meta.dir, '..', 'data')
const STATS_FILE = join(DATA_DIR, 'stats.json')
const FEEDBACK_FILE = join(DATA_DIR, 'feedback.jsonl')
const WEBHOOK_URL = process.env.FEEDBACK_WEBHOOK_URL ?? ''

const FEEDBACK_TYPES = ['feature', 'bug', 'general'] as const
const EVENT_TYPES = ['strip', 'session'] as const
type EventType = (typeof EVENT_TYPES)[number]

const MAX_BODY = 8 * 1024

interface Totals {
  strips: number
  sessions: number
}

let totals: Totals = { strips: 0, sessions: 0 }
let saveTimer: ReturnType<typeof setTimeout> | undefined

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function load() {
  try {
    if (existsSync(STATS_FILE)) {
      const parsed = JSON.parse(readFileSync(STATS_FILE, 'utf8')) as Partial<Totals>
      totals = { strips: Number(parsed.strips) || 0, sessions: Number(parsed.sessions) || 0 }
    }
  } catch {
    console.warn('Could not read stats file; starting from zero.')
  }
}
load()

function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = undefined
    try {
      ensureDir()
      writeFileSync(STATS_FILE, JSON.stringify(totals))
    } catch {
      console.warn('Could not save stats file.')
    }
  }, 2000)
  saveTimer.unref?.()
}

export function recordEvent(type: EventType) {
  if (type === 'strip') totals.strips++
  else totals.sessions++
  scheduleSave()
}

export function getStats(active: number) {
  return {
    strips: totals.strips,
    sessions: totals.sessions,
    // There are no accounts, so there is nothing real to count. The client shows this as unavailable.
    members: null as number | null,
    active,
    activeDefinition: 'Shared booth rooms with at least one person connected right now.',
  }
}

// ---------- tiny rate limiter ----------

const hits = new Map<string, number[]>()
function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter(time => now - time < windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  return true
}
setInterval(() => {
  const now = Date.now()
  for (const [key, times] of hits) if (times.every(time => now - time > 15 * 60 * 1000)) hits.delete(key)
}, 60_000).unref()

// ---------- request handling ----------

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

async function readBody(req: Request): Promise<unknown | null> {
  const text = await req.text()
  if (text.length > MAX_BODY) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function clean(value: unknown, max: number): string {
  // eslint-disable-next-line no-control-regex
  return typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : ''
}

async function handleFeedback(req: Request, ip: string, cors: Record<string, string>): Promise<Response> {
  if (!allow(`feedback:${ip}`, 5, 10 * 60 * 1000)) {
    return json({ error: 'You’ve sent a few messages already. Please try again in a little while.' }, 429, cors)
  }
  const body = (await readBody(req)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') return json({ error: 'That message couldn’t be read.' }, 400, cors)
  // Hidden field that people never see; bots fill it in.
  if (clean(body.website, 50)) return json({ error: 'That message couldn’t be sent.' }, 400, cors)

  const type = FEEDBACK_TYPES.find(item => item === body.type)
  const message = clean(body.message, 2000)
  const name = clean(body.name, 60)
  const email = clean(body.email, 120)
  if (!type) return json({ error: 'Choose what kind of feedback this is.' }, 400, cors)
  if (message.length < 10) return json({ error: 'Please write at least a few words (10 characters).' }, 400, cors)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'That email address doesn’t look right.' }, 400, cors)

  const entry = { id: crypto.randomUUID(), at: new Date().toISOString(), type, name, email, message }
  try {
    ensureDir()
    appendFileSync(FEEDBACK_FILE, JSON.stringify(entry) + '\n')
  } catch {
    return json({ error: 'We couldn’t save your message. Please try again later.' }, 500, cors)
  }
  if (WEBHOOK_URL) {
    const text = `New .PIX feedback (${type})${name ? ` from ${name}` : ''}${email ? ` <${email}>` : ''}:\n${message}`
    // Optional forwarding (Slack/Discord-style webhook). Failure never affects the sender.
    void fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, content: text }),
    }).catch(() => undefined)
  }
  return json({ ok: true }, 201, cors)
}

/** Returns a Response for community routes, or null so the caller can continue. */
export async function handleCommunityRequest(
  req: Request,
  url: URL,
  ip: string,
  activeRooms: number,
  allowedOrigin: string | null,
): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/')) return null
  const cors: Record<string, string> = allowedOrigin
    ? { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' }
    : {}

  if (req.method === 'OPTIONS' && (url.pathname === '/api/stats' || url.pathname === '/api/event' || url.pathname === '/api/feedback')) {
    return new Response(null, { status: 204, headers: cors })
  }
  if (url.pathname === '/api/stats' && req.method === 'GET') return json(getStats(activeRooms), 200, cors)
  if (url.pathname === '/api/event' && req.method === 'POST') {
    if (!allow(`event:${ip}`, 20, 60 * 1000)) return json({ error: 'Too many requests.' }, 429, cors)
    const body = (await readBody(req)) as { type?: unknown } | null
    const type = EVENT_TYPES.find(item => item === body?.type)
    if (!type) return json({ error: 'Unknown event.' }, 400, cors)
    recordEvent(type)
    return new Response(null, { status: 204, headers: cors })
  }
  if (url.pathname === '/api/feedback' && req.method === 'POST') return handleFeedback(req, ip, cors)
  return null
}
