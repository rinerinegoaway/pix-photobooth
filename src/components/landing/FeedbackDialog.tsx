import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { submitFeedback } from '../../lib/community'
import type { FeedbackType } from '../../lib/community'

const types: { id: FeedbackType; label: string; hint: string }[] = [
  { id: 'feature', label: 'Feature idea', hint: 'Something you wish . PIX could do' },
  { id: 'bug', label: 'Bug report', hint: 'Something that isn’t working right' },
  { id: 'general', label: 'General feedback', hint: 'A thought, a compliment, a moment you love' },
]

type Status = { phase: 'editing' } | { phase: 'sending' } | { phase: 'sent' } | { phase: 'failed'; message: string }

interface Props {
  open: boolean
  initialType?: FeedbackType
  onClose: () => void
}

const MIN_LENGTH = 10
const MAX_LENGTH = 2000

export function FeedbackDialog({ open, initialType = 'feature', onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const idBase = useId()
  const [type, setType] = useState<FeedbackType>(initialType)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState<Status>({ phase: 'editing' })
  const [closing, setClosing] = useState(false)

  // Open/close the native <dialog>: it provides the focus trap, Escape key and backdrop.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setType(initialType)
      setClosing(false)
      dialog.showModal()
    } else if (!open && dialog.open) dialog.close()
  }, [open, initialType])

  function requestClose() {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      onClose()
      // Reset after the exit animation so a reopened form is fresh, but keep a sent form from reappearing.
      if (status.phase === 'sent') {
        setMessage('')
        setStatus({ phase: 'editing' })
        setTouched(false)
      }
    }, 160)
  }

  const trimmed = message.trim()
  const messageError = trimmed.length < MIN_LENGTH ? `Please write at least ${MIN_LENGTH} characters so we can understand.` : ''
  const emailError = email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'That email address doesn’t look right.' : ''

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (messageError || emailError || status.phase === 'sending') return
    setStatus({ phase: 'sending' })
    const result = await submitFeedback({ type, name: name.trim(), email: email.trim(), message: trimmed, website })
    setStatus(result.ok ? { phase: 'sent' } : { phase: 'failed', message: result.message })
  }

  const sending = status.phase === 'sending'

  return (
    <dialog
      ref={ref}
      className={`pix-dialog m-auto w-[min(92vw,34rem)] max-h-[92vh] overflow-y-auto rounded-[24px] border border-line bg-paper p-0 text-ink shadow-[0_30px_80px_-20px_rgba(36,33,36,0.45)] ${closing ? 'is-closing' : ''}`}
      aria-labelledby={`${idBase}-title`}
      onCancel={event => {
        event.preventDefault()
        requestClose()
      }}
      onClick={event => {
        // Clicking the dimmed backdrop (the dialog element itself) closes it.
        if (event.target === ref.current) requestClose()
      }}
    >
      <div className="p-6 sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="t-label mb-1 text-coral">Our little community</p>
            <h2 id={`${idBase}-title`} className="t-section">
              {status.phase === 'sent' ? 'Thank you!' : 'Share your feedback'}
            </h2>
          </div>
          <button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={requestClose} aria-label="Close feedback form">
            Close
          </button>
        </div>

        {status.phase === 'sent' ? (
          <div className="flex flex-col gap-4" role="status">
            <p className="t-body">
              Your message reached us. We read every note
              {email.trim() ? ', and we’ll write back to the email you gave if we have questions' : ''}.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" onClick={requestClose}>
                Back to . PIX
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setMessage('')
                  setTouched(false)
                  setStatus({ phase: 'editing' })
                }}
              >
                Send another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={event => void onSubmit(event)} noValidate className="flex flex-col gap-5">
            <fieldset className="m-0 min-w-0 border-0 p-0" disabled={sending}>
              <legend className="mb-2 p-0 text-sm font-bold">What kind of feedback is this?</legend>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Feedback type">
                {types.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={type === item.id}
                    className="option flex-col items-start !gap-0"
                    onClick={() => setType(item.id)}
                  >
                    <span className="text-sm font-extrabold">{item.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">{types.find(item => item.id === type)?.hint}</p>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-bold">
                  Name <span className="font-normal text-muted">(optional)</span>
                </span>
                <input className="field" value={name} maxLength={60} autoComplete="given-name" disabled={sending} onChange={event => setName(event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold">
                  Email <span className="font-normal text-muted">(optional, only to reply)</span>
                </span>
                <input
                  className="field"
                  type="email"
                  inputMode="email"
                  value={email}
                  maxLength={120}
                  autoComplete="email"
                  disabled={sending}
                  aria-invalid={touched && Boolean(emailError)}
                  aria-describedby={touched && emailError ? `${idBase}-email-error` : undefined}
                  onChange={event => setEmail(event.target.value)}
                />
                {touched && emailError && (
                  <span id={`${idBase}-email-error`} role="alert" className="mt-1 block text-sm font-semibold">
                    {emailError}
                  </span>
                )}
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-bold">
                Your message <span className="font-normal text-coral">*</span>
              </span>
              <textarea
                className="field min-h-32 resize-y"
                value={message}
                maxLength={MAX_LENGTH}
                required
                disabled={sending}
                aria-invalid={touched && Boolean(messageError)}
                aria-describedby={`${idBase}-message-help`}
                placeholder={type === 'bug' ? 'What happened, and what did you expect?' : type === 'feature' ? 'What would make your next photobooth even better?' : 'Tell us anything you like.'}
                onChange={event => setMessage(event.target.value)}
              />
              <span id={`${idBase}-message-help`} className="mt-1 flex justify-between gap-3 text-xs">
                <span role={touched && messageError ? 'alert' : undefined} className={touched && messageError ? 'font-semibold' : 'text-muted'}>
                  {touched && messageError ? messageError : 'The more detail, the better.'}
                </span>
                <span className="text-muted">
                  {trimmed.length}/{MAX_LENGTH}
                </span>
              </span>
            </label>

            {/* Honeypot for bots. Hidden from people and assistive tech. */}
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} />
              </label>
            </div>

            {status.phase === 'failed' && (
              <p role="alert" className="rounded-xl border border-coral bg-blush p-3 text-sm font-semibold">
                {status.message}
              </p>
            )}

            <p className="text-xs text-muted">
              We store your message, plus your name and email if you add them, so we can read and reply. Nothing from your booth sessions is attached.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? 'Sending…' : 'Send feedback'}
              </button>
              <button type="button" className="btn btn-quiet" onClick={requestClose} disabled={sending}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  )
}
