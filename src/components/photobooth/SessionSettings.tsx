import { COUNTDOWN_CHOICES, SHOTS_PER_SESSION } from '../../lib/protocol'
import type { SessionSettingsValue } from '../../lib/sessionSettings'

interface Props {
  value: SessionSettingsValue
  onChange: (patch: Partial<SessionSettingsValue>) => void
  /** Shared booths let the person who presses Start pick the countdown. */
  disabled?: boolean
  /** Shared booth: recording needs both people to agree, and has no microphone. */
  shared?: boolean
  partnerName?: string
  partnerAgrees?: boolean
}

export function SessionSettings({ value, onChange, disabled = false, shared = false, partnerName = 'your partner', partnerAgrees = false }: Props) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0" disabled={disabled}>
      <legend className="t-label mb-2 p-0">Session</legend>
      <div>
        <span className="mb-1 block text-sm font-bold">Photos per strip</span>
        <p className="text-sm text-muted">{SHOTS_PER_SESSION} photos, taken automatically one after another.</p>
      </div>
      <div>
        <span className="mb-1 block text-sm font-bold">Countdown before each photo</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Countdown length">
          {COUNTDOWN_CHOICES.map(seconds => (
            <button key={seconds} type="button" role="radio" aria-checked={value.countdown === seconds} className="option min-w-14 justify-center" onClick={() => onChange({ countdown: seconds })}>
              {seconds}s
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-coral" checked={value.flash} onChange={event => onChange({ flash: event.target.checked })} />
          White flash on capture
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-coral" checked={value.sound} onChange={event => onChange({ sound: event.target.checked })} />
          Shutter sound
        </label>
      </div>
      <div className="flex flex-col gap-2 rounded-2xl bg-blush p-3">
        <label className="flex items-start gap-2 text-sm font-bold">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-coral" checked={value.record} onChange={event => onChange({ record: event.target.checked })} />
          <span>
            {shared ? 'Record our moments together' : 'Save a behind-the-scenes video'}
            <span className="block text-xs font-semibold text-muted">
              {shared
                ? 'Records both camera feeds during the session, on your device only. It only starts if both of you turn this on.'
                : 'Records you posing between shots, on your device only. Nothing is uploaded.'}
            </span>
          </span>
        </label>
        {!shared && value.record && (
          <label className="ml-7 flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-coral" checked={value.recordSound} onChange={event => onChange({ recordSound: event.target.checked })} />
            Include sound (asks for your microphone)
          </label>
        )}
        {shared && value.record && (
          <p role="status" className="ml-7 text-xs font-bold">
            {partnerAgrees ? `${partnerName} agreed. Recording will start with the first countdown.` : `Waiting for ${partnerName} to turn this on too.`}
          </p>
        )}
        {shared && !value.record && partnerAgrees && (
          <p role="status" className="ml-7 text-xs font-bold">{partnerName} would like to record. Turn this on to join in.</p>
        )}
      </div>
    </fieldset>
  )
}
