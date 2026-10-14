import type { CameraApi } from '../../hooks/useCamera'

interface Props {
  camera: CameraApi
  /** What the camera will be used for and where the picture goes. Must be accurate for the booth. */
  purpose: string
  startLabel?: string
  onStart?: () => void
}

/** Explains why the camera is needed and only asks the browser after an explicit click. */
export function CameraGate({ camera, purpose, startLabel = 'Turn on camera', onStart }: Props) {
  const trouble = camera.status === 'denied' || camera.status === 'unavailable' || camera.status === 'error'
  return (
    <div className="card card-print flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 bg-blush p-6 text-center">
      {camera.status === 'requesting' ? (
        <>
          <p className="anim-pulse font-extrabold text-3xl">Waiting for your camera…</p>
          <p className="t-body max-w-sm">Your browser may be asking for permission. Choose Allow to continue.</p>
        </>
      ) : trouble ? (
        <>
          <h2 className="t-section">{camera.status === 'denied' ? 'Camera is blocked' : camera.status === 'unavailable' ? 'No camera found' : 'Camera trouble'}</h2>
          <p role="alert" className="t-body max-w-md">
            {camera.message}
          </p>
          {camera.status === 'denied' && (
            <p className="max-w-md text-sm text-muted">Look for the camera icon in the address bar, set it to Allow, then press Try again.</p>
          )}
          <button type="button" className="btn btn-primary" onClick={onStart ?? (() => void camera.start())}>
            Try again
          </button>
        </>
      ) : (
        <>
          <h2 className="t-section">Ready when you are</h2>
          <p className="t-body max-w-md">{purpose}</p>
          <button type="button" className="btn btn-primary" onClick={onStart ?? (() => void camera.start())}>
            {startLabel}
          </button>
        </>
      )}
    </div>
  )
}
