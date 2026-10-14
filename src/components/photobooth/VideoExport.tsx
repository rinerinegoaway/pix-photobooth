import { useEffect, useRef, useState } from 'react'
import { downloadBlob } from '../../lib/capture'
import { exportVideo, pickVideoFormat, VIDEO_DURATIONS } from '../../lib/video'
import type { VideoDuration } from '../../lib/video'
import type { Shot, StripStyle } from '../../lib/strip'

type State =
  | { phase: 'idle' }
  | { phase: 'working'; progress: number }
  | { phase: 'done'; name: string; ext: string; size: number }
  | { phase: 'error'; message: string }

export function VideoExport({ style, shots }: { style: StripStyle; shots: Shot[] }) {
  const format = pickVideoFormat()
  const [duration, setDuration] = useState<VideoDuration>(10)
  const [state, setState] = useState<State>({ phase: 'idle' })
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => controller.current?.abort(), [])

  async function run() {
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setState({ phase: 'working', progress: 0 })
    try {
      const result = await exportVideo({
        style,
        shots,
        duration,
        signal: abort.signal,
        onProgress: progress => setState({ phase: 'working', progress }),
      })
      const name = `photo-strip.${result.ext}`
      downloadBlob(result.blob, name)
      setState({ phase: 'done', name, ext: result.ext, size: result.blob.size })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setState({ phase: 'idle' })
        return
      }
      setState({ phase: 'error', message: error instanceof Error ? error.message : 'The video could not be created.' })
    }
  }

  if (!format) {
    return (
      <div className="rounded-xl border border-dashed border-ink/40 p-4 text-sm" role="note">
        <strong>Video export isn’t available in this browser.</strong>
        <p className="mt-1 text-muted">It needs canvas recording support (MediaRecorder). Try a recent Chrome, Edge, Firefox or Safari. Your PNG download works as usual.</p>
      </div>
    )
  }

  const working = state.phase === 'working'
  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="mb-1 block text-sm font-medium">Length</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Video length">
          {VIDEO_DURATIONS.map(seconds => (
            <button key={seconds} type="button" role="radio" aria-checked={duration === seconds} className="option !py-1.5" disabled={working} onClick={() => setDuration(seconds)}>
              {seconds}s
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted">
        Saves as <strong>{format.label}</strong>
        {format.ext === 'webm' ? ' (this browser can’t record MP4; WebM plays in most browsers and editors)' : ''}. Recording runs in real time, so keep this tab open and visible.
      </p>
      {working ? (
        <div role="status" aria-live="polite">
          <div className="h-3 overflow-hidden rounded-full bg-blush">
            <div className="h-full bg-coral transition-[width] duration-200" style={{ width: `${Math.round(state.progress * 100)}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span>Recording… {Math.round(state.progress * 100)}%</span>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => controller.current?.abort()}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-secondary" onClick={() => void run()}>
          Make {duration}s video
        </button>
      )}
      {state.phase === 'done' && (
        <p role="status" className="text-sm font-medium">
          Saved {state.name} ({(state.size / 1_000_000).toFixed(1)} MB).
        </p>
      )}
      {state.phase === 'error' && (
        <p role="alert" className="rounded-xl border border-coral bg-blush p-3 text-sm font-semibold text-ink">
          {state.message} Your PNG download is unaffected.
        </p>
      )}
    </div>
  )
}
