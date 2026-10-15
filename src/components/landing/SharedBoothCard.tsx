import { useMemo } from 'react'
import { makeSampleFrame } from '../../lib/samples'
import { PlaneIcon } from '../ui/icons'
import { SampleCanvas } from './SampleCanvas'

/**
 * A quiet preview of the shared booth: two separate camera frames, a label under each, and a thin
 * dashed line with one small airplane between the labels to say the two people are far apart.
 */
export function SharedBoothCard({ className = '', status = 'Both ready' }: { className?: string; status?: string }) {
  const you = useMemo(() => makeSampleFrame(0, 'left'), [])
  const them = useMemo(() => makeSampleFrame(1, 'right'), [])

  return (
    <figure className={`card card-print m-0 p-3 sm:p-4 ${className}`} aria-label="Illustration: two people in different places sharing one photobooth">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="overflow-hidden rounded-xl">
          <SampleCanvas source={you} />
        </div>
        <div className="overflow-hidden rounded-xl">
          <SampleCanvas source={them} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs font-bold">
        <span className="shrink-0">You</span>
        <span className="h-px flex-1 border-t border-dashed border-soft" aria-hidden="true" />
        <PlaneIcon className="h-4 w-4 shrink-0 text-coral" />
        <span className="h-px flex-1 border-t border-dashed border-soft" aria-hidden="true" />
        <span className="shrink-0">Your person</span>
      </div>

      <figcaption className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs">
        <span className="inline-flex items-center gap-2 font-bold">
          <span className="h-2 w-2 rounded-full bg-coral" aria-hidden="true" />
          {status}
        </span>
        <span className="text-soft">Shared booth</span>
      </figcaption>
    </figure>
  )
}
