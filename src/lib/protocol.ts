// Wire protocol shared by the signaling server (server/index.ts) and the browser client.
// The server only relays connection metadata (SDP/ICE) and coordinates timing.
// It never receives camera frames, photos or video.

export const SHOTS_PER_SESSION = 4
export const COUNTDOWN_SECONDS = 3
export const COUNTDOWN_CHOICES = [3, 5, 10] as const

/** WebRTC negotiation payloads relayed untouched between the two participants. */
export type SignalPayload =
  | { k: 'offer'; sdp: string }
  | { k: 'answer'; sdp: string }
  | { k: 'ice'; c: RTCIceCandidateInit }
  | { k: 'need-offer' }

export type ClientMessage =
  | { t: 'create'; name: string }
  | {
      t: 'join'
      room: string
      name: string
      /** Present when resuming a dropped connection. */
      resume?: { peer: string; secret: string; mediaIntact: boolean }
    }
  | { t: 'signal'; data: SignalPayload }
  | { t: 'ready'; ready: boolean }
  | { t: 'countdown'; shot: number; seconds?: number }
  | { t: 'cancel' }
  | { t: 'captured'; cid: string }
  | { t: 'ping'; c: number }
  | { t: 'leave' }

export type ErrorCode =
  | 'bad-message'
  | 'not-found'
  | 'room-full'
  | 'rate-limited'
  | 'not-allowed'
  | 'not-ready'
  | 'busy'
  | 'server-busy'

export type ServerMessage =
  | {
      t: 'joined'
      room: string
      peer: string
      secret: string
      role: 'host' | 'guest'
      other: { name: string; connected: boolean; ready: boolean } | null
      expiresAt: number
    }
  | { t: 'peer-joined'; name: string; mediaIntact: boolean }
  | { t: 'peer-status'; connected: boolean }
  | { t: 'peer-left' }
  | { t: 'signal'; data: SignalPayload }
  | { t: 'ready-state'; peerReady: boolean }
  | { t: 'countdown'; cid: string; shot: number; startsAt: number; captureAt: number }
  | { t: 'cancelled'; reason: string }
  | { t: 'shot-complete'; cid: string }
  | { t: 'shot-failed'; cid: string; reason: 'timeout'; missingPeer: boolean }
  | { t: 'pong'; c: number; s: number }
  | { t: 'error'; code: ErrorCode; message: string }
