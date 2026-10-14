import { describeConnection } from '../../lib/connection'
import type { Tone } from '../../lib/connection'
import type { RoomSnapshot } from '../../lib/room'

const toneClass: Record<Tone, string> = {
  ok: 'bg-butter',
  wait: 'bg-blush',
  bad: 'bg-coral',
}

export function ConnectionStatus({ snap, selfReady }: { snap: RoomSnapshot; selfReady: boolean }) {
  const { tone, text } = describeConnection(snap, selfReady)
  return (
    <p role="status" aria-live="polite" className={`chip ${toneClass[tone]}`}>
      <span className={`dot-live ${tone === 'wait' ? 'anim-pulse' : ''}`} aria-hidden="true" />
      {text}
    </p>
  )
}
