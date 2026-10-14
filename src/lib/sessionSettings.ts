import type { COUNTDOWN_CHOICES } from './protocol'

export interface SessionSettingsValue {
  /** Seconds before every shot. */
  countdown: (typeof COUNTDOWN_CHOICES)[number]
  flash: boolean
  sound: boolean
  /** Save a behind-the-scenes video of the live session. */
  record: boolean
  /** Also record the microphone (solo/together only). */
  recordSound: boolean
}

export const defaultSessionSettings: SessionSettingsValue = { countdown: 3, flash: true, sound: true, record: false, recordSound: false }
