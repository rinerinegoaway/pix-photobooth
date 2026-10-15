import { useMemo } from 'react'
import { makeSampleShots } from '../../lib/samples'
import { defaultStyle } from '../../lib/strip'
import { PhotoStripPreview } from '../photobooth/PhotoStripPreview'
import { PlaneIcon } from '../ui/icons'
import { SharedBoothCard } from './SharedBoothCard'

const HEART = 'M0 22 C-6 16 -26 4 -26 -10 C-26 -24 -8 -26 0 -12 C8 -26 26 -24 26 -10 C26 4 6 16 0 22 Z'

/**
 * The hero visual: a white four-photo strip as the focal point, a smaller shared-booth card beside
 * it, a soft blush shape behind them, and one thin dashed route with a single airplane that links
 * the two. On phones it collapses into a simple stack with no overlap.
 */
export function HeroScene() {
  const shots = useMemo(() => makeSampleShots('pair'), [])
  const style = useMemo(
    () => ({
      ...defaultStyle(),
      caption: 'A forever memory',
      names: '',
      showDate: false,
      showBrand: true,
      background: 'white' as const,
      frame: 'clean' as const,
      font: 'hand' as const,
      stickers: [],
      placed: [],
    }),
    [],
  )

  return (
    <div className="relative mx-auto w-full max-w-lg" aria-label="Illustration: a photo strip made in a shared booth">
      {/* Phones and small tablets: strip, then the booth preview. */}
      <div className="flex flex-col items-center gap-6 sm:hidden">
        <div className="w-[60%]">
          <PhotoStripPreview style={style} shots={shots} className="rounded-md shadow-[0_18px_40px_-20px_rgba(40,38,41,0.45)]" label="Sample photo strip" />
        </div>
        <SharedBoothCard className="w-full" />
      </div>

      {/* Tablet and desktop: layered composition, with controlled overlap. */}
      <div className="relative hidden aspect-[5/6] sm:block">
        <svg viewBox="0 0 100 120" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <path d="M22 18 C40 2 78 6 90 30 C102 56 96 92 66 102 C38 112 10 100 6 72 C3 50 8 30 22 18 Z" fill="#F7E8EA" fillOpacity="0.75" />
          {/* one dashed route: from the booth card, around a small heart, to the plane near the strip */}
          <path d="M24 66 C16 54 18 44 26 41" fill="none" stroke="#F4778B" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
          <path transform="translate(26 36) scale(0.17)" d={HEART} fill="none" stroke="#F4778B" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
          <path d="M30 31 C38 24 44 22 52 20" fill="none" stroke="#F4778B" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
        </svg>
        <PlaneIcon className="absolute left-[50%] top-[14%] h-8 w-8 -rotate-12 text-coral" />

        <div className="absolute right-[3%] top-[1%] w-[38%] rotate-[4deg]">
          <PhotoStripPreview style={style} shots={shots} className="rounded-md shadow-[0_22px_44px_-20px_rgba(40,38,41,0.5)]" label="Sample photo strip" />
        </div>
        <SharedBoothCard className="absolute bottom-[10%] left-0 w-[62%] -rotate-3" />
      </div>
    </div>
  )
}
