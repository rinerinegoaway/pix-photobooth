import type { RoomSnapshot } from './room'

export type Tone = 'ok' | 'wait' | 'bad'

export function describeConnection(snap: RoomSnapshot, selfReady: boolean): { tone: Tone; text: string } {
  const partner = snap.peerName ?? 'your partner'
  if (snap.ended === 'expired') return { tone: 'bad', text: 'This room has expired' }
  switch (snap.signaling) {
    case 'connecting':
      return { tone: 'wait', text: 'Connecting to the booth…' }
    case 'reconnecting':
      return { tone: 'wait', text: 'Connection lost. Reconnecting…' }
    case 'closed':
      return { tone: 'bad', text: 'Disconnected from the booth' }
    case 'idle':
      return { tone: 'wait', text: 'Not connected' }
  }
  if (!snap.peerPresent) {
    return { tone: 'wait', text: snap.peerName ? `${partner} disconnected. Waiting for them…` : 'Waiting for your partner to join' }
  }
  if (snap.link === 'failed') return { tone: 'bad', text: 'Couldn’t connect the cameras' }
  if (snap.link === 'disconnected') return { tone: 'wait', text: 'Video interrupted. Reconnecting…' }
  if (snap.link !== 'connected') return { tone: 'wait', text: 'Connecting cameras…' }
  if (selfReady && snap.peerReady) return { tone: 'ok', text: 'Both cameras ready' }
  return { tone: 'ok', text: 'Cameras connected' }
}

