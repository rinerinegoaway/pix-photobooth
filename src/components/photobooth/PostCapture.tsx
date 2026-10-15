import { useEffect, useRef, useState } from 'react'
import { downloadBlob } from '../../lib/capture'
import { sendEvent } from '../../lib/community'
import { renderStripBlob } from '../../lib/strip'
import type { Shot, StripStyle } from '../../lib/strip'
import type { RecordingState } from '../../hooks/useSessionRecording'
import { BehindTheScenes } from './BehindTheScenes'
import { PhotoReview } from './PhotoReview'
import { PhotoStripPreview } from './PhotoStripPreview'
import { StickerEditor } from './StickerEditor'
import { StickerPicker } from './StickerPicker'
import { Stepper } from './Stepper'
import { BOOTH_STEPS } from '../../lib/steps'
import { StripCustomizer } from './StripCustomizer'
import { VideoExport } from './VideoExport'

type Stage = 'review' | 'style' | 'result'

interface Props {
  shots: Shot[]
  style: StripStyle
  onStyleChange: (patch: Partial<StripStyle>) => void
  shared?: boolean
  onRetake: (slot: number) => void
  onRetakeAll: () => void
  onBackToCamera: () => void
  /** Extra note under the review heading (used by the shared booth). */
  reviewNote?: string
  /** The behind-the-scenes recording made during the session, if any. */
  recording?: RecordingState
  recordingNotice?: string
}

/** Review → Style → Save, shared by the solo/together booth and the long-distance booth. */
export function PostCapture({ shots, style, onStyleChange, shared = false, onRetake, onRetakeAll, onBackToCamera, reviewNote, recording = { status: 'off' }, recordingNotice }: Props) {
  const [stage, setStage] = useState<Stage>('review')
  const [pngError, setPngError] = useState('')
  const [pngBusy, setPngBusy] = useState(false)
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null)
  const setPlaced = (placed: StripStyle['placed']) => onStyleChange({ placed })

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [stage])

  // Reaching the final screen means one finished strip. Anonymous counter: only the event name is sent.
  const counted = useRef(false)
  useEffect(() => {
    if (stage === 'result' && !counted.current) {
      counted.current = true
      sendEvent('strip')
    }
  }, [stage])

  async function downloadPng() {
    setPngBusy(true)
    setPngError('')
    try {
      const blob = await renderStripBlob(style, shots, 2)
      downloadBlob(blob, 'photo-strip.png')
    } catch (error) {
      setPngError(error instanceof Error ? error.message : 'The PNG could not be saved.')
    } finally {
      setPngBusy(false)
    }
  }

  const current = stage === 'review' ? 2 : stage === 'style' ? 3 : 4

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={BOOTH_STEPS} current={current} />

      {stage === 'review' && (
        <section aria-labelledby="review-heading" className="flex flex-col gap-5">
          <div>
            <h2 id="review-heading" className="t-page">Happy with these?</h2>
            <p className="t-body mt-1">Retake any single photo, or keep going. The other three stay exactly as they are.</p>
            {reviewNote && <p className="mt-1 text-sm">{reviewNote}</p>}
          </div>
          <PhotoReview shots={shots} style={style} onRetake={onRetake} />
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => setStage('style')}>
              Continue to style
            </button>
            <button type="button" className="btn btn-secondary" onClick={onBackToCamera}>
              Back to camera
            </button>
            <button type="button" className="btn btn-quiet" onClick={onRetakeAll}>
              Retake all
            </button>
          </div>
        </section>
      )}

      {stage === 'style' && (
        <section aria-labelledby="style-heading" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="order-2 flex flex-col gap-4 lg:order-1">
            <div>
              <h2 id="style-heading" className="t-page">Make it yours</h2>
              <p className="t-body mt-1">Everything updates live. Tap the words on your strip to edit them, and drag stickers anywhere. Both are drawn into your PNG and video exactly as you see them.</p>
            </div>
            <div className="card p-4 sm:p-5">
              <StickerPicker placed={style.placed} selectedId={selectedSticker} onChange={setPlaced} onSelect={setSelectedSticker} />
            </div>
            <div className="card p-4 sm:p-5">
              <StripCustomizer style={style} onChange={onStyleChange} shared={shared} />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => setStage('result')}>
                Looks good — finish
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setStage('review')}>
                Back to photos
              </button>
            </div>
          </div>
          <div className="order-1 lg:sticky lg:top-20 lg:order-2 lg:self-start">
            <div className="mx-auto w-full max-w-[20rem] lg:max-w-none">
              <StickerEditor style={style} shots={shots} onChange={setPlaced} selectedId={selectedSticker} onSelect={setSelectedSticker} onTextChange={onStyleChange} />
            </div>
          </div>
        </section>
      )}

      {stage === 'result' && (
        <section aria-labelledby="result-heading" className="flex flex-col gap-8">
          <div>
            <h2 id="result-heading" className="t-page">
              Your session is done.
            </h2>
            <p className="t-body mt-2">Two keepsakes, both saved straight from your browser. Nothing was uploaded.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="card card-print relative flex flex-col gap-5 p-6" aria-labelledby="strip-heading">
              <div>
                <p className="t-label mb-1 text-coral">Keepsake 1</p>
                <h3 id="strip-heading" className="t-section">Photo strip</h3>
              </div>
              <div className="mx-auto w-full max-w-[15rem]">
                <PhotoStripPreview style={style} shots={shots} quality={1} className="rounded-sm" label="Your finished photo strip" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => void downloadPng()} disabled={pngBusy}>
                  {pngBusy ? 'Preparing…' : 'Download photo strip'}
                </button>
                <span className="text-sm text-muted">High-resolution PNG.</span>
              </div>
              {pngError && (
                <p role="alert" className="text-sm font-semibold">
                  {pngError}
                </p>
              )}
              <details className="rounded-2xl bg-blush p-4">
                <summary className="cursor-pointer text-sm font-bold">Also make a photo animation</summary>
                <div className="mt-3 flex flex-col gap-3">
                  <p className="text-sm text-muted">A short animated slideshow of your four finished photos. This is separate from your behind-the-scenes video.</p>
                  <VideoExport style={style} shots={shots} />
                </div>
              </details>
            </article>

            <article className="card card-print relative flex flex-col gap-5 p-6" aria-labelledby="bts-heading">
              <div>
                <p className="t-label mb-1 text-coral">Keepsake 2</p>
                <h3 id="bts-heading" className="t-section">Behind-the-scenes video</h3>
              </div>
              <BehindTheScenes state={recording} notice={recordingNotice} shared={shared} />
            </article>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-secondary" onClick={() => setStage('style')}>
              Edit strip style
            </button>
            <button type="button" className="btn btn-quiet" onClick={onRetakeAll}>
              Start over
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
