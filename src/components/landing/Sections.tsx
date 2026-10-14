import { useMemo, useState } from 'react'
import { routes } from '../../hooks/useRoute'
import { makeSampleFrame, makeSampleShots } from '../../lib/samples'
import { backgrounds, defaultStyle, fonts, frames } from '../../lib/strip'
import type { BackgroundId, FontId, FrameId, StripStyle } from '../../lib/strip'
import { PhotoStripPreview } from '../photobooth/PhotoStripPreview'
import { Stepper } from '../photobooth/Stepper'
import { BOOTH_STEPS } from '../../lib/steps'
import { SampleCanvas } from './SampleCanvas'

function Heading({ label, title, children }: { label: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="t-label mb-3 text-coral">{label}</p>
      <h2 className="t-page">{title}</h2>
      {children && <p className="t-body mt-3">{children}</p>}
    </div>
  )
}

export function HowItWorks() {
  const steps = [
    { n: '01', title: 'Pick a booth', body: 'Solo, together on one device, or a shared room across the distance.' },
    { n: '02', title: 'Say cheese, four times', body: 'Allow your camera, then follow the countdown. Retake any shot you don’t love.' },
    { n: '03', title: 'Keep it', body: 'Style the strip, then save a PNG and a short video. No account needed.' },
  ]
  return (
    <section id="how-it-works" className="bg-white" aria-labelledby="how-heading">
      <div className="container-x section">
        <Heading label="How it works" title="Three steps, no sign-up." />
        <ol className="m-0 grid list-none gap-6 p-0 md:grid-cols-3">
          {steps.map(step => (
            <li key={step.n} className="flex flex-col gap-2 rounded-[20px] bg-paper p-6">
              <span className="t-hand text-5xl leading-none text-coral">{step.n}</span>
              <h3 className="t-section !text-xl">{step.title}</h3>
              <p className="text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <span id="how-heading" className="sr-only">
          How it works
        </span>
      </div>
    </section>
  )
}

export function BoothExperience() {
  const frame = useMemo(() => makeSampleFrame(1, 'pair'), [])
  const shots = useMemo(() => makeSampleShots('pair'), [])
  const style = useMemo(() => ({ ...defaultStyle(), layout: 'grid' as const, date: 'SAMPLE', background: 'blush' as const, frame: 'soft' as const, names: '' }), [])
  return (
    <section className="container-x section" aria-labelledby="experience-heading">
      <Heading label="The booth experience" title="Always clear what’s next.">
        Every booth shows where you are, how many photos are left, and what to do next. Samples below are illustrations.
      </Heading>
      <span id="experience-heading" className="sr-only">
        The booth experience
      </span>
      <div className="card card-print grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Stepper steps={BOOTH_STEPS} current={1} />
          <div className="card relative overflow-hidden">
            <SampleCanvas source={frame} />
            <div className="absolute inset-0 grid place-items-center bg-ink/25">
              <span className="font-extrabold text-8xl leading-none text-paper drop-shadow-[0_4px_14px_rgba(36,33,36,0.5)]">2</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="btn btn-danger btn-sm" aria-hidden="true">
              Cancel
            </span>
            <span className="t-meta">1 of 4 taken</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <p className="t-label">After the last shot</p>
          <div className="mx-auto w-full max-w-xs">
            <PhotoStripPreview style={style} shots={shots} className="card" label="Sample 2 by 2 photo grid" />
          </div>
          <p className="text-sm text-muted">Review the four photos, retake one without losing the rest, then style and save.</p>
        </div>
      </div>
    </section>
  )
}

export function MadeForDistance() {
  const left = useMemo(() => makeSampleFrame(2, 'left'), [])
  const right = useMemo(() => makeSampleFrame(3, 'right'), [])
  return (
    <section className="bg-blush/70" aria-labelledby="distance-heading">
      <div className="container-x section grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="t-label mb-3 text-coral">Made for distance</p>
          <h2 id="distance-heading" className="t-page">Built for the distance between us.</h2>
          <p className="mt-3 max-w-lg text-lg">
            Create a private room and invite your favorite person. See each other live, count down together, and capture a photo strip that brings both sides of the screen into one memory.
          </p>
          <ol className="m-0 mt-6 flex list-none flex-col gap-2 p-0 text-sm">
            <li>
              <strong>1.</strong> Create a room and allow your camera.
            </li>
            <li>
              <strong>2.</strong> Send the private link to your person.
            </li>
            <li>
              <strong>3.</strong> They preview their camera and join.
            </li>
            <li>
              <strong>4.</strong> Count down together and save one strip with both of you in it.
            </li>
          </ol>
          <p className="mt-5 max-w-lg text-sm">
            Honest note: two internet connections never tick in perfect unison. The booth server schedules each countdown for a shared moment, so shots land within a fraction of a second of each other, not to the millisecond.
          </p>
          <a href={routes.distance} className="btn btn-primary mt-6">
            Create a room
          </a>
        </div>
        <div className="card card-print overflow-hidden" aria-label="Sample shared booth screen">
          <div className="grid grid-cols-2 gap-px bg-line">
            <SampleCanvas source={left} />
            <SampleCanvas source={right} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span className="chip bg-[#bfe6c8]">
              <span className="dot-live" aria-hidden="true" /> Both cameras ready
            </span>
            <span className="t-hand text-xl text-muted">sample illustration</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export function MakeItYours() {
  const shots = useMemo(() => makeSampleShots('pair'), [])
  const [frame, setFrame] = useState<FrameId>('taped')
  const [background, setBackground] = useState<BackgroundId>('coral')
  const [font, setFont] = useState<FontId>('hand')
  const style: StripStyle = useMemo(
    () => ({ ...defaultStyle(), layout: 'card', frame, background, font, stickers: ['hearts', 'sparkles'], caption: 'us, mostly', names: 'Rie & Rob', date: 'SAMPLE' }),
    [frame, background, font],
  )
  return (
    <section id="features" className="container-x section" aria-labelledby="yours-heading">
      <Heading label="Make it yours" title="Frames, stickers and your own handwriting.">
        Try the real strip renderer here. It’s the same one that makes your PNG and your video.
      </Heading>
      <span id="yours-heading" className="sr-only">
        Make it yours
      </span>
      <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="card flex flex-col gap-5 p-5">
          <div>
            <p className="t-label mb-2">Frame</p>
            <div className="flex flex-wrap gap-2">
              {frames.map(item => (
                <button key={item.id} type="button" className="option !py-1.5" aria-pressed={frame === item.id} onClick={() => setFrame(item.id)}>
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="t-label mb-2">Background</p>
            <div className="flex flex-wrap gap-2">
              {backgrounds.map(item => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.name}
                  aria-pressed={background === item.id}
                  title={item.name}
                  onClick={() => setBackground(item.id)}
                  className={`h-10 w-10 rounded-full border border-line ${item.id === 'speckle' ? 'paper-texture' : ''} ${background === item.id ? 'outline-2 outline-offset-2 outline-coral' : ''}`}
                  style={{ backgroundColor: item.color }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="t-label mb-2">Caption font</p>
            <div className="flex flex-wrap gap-2">
              {fonts.map(item => (
                <button key={item.id} type="button" className="option !py-1.5" aria-pressed={font === item.id} onClick={() => setFont(item.id)} style={{ fontFamily: item.family, fontStyle: item.style, fontWeight: item.weight }}>
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted">Plus hearts, sparkles, flowers, smiles and cherries; your own caption, names, text color and date. Your keepsakes carry only the words you choose.</p>
        </div>
        <div className="mx-auto w-full max-w-sm">
          <PhotoStripPreview style={style} shots={shots} className="rounded-sm" label="Sample photo card you can restyle" />
        </div>
      </div>
    </section>
  )
}

export function PrivacySection() {
  const items = [
    { title: 'On your device', body: 'Photos and strips are assembled in your browser. Solo and Together booths never send a picture anywhere.' },
    { title: 'In a shared booth', body: 'Your live video is sent to the other person in the room. It travels directly between browsers where your networks allow, and WebRTC encrypts it in transit.' },
    { title: 'What the server sees', body: 'A room needs a small signaling server. It sees display names, connection details (including network addresses) and countdown timing. It never receives video or photos, and it keeps rooms only in memory.' },
    { title: 'Rooms are private and short-lived', body: 'Room codes are random and the invite sits after the # in the link, which browsers don’t send to servers. A room holds two people and expires after a few hours.' },
  ]
  return (
    <section id="privacy" className="bg-white" aria-labelledby="privacy-heading">
      <div className="container-x section">
        <div className="mb-10 max-w-2xl">
          <p className="t-label mb-3 text-coral">Privacy first</p>
          <h2 id="privacy-heading" className="t-page">Your memories stay yours.</h2>
          <p className="mt-2 text-lg">
            Your camera is used to create your photos, and your photo strip is assembled in your browser. Shared booths use a temporary connection to bring both participants together. We do not use your booth photos for AI training.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(item => (
            <div key={item.title} className="rounded-[20px] bg-paper p-6">
              <h3 className="t-section !text-xl">{item.title}</h3>
              <p className="mt-1 text-sm text-muted">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-2xl text-sm">
          The camera only starts after you press a button, and it switches off when you leave the booth. If your network blocks direct connections, video may need a relay server, which would carry encrypted video without being able to watch it. Separately, our server keeps two anonymous running totals (strips finished and sessions started) and any feedback you choose to send. Neither includes your photos or video.
        </p>
      </div>
    </section>
  )
}

const faqs = [
  {
    q: 'Is it free? Do I need an account?',
    a: 'The core photobooth is free and there’s no account to make. Your strips have no watermark.',
  },
  {
    q: 'Which booth should I pick?',
    a: 'Solo for one person. Together for two people in front of one device. Long-distance when you’re on separate devices and want to appear in the same frame.',
  },
  {
    q: 'How well do the two sides stay in sync?',
    a: 'The server schedules every countdown for one shared moment and both devices capture then. Network delay and camera speed still vary, so expect a small gap, not exact simultaneity. If a device is late, the shot is skipped and you can retry it.',
  },
  {
    q: 'Do you keep my photos or videos?',
    a: 'No. Pictures are made in your browser. In a shared booth the two of you exchange pictures directly with each other. Nothing is stored on our server.',
  },
  {
    q: 'Why did I get a WebM video instead of MP4?',
    a: 'We use whichever format your browser can actually encode. Recent Chrome and Safari can often make real MP4 files; others make WebM. The file name always matches the real format.',
  },
  {
    q: 'My partner and I can’t see each other.',
    a: 'Check that both browsers have camera permission and that you’re using HTTPS. Some office or mobile networks block direct video. A relay (TURN) server fixes that and can be added by whoever hosts the app.',
  },
]

export function Faq() {
  return (
    <section className="container-x section" aria-labelledby="faq-heading">
      <Heading label="Questions" title="Good to know." />
      <span id="faq-heading" className="sr-only">
        Frequently asked questions
      </span>
      <div className="flex max-w-3xl flex-col gap-3">
        {faqs.map(item => (
          <details key={item.q} className="card group p-5 open:bg-blush/50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
              {item.q}
              <span aria-hidden="true" className="text-xl leading-none transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
