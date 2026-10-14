import { useMemo } from 'react'
import { routes } from '../../hooks/useRoute'
import { goToSection, requestAutoStart } from '../../lib/nav'
import { makeSampleFrame, makeSampleShots } from '../../lib/samples'
import { defaultStyle } from '../../lib/strip'
import { PhotoStripPreview } from '../photobooth/PhotoStripPreview'
import { SampleCanvas } from './SampleCanvas'

export function HeroSection() {
  const shots = useMemo(() => makeSampleShots('pair'), [])
  const style = useMemo(
    () => ({ ...defaultStyle(), caption: 'a little closer', names: 'Rie & Rob', date: 'SAMPLE', background: 'blush' as const, frame: 'clean' as const, font: 'hand' as const }),
    [],
  )
  const left = useMemo(() => makeSampleFrame(0, 'left'), [])
  const right = useMemo(() => makeSampleFrame(1, 'right'), [])

  return (
    <section className="paper-texture" aria-labelledby="hero-heading">
      <div className="container-x grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:py-20">
        <div className="flex flex-col items-start gap-6">
          <p className="t-label inline-flex items-center gap-2 rounded-full bg-butter px-3 py-1">Free online photobooth</p>
          <h1 id="hero-heading" className="t-display max-w-[17ch]">
            A little closer, one <span className="t-hand text-[1.25em] font-semibold leading-none text-coral">picture</span> at a time.
          </h1>
          <p className="t-body max-w-lg text-lg">Make photo strips with your favorite person, whether they’re beside you or on the other side of the world.</p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#booths"
              className="btn btn-primary"
              onClick={event => {
                event.preventDefault()
                goToSection('booths')
              }}
            >
              Start a booth
            </a>
            <a href={routes.together} onClick={requestAutoStart} className="btn btn-secondary">
              Take photos together
            </a>
          </div>
          <p className="text-sm text-muted">No account needed. Photos are made in your browser.</p>
        </div>

        <div className="relative mx-auto w-full max-w-md pb-8 sm:pb-0" aria-label="Sample photo strip and shared booth screen">
          <div className="mx-auto w-[42%] rotate-[2deg] sm:ml-auto sm:mr-8">
            <PhotoStripPreview style={style} shots={shots} className="rounded-sm" label="Sample photo strip" />
          </div>
          <figure className="card card-print absolute -left-1 bottom-8 m-0 w-[62%] -rotate-3 overflow-hidden sm:-left-6 sm:bottom-16">
            <div className="grid grid-cols-2 gap-px bg-line">
              <SampleCanvas source={left} />
              <SampleCanvas source={right} />
            </div>
            <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold">
              <span className="chip !py-0.5 bg-butter">
                <span className="dot-live" aria-hidden="true" /> Both ready
              </span>
              <span className="text-muted">Shared booth</span>
            </figcaption>
          </figure>
          <p className="t-hand absolute -top-4 right-0 rotate-6 text-xl text-muted">sample illustration</p>
        </div>
      </div>
    </section>
  )
}
