import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCamera } from '../../hooks/useCamera'
import { formatElapsed, useSessionRecording } from '../../hooks/useSessionRecording'
import { grabFrame } from '../../lib/capture'
import { consumeAutoStart } from '../../lib/nav'
import { SHOTS_PER_SESSION } from '../../lib/protocol'
import { playShutter, primeShutter } from '../../lib/shutter'
import { BOOTH_STEPS } from '../../lib/steps'
import { defaultStyle } from '../../lib/strip'
import type { Shot, StripStyle } from '../../lib/strip'
import { CameraGate } from './CameraGate'
import { CameraPreview } from './CameraPreview'
import { PhotoReview } from './PhotoReview'
import { PhotoStripPreview } from './PhotoStripPreview'
import { PostCapture } from './PostCapture'
import { SessionSettings } from './SessionSettings'
import { defaultSessionSettings } from '../../lib/sessionSettings'
import type { SessionSettingsValue } from '../../lib/sessionSettings'
import { Stepper } from './Stepper'
import { BackgroundPicker, StripCustomizer } from './StripCustomizer'

interface Token {
  cancelled: boolean
  wake: Set<() => void>
}

function sleep(ms: number, token: Token): Promise<boolean> {
  return new Promise(resolve => {
    const timer = window.setTimeout(() => {
      token.wake.delete(wake)
      resolve(!token.cancelled)
    }, ms)
    const wake = () => {
      window.clearTimeout(timer)
      resolve(false)
    }
    token.wake.add(wake)
  })
}

function cancelToken(token: Token | null) {
  if (!token) return
  token.cancelled = true
  token.wake.forEach(wake => wake())
  token.wake.clear()
}

type Stage = 'capture' | 'post'

const emptyShots = () => Array<Shot | null>(SHOTS_PER_SESSION).fill(null)

