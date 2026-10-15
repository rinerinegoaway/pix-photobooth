import type { ReactNode } from 'react'

export type VideoRef = (node: HTMLVideoElement | null) => void

interface LiveVideoProps {
  stream: MediaStream | null
  mirrored?: boolean
  muted?: boolean
  videoRef?: VideoRef
  className?: string
  label: string
}

export function LiveVideo({ stream, mirrored = false, muted = true, videoRef, className = '', label }: LiveVideoProps) {
  return (
    <video
      ref={node => {
        if (node && node.srcObject !== stream) {
          node.srcObject = stream
          if (stream) void node.play().catch(() => undefined)
        }
        videoRef?.(node)
      }}
      autoPlay
      playsInline
      muted={muted}
      aria-label={label}
      className={`h-full w-full object-cover ${className}`}
      style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
    />
  )
}

interface CameraPreviewProps {
  stream: MediaStream | null
  mirrored: boolean
  videoRef: VideoRef
  countdown: number | null
  flash: number
  /** When false the shutter still animates but the white flash is skipped. */
  flashEnabled?: boolean
  /** e.g. "PHOTO 2 OF 4", shown while shooting. */
  badge?: string
  /** Short instruction shown at the bottom while idle. */
  hint?: string
  guide?: 'together' | null
  children?: ReactNode
  className?: string
}

export function CameraPreview({ stream, mirrored, videoRef, countdown, flash, flashEnabled = true, badge, hint, guide, children, className = '' }: CameraPreviewProps) {
  return (
    <div className={`mat relative w-full ${className}`}>
      <div className="mat-inner aspect-[4/3]">
      <LiveVideo stream={stream} mirrored={mirrored} videoRef={videoRef} label="Your camera preview" />
      {guide === 'together' && countdown === null && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 300" aria-hidden="true">
          <g fill="none" stroke="#FAF8F5" strokeWidth="2" strokeDasharray="6 6" opacity="0.7">
            <ellipse cx="140" cy="125" rx="48" ry="58" />
            <path d="M52 300 C52 220 90 190 140 190 C190 190 228 220 228 300" />
            <ellipse cx="262" cy="125" rx="48" ry="58" />
            <path d="M174 300 C174 220 212 190 262 190 C312 190 350 220 350 300" />
          </g>
        </svg>
      )}
      {hint && countdown === null && (
        <p className="absolute inset-x-3 bottom-3 rounded-full bg-paper/90 px-3 py-1 text-center text-sm font-medium text-ink">{hint}</p>
      )}
      {countdown !== null && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-ink/25" aria-live="assertive">
          <span key={countdown} className="anim-pop font-extrabold text-[7rem] leading-none text-paper drop-shadow-[0_4px_14px_rgba(40,38,41,0.5)] sm:text-[9rem]">
            {countdown}
          </span>
        </div>
      )}
      <Shutter flash={flash} flashEnabled={flashEnabled} />
      {badge && (
        <p className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold tracking-widest">{badge}</p>
      )}
      {children}
      </div>
    </div>
  )
}

/** A quick pair of shutter blades plus an optional white flash, re-triggered by changing `flash`. */
export function Shutter({ flash, flashEnabled = true }: { flash: number; flashEnabled?: boolean }) {
  if (flash <= 0) return null
  return (
    <div key={flash} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="anim-blade-top absolute inset-x-0 top-0 h-1/2 bg-ink" />
      <div className="anim-blade-bottom absolute inset-x-0 bottom-0 h-1/2 bg-ink" />
      {flashEnabled && <div className="anim-flash absolute inset-0 bg-white" />}
    </div>
  )
}
