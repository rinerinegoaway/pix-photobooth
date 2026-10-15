import { LiveVideo, Shutter } from '../photobooth/CameraPreview'
import type { VideoRef } from '../photobooth/CameraPreview'

interface Props {
  label: string
  stream: MediaStream | null
  mirrored: boolean
  muted: boolean
  videoRef?: VideoRef
  countdown: number | null
  flash: number
  flashEnabled?: boolean
  /** Honest text shown when there is no live video for this panel. */
  emptyMessage: string
  local?: boolean
}

export function ParticipantVideo({ label, stream, mirrored, muted, videoRef, countdown, flash, flashEnabled = true, emptyMessage, local = false }: Props) {
  return (
    <figure className="mat relative m-0 w-full">
      <div className="mat-inner aspect-[4/3]">
      {stream ? (
        <LiveVideo stream={stream} mirrored={mirrored} muted={muted} videoRef={videoRef} label={`${label}’s camera`} />
      ) : (
        <div className="grid h-full w-full place-items-center bg-blush p-6 text-center">
          <p className="anim-pulse max-w-xs font-extrabold text-2xl text-ink">{emptyMessage}</p>
        </div>
      )}
      <figcaption className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-0.5 text-sm font-bold">
        {label}
        {local ? ' (you)' : ''}
      </figcaption>
      {countdown !== null && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-ink/25" aria-hidden="true">
          <span key={countdown} className="anim-pop font-extrabold text-[6rem] leading-none text-paper drop-shadow-[0_4px_14px_rgba(40,38,41,0.5)] sm:text-[8rem]">
            {countdown}
          </span>
        </div>
      )}
      <Shutter flash={flash} flashEnabled={flashEnabled} />
      </div>
    </figure>
  )
}