export function Booth({ mode }: { mode: 'solo' | 'together' }) {
  const camera = useCamera()
  const recording = useSessionRecording()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const setVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node
  }, [])
  const runRef = useRef<Token | null>(null)
  const [stage, setStage] = useState<Stage>('capture')
  const [style, setStyle] = useState<StripStyle>(() => defaultStyle())
  const [settings, setSettings] = useState<SessionSettingsValue>(() => ({ ...defaultSessionSettings, countdown: mode === 'together' ? 5 : 3 }))
  const [shots, setShots] = useState<(Shot | null)[]>(emptyShots)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [flash, setFlash] = useState(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [retaking, setRetaking] = useState<number | null>(null)
  const [current, setCurrent] = useState(0)

  const taken = shots.filter(Boolean).length
  const allTaken = taken === SHOTS_PER_SESSION
  const patchStyle = useCallback((patch: Partial<StripStyle>) => setStyle(previous => ({ ...previous, ...patch })), [])
  const patchSettings = useCallback((patch: Partial<SessionSettingsValue>) => setSettings(previous => ({ ...previous, ...patch })), [])
  const { begin: beginRecording, finish: finishRecording, discard: discardRecording } = recording

  // Abort any running countdown when leaving the booth.
  useEffect(() => () => cancelToken(runRef.current), [])

  // Arriving from an "Enter photobooth" button is the user's request to turn the camera on.
  const { start: startCamera } = camera
  useEffect(() => {
    if (consumeAutoStart()) void startCamera()
  }, [startCamera])

  const capture = useCallback(
    async (slots: number[]) => {
      if (runRef.current || slots.length === 0) return // never start a second countdown
      const token: Token = { cancelled: false, wake: new Set() }
      runRef.current = token
      setRunning(true)
      setError('')
      primeShutter() // sound is only allowed after a click, and this runs from one
      let recordingActive = false
      try {
        // A behind-the-scenes video covers a whole four-photo session, starting before the first countdown.
        if (settings.record && slots.length === SHOTS_PER_SESSION) {
          recordingActive = await beginRecording({
            getSources: () => [{ video: videoRef.current, mirror: camera.mirrored }],
            layout: 'single',
            sound: settings.recordSound,
          })
        }
        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i]
          setCurrent(slot)
          for (let n = settings.countdown; n >= 1; n--) {
            setCountdown(n)
            if (!(await sleep(1000, token))) return
          }
          setCountdown(null)
          const video = videoRef.current
          const frame = video ? grabFrame(video, camera.mirrored) : null
          if (!frame) throw new Error('The camera didn’t give us a picture. Check that it is on and try again.')
          setFlash(value => value + 1)
          if (settings.sound) playShutter()
          setShots(previous => previous.map((shot, index) => (index === slot ? { frames: [frame] } : shot)))
          setRetaking(null)
          if (i < slots.length - 1 && !(await sleep(1600, token))) return
        }
        if (recordingActive) {
          // Keep rolling for a moment so the last reaction is in the video.
          await sleep(1200, token)
          recordingActive = false
          await finishRecording()
        }
        if (!token.cancelled) setStage('post')
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'That photo could not be taken.')
      } finally {
        if (recordingActive) discardRecording() // cancelled or interrupted: drop the partial recording
        setCountdown(null)
        setRunning(false)
        if (runRef.current === token) runRef.current = null
      }
    },
    [beginRecording, camera.mirrored, discardRecording, finishRecording, settings.countdown, settings.record, settings.recordSound, settings.sound],
  )

  const emptySlots = useMemo(() => shots.flatMap((shot, index) => (shot ? [] : [index])), [shots])

  function stopRun() {
    cancelToken(runRef.current)
  }

  function retake(slot: number) {
    setShots(previous => previous.map((shot, index) => (index === slot ? null : shot)))
    setRetaking(slot)
    setStage('capture')
    if (camera.status !== 'ready') void camera.start()
  }

  function retakeAll() {
    discardRecording() // a new session records a new video
    setShots(emptyShots())
    setRetaking(null)
    setStage('capture')
    if (camera.status !== 'ready') void camera.start()
  }

  function backToCamera() {
    setStage('capture')
    if (camera.status !== 'ready') void camera.start()
  }

  // The camera is only needed while shooting; release it as soon as we move on.
  useEffect(() => {
    if (stage === 'post') camera.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  if (stage === 'post' && allTaken) {
    return (
      <PostCapture
        shots={shots as Shot[]}
        style={style}
        onStyleChange={patchStyle}
        recording={recording.state}
        recordingNotice={recording.notice}
        onRetake={retake}
        onRetakeAll={retakeAll}
        onBackToCamera={backToCamera}
      />
    )
  }

  const cameraOn = camera.status === 'ready'
  const step = !cameraOn ? 0 : 1
  const modeName = mode === 'together' ? 'Together booth' : 'Solo booth'
  const buttonLabel = running
    ? 'Get ready…'
    : allTaken
      ? 'Review photos'
      : retaking !== null
        ? `Retake photo ${retaking + 1}`
        : taken === 0
          ? 'Start photo session'
          : `Take remaining ${emptySlots.length}`
  const badge = running ? `PHOTO ${current + 1} OF ${SHOTS_PER_SESSION}` : undefined
  const isRecording = recording.state.status === 'recording'

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={BOOTH_STEPS} current={step} />
      <div>
        <p className="t-meta">{modeName}</p>
        <h1 className="t-page mt-1">{cameraOn ? (running ? `Photo ${current + 1} of ${SHOTS_PER_SESSION}` : 'Strike a pose.') : mode === 'together' ? 'Squeeze in close.' : 'Just you.'}</h1>
        <p className="t-body mt-1">
          {mode === 'together'
            ? 'Both of you sit in front of this one device. Set your countdown, press start, and the booth takes all four photos for you.'
            : 'Set your countdown, press start, and the booth takes all four photos for you.'}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex flex-col gap-4">
          {cameraOn ? (
            <CameraPreview
              stream={camera.stream}
              mirrored={camera.mirrored}
              videoRef={setVideo}
              countdown={countdown}
              flash={flash}
              flashEnabled={settings.flash}
              badge={badge}
              guide={mode === 'together' ? 'together' : null}
              hint={mode === 'together' ? 'Line up your faces with the outlines' : undefined}
            >
              {isRecording && (
                <p role="status" className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold tracking-widest">
                  <span className="anim-pulse h-2.5 w-2.5 rounded-full bg-coral" aria-hidden="true" />
                  REC {formatElapsed(recording.elapsedMs)}
                  <span className="sr-only">Recording a behind-the-scenes video</span>
                </p>
              )}
            </CameraPreview>
          ) : (
            <CameraGate
              camera={camera}
              startLabel="Enter photobooth"
              purpose={
                mode === 'together'
                  ? 'We’ll turn on your camera so you can see yourselves live. Pictures are made in your browser and are not uploaded.'
                  : 'We’ll turn on your camera so you can see yourself live. Pictures are made in your browser and are not uploaded.'
              }
            />
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-coral bg-blush p-3 text-sm font-semibold">
              {error}
            </p>
          )}
          {recording.state.status === 'error' && (
            <p role="alert" className="rounded-xl border border-coral bg-blush p-3 text-sm font-semibold">
              {recording.state.message} Your photos are not affected.
            </p>
          )}
          {recording.notice && (
            <p role="status" className="text-sm font-semibold">
              {recording.notice}
            </p>
          )}
          {camera.switchError && (
            <p role="status" className="text-sm font-semibold">
              {camera.switchError}
            </p>
          )}

          {cameraOn && (
            <div className="flex flex-wrap items-center gap-3">
              {running ? (
                <button type="button" className="btn btn-danger" onClick={stopRun}>
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => (allTaken ? setStage('post') : void capture(retaking !== null ? [retaking] : emptySlots))}
                >
                  {buttonLabel}
                </button>
              )}
              {camera.devices.length > 1 && (
                <button type="button" className="btn btn-secondary" onClick={() => void camera.switchCamera()} disabled={running}>
                  Switch camera
                </button>
              )}
              {taken > 0 && !running && (
                <button type="button" className="btn btn-quiet" onClick={retakeAll}>
                  Restart
                </button>
              )}
              <span className="t-meta ml-auto" aria-live="polite">
                {taken} of {SHOTS_PER_SESSION} taken
              </span>
            </div>
          )}

          <PhotoReview shots={shots} style={style} onRetake={running ? undefined : retake} activeSlot={retaking} />
        </div>

        <aside className="flex flex-col gap-6" aria-label="Session setup">
          <div className="card flex flex-col gap-6 p-5">
            <SessionSettings value={settings} onChange={patchSettings} disabled={running} />
            <div>
              <h2 className="t-label mb-2">Strip layout</h2>
              <StripCustomizer style={style} onChange={patchStyle} layoutOnly />
            </div>
            <div>
              <h2 className="t-label mb-2">Background</h2>
              <BackgroundPicker value={style.background} onChange={background => patchStyle({ background })} />
            </div>
          </div>
          <div className="card p-4">
            <p className="t-label mb-3">Your strip, as you shoot</p>
            <div className="mx-auto w-full max-w-[11rem]">
              <PhotoStripPreview style={style} shots={shots} quality={0.5} label="Your photo strip filling up as you take photos" />
            </div>
            <p className="mt-3 text-xs text-muted">Frames, stickers and words come after the photos.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
