import type { ReactNode } from 'react'
import { routes } from '../../hooks/useRoute'
import { requestAutoStart } from '../../lib/nav'

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function SoloArt() {
  return (
    <svg viewBox="0 0 96 64" className="h-8 w-10" aria-hidden="true">
      <rect x="6" y="6" width="84" height="52" rx="10" {...line} />
      <circle cx="48" cy="26" r="9" {...line} />
      <path d="M30 52c2-11 10-15 18-15s16 4 18 15" {...line} />
    </svg>
  )
}
function TogetherArt() {
  return (
    <svg viewBox="0 0 96 64" className="h-8 w-10" aria-hidden="true">
      <rect x="6" y="6" width="84" height="52" rx="10" {...line} />
      <circle cx="36" cy="27" r="8" {...line} />
      <circle cx="60" cy="27" r="8" {...line} />
      <path d="M20 52c1-9 8-13 16-13s14 4 16 13M44 52c2-9 8-13 16-13s15 4 16 13" {...line} />
    </svg>
  )
}
function DistanceArt() {
  return (
    <svg viewBox="0 0 96 64" className="h-8 w-10" aria-hidden="true">
      <rect x="4" y="12" width="34" height="40" rx="8" {...line} />
      <rect x="58" y="12" width="34" height="40" rx="8" {...line} />
      <circle cx="21" cy="29" r="6" {...line} />
      <circle cx="75" cy="29" r="6" {...line} />
      <path d="M44 32h8M42 26c4-6 8-6 12 0M42 38c4 6 8 6 12 0" {...line} />
    </svg>
  )
}

interface Mode {
  title: string
  tag: string
  art: ReactNode
  body: string
  points: string[]
  cta: string
  href: string
  primary?: boolean
}

const modes: Mode[] = [
  {
    title: 'Solo booth',
    tag: 'One person, one camera',
    art: <SoloArt />,
    body: 'Ideal for self-portraits and trying out looks before the real thing.',
    points: ['Your own camera, 3-second countdown', 'Four shots, retake any of them'],
    cta: 'Enter solo booth',
    href: routes.solo,
  },
  {
    title: 'Together booth',
    tag: 'Two people, one device',
    art: <TogetherArt />,
    body: 'You both sit in front of the same screen and appear side by side in the same shot.',
    points: ['A longer countdown to get in place', 'Great for couples and friends in the same room'],
    cta: 'Enter together booth',
    href: routes.together,
  },
  {
    title: 'Long-distance booth',
    tag: 'Two devices, one frame',
    art: <DistanceArt />,
    body: 'Invite someone with a private room link. You see each other live, count down together, and share one strip.',
    points: ['Both cameras side by side, live', 'Countdown kept in step by the booth server', 'Needs a camera on each device'],
    cta: 'Create a room',
    href: routes.distance,
    primary: true,
  },
]

export function BoothModeSelector() {
  return (
    <section id="booths" className="container-x section" aria-labelledby="booths-heading">
      <div className="mb-10 max-w-2xl">
        <p className="t-label mb-3 text-coral">Pick a booth</p>
        <h2 id="booths-heading" className="t-page">
          Where is everyone sitting?
        </h2>
        <p className="t-body mt-3">The three booths work differently, so choose the one that matches your setup.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {modes.map(mode => (
          <article key={mode.title} className="card card-print flex flex-col p-6">
            <div className="mb-5 flex items-center gap-3 text-coral">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blush">{mode.art}</span>
              <span className="t-meta">{mode.tag}</span>
            </div>
            <h3 className="t-section">{mode.title}</h3>
            <p className="mt-2 text-muted">{mode.body}</p>
            <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0 text-sm text-muted">
              {mode.points.map(point => (
                <li key={point} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-coral" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
            <a href={mode.href} onClick={mode.href === routes.distance ? undefined : requestAutoStart} className={`btn mt-6 w-full sm:w-auto sm:self-start ${mode.primary ? 'btn-primary' : 'btn-secondary'}`}>
              {mode.cta}
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}
