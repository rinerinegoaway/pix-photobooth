import { goToSection } from '../../lib/nav'
import { ArrowRightIcon, CameraIcon, HeartIcon, PlaneIcon } from '../ui/icons'
import { HeroScene } from './HeroScene'

const features = [
  { icon: <CameraIcon className="h-6 w-6" />, title: 'Take photos together', text: 'Create photo strips in a shared photobooth experience.' },
  { icon: <PlaneIcon className="h-6 w-6" />, title: 'Near or far', text: 'Capture moments with your favorite person from different locations.' },
  { icon: <HeartIcon className="h-6 w-6" />, title: 'Keep your memories', text: 'Download your photo strips and save the moments.' },
]

export function HeroSection() {
  return (
    <section aria-labelledby="hero-heading">
      <div className="container-x grid items-center gap-12 pb-16 pt-10 sm:pt-14 lg:grid-cols-2 lg:gap-14 lg:pb-20 lg:pt-16">
        <div className="flex flex-col items-start gap-5">
          <p className="inline-flex items-center gap-2 rounded-full bg-blush px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.16em]">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" aria-hidden="true" />
            Your little online photobooth
          </p>
          <h1 id="hero-heading" className="t-display">
            A little moment.
            <br />
            A <span className="t-hand text-[1.2em] font-semibold leading-none text-coral">forever</span> memory.
          </h1>
          <p className="t-body max-w-md">Make photo strips with your favorite person, whether they’re beside you or on the other side of the world.</p>
          <a
            href="#booths"
            className="btn btn-primary btn-lg w-full sm:w-auto"
            onClick={event => {
              event.preventDefault()
              goToSection('booths')
            }}
          >
            Start a booth
            <ArrowRightIcon className="h-5 w-5" />
          </a>
          <p className="text-sm text-muted">No account needed. Photos are made in your browser.</p>
        </div>

        <HeroScene />
      </div>

      {/* Three benefits on a very soft wave, centered and evenly spaced. */}
      <div className="relative">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-0 h-16 w-full sm:h-24" aria-hidden="true">
          <path d="M0 70 C260 10 520 110 800 60 S1240 20 1440 70 V120 H0 Z" fill="#F7E8EA" fillOpacity="0.55" />
        </svg>
        <ul className="container-x relative m-0 grid list-none gap-10 pb-14 pt-24 sm:grid-cols-3 sm:gap-0 sm:pt-32">
          {features.map(item => (
            <li key={item.title} className="flex flex-col items-center gap-3 text-center sm:px-8 sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-line">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-blush text-coral">{item.icon}</span>
              <h2 className="text-base font-bold">{item.title}</h2>
              <p className="max-w-[16rem] text-sm text-muted">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
