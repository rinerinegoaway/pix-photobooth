// Client for the community endpoints (see server/community.ts). Every call can fail, e.g. when the
// app is hosted without the Bun server, and callers must show that honestly instead of faking data.

export type FeedbackType = 'feature' | 'bug' | 'general'

export interface FeedbackInput {
  type: FeedbackType
  name: string
  email: string
  message: string
  /** Honeypot: real people never see or fill this field. */
  website: string
}

export interface Stats {
  strips: number
  sessions: number
  /** null means "not tracked": there are no accounts to count. */
  members: number | null
  active: number
  activeDefinition: string
}

function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
  return `${base}${path}`
}

export async function fetchStats(signal?: AbortSignal): Promise<Stats> {
  const response = await fetch(apiUrl('/api/stats'), { cache: 'no-store', signal })
  if (!response.ok) throw new Error(`stats ${response.status}`)
  const data = (await response.json()) as Partial<Stats>
  if (typeof data.strips !== 'number' || typeof data.sessions !== 'number' || typeof data.active !== 'number') {
    throw new Error('unexpected stats response')
  }
  return {
    strips: data.strips,
    sessions: data.sessions,
    members: typeof data.members === 'number' ? data.members : null,
    active: data.active,
    activeDefinition: data.activeDefinition ?? '',
  }
}

/** Anonymous, content-free counter ping. Nothing but the event name is sent. */
export function sendEvent(type: 'strip' | 'session') {
  try {
    void fetch(apiUrl('/api/event'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
      keepalive: true,
    }).catch(() => undefined)
  } catch {
    /* counters are best-effort */
  }
}

export type FeedbackResult = { ok: true } | { ok: false; message: string }

export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  try {
    const response = await fetch(apiUrl('/api/feedback'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (response.status === 201) return { ok: true }
    let message = 'Your feedback couldn’t be sent. Please try again.'
    try {
      const data = (await response.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      if (response.status === 404) message = 'The feedback service isn’t available on this site right now.'
    }
    return { ok: false, message }
  } catch {
    return { ok: false, message: 'We couldn’t reach the server. Check your connection and try again.' }
  }
}
