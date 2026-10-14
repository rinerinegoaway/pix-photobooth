import { BOOTH_STEPS } from '../../lib/steps'

export function Stepper({ steps = BOOTH_STEPS, current }: { steps?: readonly string[]; current: number }) {
  return (
    <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-2 p-0" aria-label="Progress">
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={step} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold ${
                active ? 'bg-coral text-ink' : done ? 'bg-ink text-paper' : 'border border-line bg-white text-muted'
              }`}
              aria-hidden="true"
            >
              {done ? '✓' : index + 1}
            </span>
            <span className={`text-sm ${active ? 'font-extrabold' : 'font-semibold text-muted'}`}>
              {step}
              <span className="sr-only">{done ? ' (done)' : active ? ' (current step)' : ''}</span>
            </span>
            {index < steps.length - 1 && <span className="hidden h-px w-5 bg-line sm:block" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}
