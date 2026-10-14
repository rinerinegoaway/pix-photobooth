import type { Shot, StripStyle } from '../../lib/strip'
import { ShotThumb } from './PhotoStripPreview'

interface Props {
  shots: (Shot | null)[]
  style: StripStyle
  onRetake?: (slot: number) => void
  /** Slot currently being retaken, highlighted. */
  activeSlot?: number | null
}

export function PhotoReview({ shots, style, onRetake, activeSlot = null }: Props) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {shots.map((shot, index) => (
        <li key={index} className={`flex flex-col gap-2 ${activeSlot === index ? 'rounded-xl outline-3 outline-offset-4 outline-coral' : ''}`}>
          <ShotThumb style={style} shot={shot} index={index} />
          <div className="flex items-center justify-between gap-2">
            <span className="t-meta">Photo {index + 1}</span>
            {onRetake && shot && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onRetake(index)} aria-label={`Retake photo ${index + 1}`}>
                Retake
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
