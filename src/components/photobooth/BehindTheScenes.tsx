import { downloadBlob } from '../../lib/capture'
import type { RecordingState } from '../../hooks/useSessionRecording'
import { formatElapsed } from '../../hooks/useSessionRecording'

interface Props {
  state: RecordingState
  notice?: string
  /** Shared sessions record both feeds; say so (and say what was not recorded). */
  shared?: boolean
}

/** Plays back the real recording of the session and offers it as a download. */
export function BehindTheScenes({ state, notice, shared = false }: Props) {
  if (state.status === 'ready') {
    const { result } = state
    const name = `behind-the-scenes.${result.ext}`
    return (
      <div className="flex flex-col gap-4">
        <video
          src={result.url}
          controls
          playsInline
          preload="metadata"
          aria-label="Playback of your behind-the-scenes recording"
          className="w-full rounded-2xl bg-ink"
          style={{ maxHeight: '28rem' }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => downloadBlob(result.blob, name)}>
            Download video ({result.ext.toUpperCase()})
          </button>
          <span className="text-sm text-muted">
            {formatElapsed(result.durationMs)} · {(result.blob.size / 1_000_000).toFixed(1)} MB{result.hasAudio ? ' · with sound' : ' · no sound'}
          </span>
        </div>
        <p className="text-sm text-muted">
          {shared
            ? 'This is a recording of the shared session as it appeared on your screen, with both of you. It exists only on this device.'
            : 'This is the real recording of your session, not made from the photos. It exists only on this device.'}
        </p>
        {notice && <p className="text-sm font-semibold">{notice}</p>}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <p role="alert" className="rounded-xl border border-coral bg-blush p-4 text-sm font-semibold">
        {state.message} Your photo strip is not affected.
      </p>
    )
  }

  return (
    <div className="rounded-2xl bg-blush p-4 text-sm">
      <p className="font-bold">No behind-the-scenes video this time.</p>
      <p className="mt-1 text-muted">
        {shared
          ? 'Both of you need to turn on “Record our moments together” before the first countdown. Next session, try it!'
          : 'Turn on “Save a behind-the-scenes video” before you start a session and we’ll record your poses and reactions, on your device only.'}
      </p>
      {notice && <p className="mt-2 font-semibold">{notice}</p>}
    </div>
  )
}
