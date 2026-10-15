import { useState } from 'react'
import type { FeedbackType } from '../../lib/community'
import { Reveal } from '../ui/Reveal'
import { FeedbackDialog } from './FeedbackDialog'

const quick: { type: FeedbackType; title: string; text: string }[] = [
  { type: 'feature', title: 'Feature idea', text: 'Tell us what to build next' },
  { type: 'bug', title: 'Bug report', text: 'Something not working?' },
  { type: 'general', title: 'Say hello', text: 'Share a moment you love' },
]

export function CommunitySection() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('feature')

  const show = (next: FeedbackType) => {
    setType(next)
    setOpen(true)
  }

  return (
    <section id="community" className="bg-blush/60" aria-labelledby="community-heading">
      <div className="container-x section grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <Reveal className="flex flex-col items-start gap-5">
          <p className="t-label text-coral">Our little community</p>
          <h2 id="community-heading" className="t-page max-w-[18ch]">
            Help make . PIX even better.
          </h2>
          <p className="t-body max-w-md text-lg">
            Have an idea for our next photobooth feature, spotted something that needs fixing, or captured a moment you love? We’d love to hear from you.
          </p>
          <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => show('feature')} aria-haspopup="dialog">
            Share your feedback
          </button>
        </Reveal>

        <Reveal delay={120} className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="card card-print relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-7">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <p className="t-label">What’s on your mind?</p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {quick.map(item => (
                  <li key={item.type}>
                    <button type="button" className="option w-full justify-between" onClick={() => show(item.type)} aria-haspopup="dialog">
                      <span className="leading-tight">
                        <span className="block text-sm font-extrabold">{item.title}</span>
                        <span className="text-xs font-semibold text-muted">{item.text}</span>
                      </span>
                      <span aria-hidden="true" className="text-coral">
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
      <FeedbackDialog open={open} initialType={type} onClose={() => setOpen(false)} />
    </section>
  )
}
