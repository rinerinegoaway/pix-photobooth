import { useMemo } from 'react'
import { useStats } from '../../hooks/useStats'
import type { StatsState } from '../../hooks/useStats'
import { goToSection } from '../../lib/nav'
import { makeSampleFrame } from '../../lib/samples'
import { Reveal } from '../ui/Reveal'
import { SampleCanvas } from './SampleCanvas'

type Value = { kind: 'number'; n: number } | { kind: 'loading' } | { kind: 'unavailable'; why: string }

function pick(state: StatsState, read: (s: Extract<StatsState, { status: 'ready' }>['stats']) => number | null, missing: string): Value {
  if (state.status === 'loading') return { kind: 'loading' }
  if (state.status === 'unavailable') return { kind: 'unavailable', why: 'Live numbers aren’t available right now.' }
  const n = read(state.stats)
  return n === null ? { kind: 'unavailable', why: missing } : { kind: 'number', n }
}

function Figure({ value, big = false }: { value: Value; big?: boolean }) {
  const size = big ? 'text-6xl sm:text-7xl' : 'text-4xl sm:text-5xl'
  if (value.kind === 'number') {
    return <span className={`${size} font-black leading-none tracking-tight tabular-nums`}>{value.n.toLocaleString()}</span>
  }
  return (
    <span className={`${size} font-black leading-none text-ink/25`} aria-label={value.kind === 'loading' ? 'Loading' : 'Not available'}>
      {value.kind === 'loading' ? '…' : '—'}
    </span>
  )
}

function Note({ value, children }: { value: Value; children: string }) {
  return <p className="text-sm text-muted">{value.kind === 'unavailable' ? value.why : children}</p>
}

export function LiveActivitySection() {
  const state = useStats()
  const strips = pick(state, s => s.strips, '')
  const sessions = pick(state, s => s.sessions, '')
  const active = pick(state, s => s.active, '')
  const members = pick(state, s => s.members, 'We don’t have accounts, so there’s nothing to count yet.')
  const frames = useMemo(() => [0, 1, 2, 3].map(i => makeSampleFrame(i, 'pair')), [])
  const live = active.kind === 'number' && active.n > 0

  return (
    <section id="activity" className="container-x section" aria-labelledby="activity-heading" aria-busy={state.status === 'loading'}>
      <Reveal className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="t-label mb-3 text-coral">Live booth activity</p>
          <h2 id="activity-heading" className="t-page">
            <span className="t-hand text-[1.2em] leading-none text-coral">Live</span> booth moments
          </h2>
          <p className="t-body mt-3">Every little moment deserves a picture. Here’s what’s happening in the . PIX booths, counted for real.</p>
        </div>
        <a
          href="#booths"
          className="btn btn-secondary self-start md:self-auto"
          onClick={event => {
            event.preventDefault()
            goToSection('booths')
          }}
        >
          Enter the photobooth
        </a>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Reveal className="h-full">
          <article className="relative flex h-full flex-col justify-between gap-8 overflow-hidden rounded-[24px] bg-butter p-7 sm:p-9">
            <div className="flex flex-col gap-2">
              <p className="t-label">Photo strips created</p>
              <Figure value={strips} big />
              <Note value={strips}>Counted each time someone finishes a four-photo strip.</Note>
            </div>
            <div className="grid max-w-xs grid-cols-4 gap-1.5" aria-hidden="true">
              {frames.map((frame, index) => (
                <SampleCanvas key={index} source={frame} className="rounded-md" />
              ))}
            </div>
          </article>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <Reveal delay={80}>
            <article className="card flex h-full flex-col gap-1.5 p-6">
              <p className="t-label">Booth sessions</p>
              <Figure value={sessions} />
              <Note value={sessions}>Counted when a four-photo session starts.</Note>
            </article>
          </Reveal>
          <Reveal delay={160}>
            <article className="card flex h-full flex-col gap-1.5 p-6">
              <p className="t-label flex items-center gap-2">
                Active sessions now
                {live && (
                  <span className="chip !border-0 bg-blush !py-0.5 text-[0.7rem]">
                    <span className="dot-live anim-pulse text-coral" aria-hidden="true" />
                    Live
                  </span>
                )}
              </p>
              <Figure value={active} />
              <Note value={active}>Shared booth rooms with someone connected right now.</Note>
            </article>
          </Reveal>
          <Reveal delay={240} className="sm:col-span-2 lg:col-span-1">
            <article className="card flex h-full flex-col gap-1.5 p-6">
              <p className="t-label">Community members</p>
              <Figure value={members} />
              <Note value={members}>People who have joined the . PIX community.</Note>
            </article>
          </Reveal>
        </div>
      </div>
      <p className="mt-5 text-xs text-muted">
        These totals come from anonymous counters on our server. No photos, names or accounts are involved, and browsers report them themselves, so treat them as friendly estimates.
      </p>
    </section>
  )
}
