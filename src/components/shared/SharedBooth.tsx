import { useCallback, useEffect, useRef, useState } from 'react'
import { useCamera } from '../../hooks/useCamera'
import { useRoom } from '../../hooks/useRoom'
import { formatElapsed, useSessionRecording } from '../../hooks/useSessionRecording'
import { useRoute, inviteLink, routes } from '../../hooks/useRoute'
import { blobToCanvas, grabFrame, surfaceToBlob } from '../../lib/capture'
import { SHOTS_PER_SESSION } from '../../lib/protocol'
import { storedRoomCode } from '../../lib/room'
import { playShutter, primeShutter } from '../../lib/shutter'
import { defaultStyle } from '../../lib/strip'
import type { Shot, StripStyle } from '../../lib/strip'
import { CameraGate } from '../photobooth/CameraGate'
import { LiveVideo } from '../photobooth/CameraPreview'
import { PhotoReview } from '../photobooth/PhotoReview'
import { PostCapture } from '../photobooth/PostCapture'
import { SessionSettings } from '../photobooth/SessionSettings'
import { defaultSessionSettings } from '../../lib/sessionSettings'
import type { SessionSettingsValue } from '../../lib/sessionSettings'
import { Stepper } from '../photobooth/Stepper'
import { BOOTH_STEPS } from '../../lib/steps'
import { ConnectionStatus } from './ConnectionStatus'
import { ParticipantVideo } from './ParticipantVideo'

type Stage = 'lobby' | 'setup' | 'room' | 'post'
type Intent = 'create' | 'join'

const emptyShots = () => Array<Shot | null>(SHOTS_PER_SESSION).fill(null)

function formatCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, '$1-')
}

export function SharedBooth({ joinCode }: { joinCode: string | null }) {
  const camera = useCamera()
  const { client, snapshot: snap } = useRoom()
  const route = useRoute()
  const [stage, setStage] = useState<Stage>('lobby')
  const [intent, setIntent] = useState<Intent>(joinCode ? 'join' : 'create')
  const [name, setName] = useState('')
  const [code, setCode] = useState(joinCode ?? '')
  const [formError, setFormError] = useState('')
  const [style, setStyle] = useState<StripStyle>(() => ({ ...defaultStyle(), caption: 'miles apart, one frame' }))
  const [shots, setShots] = useState<(Shot | null)[]>(emptyShots)
  const [count, setCount] = useState<number | null>(null)
  const [flash, setFlash] = useState(0)
  const [settings, setSettings] = useState<SessionSettingsValue>(defaultSessionSettings)
  const recording = useSessionRecording()
  const { begin: beginRecording, finish: finishRecording, discard: discardRecording } = recording
  const recordingRef = useRef(false)
  const snapRef = useRef(snap)
  const patchSettings = useCallback((patch: Partial<SessionSettingsValue>) => setSettings(previous => ({ ...previous, ...patch })), [])
  const [captureNote, setCaptureNote] = useState('')
  const [copied, setCopied] = useState(false)
  const remoteVideo = useRef<HTMLVideoElement | null>(null)
  const localVideo = useRef<HTMLVideoElement | null>(null)
  const setLocalVideo = useCallback((node: HTMLVideoElement | null) => {
    localVideo.current = node
  }, [])
  const setRemoteVideo = useCallback((node: HTMLVideoElement | null) => {
    remoteVideo.current = node
  }, [])
  const queue = useRef<number[]>([])
  const handled = useRef<string | null>(null)
  const requested = useRef<string | null>(null)
  const nextTimer = useRef<number | undefined>(undefined)
  const patchStyle = useCallback((patch: Partial<StripStyle>) => setStyle(previous => ({ ...previous, ...patch })), [])

  // A new invite link opened while this screen is mounted switches to joining.
  useEffect(() => {
    if (route.name === 'distance' && route.join && route.join !== code && stage === 'lobby') {
      setCode(route.join)
      setIntent('join')
    }
  }, [route, code, stage])

  const ready = camera.status === 'ready' && snap.link === 'connected'

  // Publish our camera to the peer connection, and our readiness to the server.
  useEffect(() => {
    client.setLocalStream(camera.stream, camera.mirrored)
  }, [client, camera.stream, camera.mirrored])
  useEffect(() => {
    client.setReady(ready)
  }, [client, ready, snap.signaling, snap.roomId])

  useEffect(() => () => window.clearTimeout(nextTimer.current), [])
  useEffect(() => {
    snapRef.current = snap
  })
  // Recording the shared session needs both people to opt in; tell the partner where we stand.
  useEffect(() => {
    client.setRecordConsent(settings.record)
  }, [client, settings.record, snap.dataReady])

  // A countdown from the server (started by either person) drives both screens.
  const countdown = snap.countdown
  useEffect(() => {
    if (!countdown) {
      setCount(null)
      return
    }
    if (stage === 'post') setStage('room')
    const { cid, shot, captureAt } = countdown
    if (settings.record && snapRef.current.peerRecordConsent && !recordingRef.current && shots.every(item => !item)) {
      // Start rolling with the first countdown so the posing before shot 1 is included.
      recordingRef.current = true
      const arrangement = style.arrangement
      void beginRecording({
        layout: arrangement.orientation,
        getSources: () => {
          const mine = { video: localVideo.current, mirror: camera.mirrored }
          const theirs = { video: remoteVideo.current, mirror: snapRef.current.remoteMirrored }
          return arrangement.mineFirst ? [mine, theirs] : [theirs, mine]
        },
      }).then(ok => {
        if (!ok) recordingRef.current = false
      })
    }
    let finished = false
    const tick = () => {
      if (finished) return
      const remaining = captureAt - performance.now()
      if (remaining <= 4) {
        finished = true
        window.clearInterval(timer)
        setCount(null)
        if (handled.current !== cid) {
          handled.current = cid
          void takeShot(cid, shot)
        }
        return
      }
      setCount(Math.max(1, Math.min(10, Math.ceil(remaining / 1000))))
    }
    const timer = window.setInterval(tick, 50)
    tick()
    return () => {
      finished = true
      window.clearInterval(timer)
    }
    // takeShot is stable for the lifetime of a countdown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown])

  async function takeShot(cid: string, slot: number) {
    const local = localVideo.current ? grabFrame(localVideo.current, camera.mirrored) : null
    const remoteBackup = remoteVideo.current ? grabFrame(remoteVideo.current, snap.remoteMirrored) : null
    if (!local) {
      setCaptureNote('Your camera didn’t give us a picture for that shot. Try again.')
      return // no acknowledgement: the server will report the shot as failed so both sides can retry
    }
    setFlash(value => value + 1)
    if (settings.sound) playShutter()
    client.reportCaptured(cid)
    try {
      const blob = await surfaceToBlob(local)
      void client.sendFrame(cid, blob)
      const theirBlob = await client.waitForFrame(cid, 7000)
      const theirs = theirBlob ? await blobToCanvas(theirBlob) : remoteBackup
      if (!theirs) throw new Error('missing partner frame')
      setShots(previous => previous.map((shot, index) => (index === slot ? { frames: [local, theirs] } : shot)))
    } catch {
      setCaptureNote('That shot couldn’t be combined because your partner’s picture didn’t arrive. Try it again.')
      queue.current = []
    }
  }

  // After a confirmed shot, the person who started the session asks for the next one.
  const result = snap.lastResult
  useEffect(() => {
    if (!result) return
    if (!result.ok) {
      queue.current = []
      setCaptureNote(
        result.missingPeer
          ? `${snap.peerName ?? 'Your partner'}’s device didn’t respond in time, so that shot was skipped. Try again.`
          : 'Your camera didn’t respond in time, so that shot was skipped. Try again.',
      )
      return
    }
    if (requested.current !== result.cid) return
    requested.current = null
    const next = queue.current.shift()
    if (next === undefined) return
    window.clearTimeout(nextTimer.current)
    nextTimer.current = window.setTimeout(() => {
      requested.current = 'pending'
      client.requestShot(next, settings.countdown)
    }, 1600)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  // The server's countdown message carries the cid we asked for.
  useEffect(() => {
    if (countdown && requested.current === 'pending') requested.current = countdown.cid
  }, [countdown])

  const taken = shots.filter(Boolean).length
  const allTaken = taken === SHOTS_PER_SESSION
  useEffect(() => {
    if (stage === 'room' && allTaken && !countdown) {
      const timer = window.setTimeout(() => {
        // Roll a moment longer so the last reaction is in the video, then save it.
        if (recordingRef.current) {
          recordingRef.current = false
          void finishRecording()
        }
        setStage('post')
      }, 1200)
      return () => window.clearTimeout(timer)
    }
  }, [stage, allTaken, countdown, finishRecording])

  // If the partner drops or the connection is lost mid-recording, the shared recording is incomplete: drop it.
  const recordingStatus = recording.state.status
  useEffect(() => {
    if (recordingStatus === 'recording' && (!snap.peerPresent || snap.signaling !== 'open')) {
      discardRecording()
      recordingRef.current = false
      setCaptureNote('The shared recording stopped because the connection was interrupted, so it wasn’t saved. Your photos are fine.')
    }
  }, [recordingStatus, snap.peerPresent, snap.signaling, discardRecording])

  function startSession(slots?: number[]) {
    setCaptureNote('')
    const targets = slots ?? shots.flatMap((shot, index) => (shot ? [] : [index]))
    const [first, ...rest] = targets
    if (first === undefined) return
    queue.current = rest
    primeShutter()
    requested.current = 'pending'
    client.requestShot(first, settings.countdown)
  }

  function cancelSession() {
    queue.current = []
    window.clearTimeout(nextTimer.current)
    client.cancelCountdown()
  }

  function proceed() {
    const trimmed = name.trim()
    if (!trimmed) return setFormError('Add the name your partner will see.')
    if (intent === 'join' && code.replace(/[^A-Za-z0-9]/g, '').length < 16) {
      return setFormError('Room codes have 16 letters and numbers. Paste the full link or code.')
    }
    setFormError('')
    setStage('setup')
  }

  async function enter() {
    const trimmed = name.trim() || 'Guest'
    if (intent === 'create') await client.create(trimmed)
    else await client.join(code.replace(/[^A-Za-z0-9]/g, '').toUpperCase(), trimmed)
    setStage('room')
  }

  function leave() {
    client.leave()
    camera.stop()
    window.location.hash = routes.home
  }

  function backToLobby() {
    client.leave()
    camera.stop()
    setShots(emptyShots())
    setStage('lobby')
  }

  async function copyInvite() {
    if (!snap.roomId) return
    try {
      await navigator.clipboard.writeText(inviteLink(snap.roomId))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setCaptureNote('Copy didn’t work here. Select the link and copy it manually.')
    }
  }

  async function shareInvite() {
    if (!snap.roomId || !navigator.share) return
    try {
      await navigator.share({ title: '. PIX photobooth', text: `Join my booth, ${name.trim() || 'friend'} is waiting.`, url: inviteLink(snap.roomId) })
    } catch {
      /* dismissed */
    }
  }

  // ---------- render ----------

  const stepIndex = stage === 'lobby' ? 0 : stage === 'setup' ? 0 : 1
  const ended = snap.ended === 'expired' || snap.signaling === 'closed'

  if (stage === 'post' && allTaken) {
    return (
      <PostCapture
        shots={shots as Shot[]}
        style={style}
        shared
        onStyleChange={patchStyle}
        onRetake={slot => {
          setShots(previous => previous.map((shot, index) => (index === slot ? null : shot)))
          setStage('room')
        }}
        recording={recording.state}
        recordingNotice={recording.notice}
        onRetakeAll={() => {
          discardRecording()
          recordingRef.current = false
          setShots(emptyShots())
          setStage('room')
        }}
        onBackToCamera={() => setStage('room')}
        reviewNote={`Retaking asks ${snap.peerName ?? 'your partner'} to pose again too, since each photo has both of you.`}
      />
    )
  }

  if (stage === 'lobby') {
    const resumable = storedRoomCode()
    return (
      <div className="flex flex-col gap-6">
        <div>
          <p className="t-meta">Long-distance booth</p>
          <h1 className="t-page mt-1">Built for the distance between us.</h1>
          <p className="t-body mt-1 max-w-xl">
            Make a private room, send the link, and see each other live. You count down together and both of you end up in every frame.
          </p>
        </div>
        <div className="card card-print max-w-xl p-5 sm:p-6">
          <div className="mb-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="What would you like to do?">
            <button type="button" role="radio" aria-checked={intent === 'create'} className="option justify-center" onClick={() => setIntent('create')}>
              Create a room
            </button>
            <button type="button" role="radio" aria-checked={intent === 'join'} className="option justify-center" onClick={() => setIntent('join')}>
              Join a room
            </button>
          </div>
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Your name</span>
              <input className="field" value={name} maxLength={24} autoComplete="given-name" placeholder="Shown to your partner" onChange={event => setName(event.target.value)} />
            </label>
            {intent === 'join' && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Room code</span>
                <input
                  className="field tracking-wider uppercase"
                  value={formatCode(code)}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  onChange={event => setCode(event.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16))}
                />
              </label>
            )}
            {formError && (
              <p role="alert" className="text-sm text-ink">
                {formError}
              </p>
            )}
            <button type="button" className="btn btn-primary self-start" onClick={proceed}>
              Continue
            </button>
          </div>
        </div>
        {resumable && (
          <p className="text-sm text-muted">
            You were in room {formatCode(resumable)} on this device.{' '}
            <button
              type="button"
              className="font-semibold text-ink underline underline-offset-4"
              onClick={() => {
                setIntent('join')
                setCode(resumable)
                if (!name.trim()) setName('Me')
                setStage('setup')
              }}
            >
              Rejoin it
            </button>
          </p>
        )}
        <p className="max-w-xl text-sm text-muted">
          Your video goes straight to your partner over an encrypted connection. The booth server only helps you find each other and keep the countdown in step. It never receives your video or photos.
        </p>
      </div>
    )
  }

  if (stage === 'setup') {
    return (
      <div className="flex flex-col gap-6">
        <Stepper steps={BOOTH_STEPS} current={stepIndex} />
        <div>
          <p className="t-meta">{intent === 'create' ? 'New room' : 'Joining a room'}</p>
          <h1 className="t-page mt-1">Check your camera.</h1>
          <p className="t-body mt-1 max-w-xl">
            {intent === 'create' ? 'Once your camera is on you’ll get a private link to send.' : 'Make sure you look right, then join.'}
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-4">
            {camera.status === 'ready' ? (
              <div className="card card-print relative aspect-[4/3] overflow-hidden bg-ink">
                <LiveVideo stream={camera.stream} mirrored={camera.mirrored} label="Your camera preview" />
              </div>
            ) : (
              <CameraGate
                camera={camera}
                purpose="Your camera feed will be shared live with the other person in this room. It is not recorded or stored on a server."
              />
            )}
            {camera.switchError && <p className="text-sm text-ink">{camera.switchError}</p>}
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" disabled={camera.status !== 'ready'} onClick={() => void enter()}>
                {intent === 'create' ? 'Create room' : 'Join room'}
              </button>
              {camera.devices.length > 1 && camera.status === 'ready' && (
                <button type="button" className="btn btn-secondary" onClick={() => void camera.switchCamera()}>
                  Switch camera
                </button>
              )}
              <button type="button" className="btn btn-quiet" onClick={backToLobby}>
                Back
              </button>
            </div>
          </div>
          <aside className="card h-fit p-5 text-sm" aria-label="What is shared">
            <h2 className="t-label mb-2">What gets shared</h2>
            <ul className="m-0 list-disc space-y-2 pl-5 text-muted">
              <li>Your live video goes to the other person only, directly between your browsers where networks allow.</li>
              <li>The booth server sees your display name and connection details, not your video.</li>
              <li>Photos are combined in each browser. Nothing is saved on a server.</li>
            </ul>
          </aside>
        </div>
      </div>
    )
  }

  // stage === 'room'
  const partnerName = snap.peerName ?? 'Partner'
  const hostWaiting = snap.role === 'host' && !snap.peerPresent && !snap.peerName
  const canShoot = ready && snap.peerReady && snap.peerPresent && !countdown
  const sessionRunning = Boolean(countdown) || queue.current.length > 0
  const stacked = style.arrangement.orientation === 'stacked'
  const mineFirst = style.arrangement.mineFirst
  const retakeSlots = shots.flatMap((shot, index) => (shot ? [] : [index]))

  const mine = (
    <ParticipantVideo
      key="mine"
      label={snap.selfName || 'You'}
      local
      stream={camera.stream}
      mirrored={camera.mirrored}
      muted
      videoRef={setLocalVideo}
      countdown={count}
      flash={flash}
      flashEnabled={settings.flash}
      emptyMessage="Your camera is off"
    />
  )
  const theirs = (
    <ParticipantVideo
      key="theirs"
      label={partnerName}
      stream={snap.remoteStream}
      mirrored={snap.remoteMirrored}
      muted
      videoRef={setRemoteVideo}
      countdown={count}
      flash={flash}
      flashEnabled={settings.flash}
      emptyMessage={
        snap.peerPresent
          ? snap.link === 'failed'
            ? 'Couldn’t connect to their camera'
            : `Connecting to ${partnerName}’s camera…`
          : snap.peerName
            ? `${partnerName} disconnected`
            : 'Waiting for your partner'
      }
    />
  )

  return (
    <div className="flex flex-col gap-5">
      <Stepper steps={BOOTH_STEPS} current={1} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="t-page">Shared booth</h1>
          <ConnectionStatus snap={snap} selfReady={ready} />
          {recording.state.status === 'recording' && (
            <p role="status" className="chip bg-white">
              <span className="anim-pulse h-2.5 w-2.5 rounded-full bg-coral" aria-hidden="true" />
              REC {formatElapsed(recording.elapsedMs)} · both feeds
            </p>
          )}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={leave}>
          Leave room
        </button>
      </div>

      {ended && (
        <div role="alert" className="card flex flex-col items-start gap-3 border-coral p-4">
          <p className="font-medium">{snap.error || 'The room is no longer available.'}</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={backToLobby}>
            Back to the lobby
          </button>
        </div>
      )}

      {!ended && snap.error && (
        <p role="alert" className="rounded-lg border-2 border-coral p-3 text-sm text-ink">
          {snap.error}
        </p>
      )}

      {hostWaiting && snap.roomId && (
        <section className="card card-print flex flex-col gap-3 bg-butter p-4 sm:p-5" aria-labelledby="invite-heading">
          <h2 id="invite-heading" className="t-section !text-xl">
            Invite your person
          </h2>
          <p className="text-sm">Anyone with this link can join, and the room holds two people. Share it only with them.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly aria-label="Invitation link" className="field text-sm" value={inviteLink(snap.roomId)} onFocus={event => event.currentTarget.select()} />
            <button type="button" className="btn btn-primary shrink-0" onClick={() => void copyInvite()}>
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            {typeof navigator.share === 'function' && (
              <button type="button" className="btn btn-secondary shrink-0" onClick={() => void shareInvite()}>
                Share…
              </button>
            )}
          </div>
          <p className="text-sm">
            Or give them the code: <strong className="tracking-wider uppercase">{formatCode(snap.roomId)}</strong>
          </p>
        </section>
      )}

      {snap.notice && (
        <p role="status" className="text-sm font-medium">
          {snap.notice}
        </p>
      )}

      <div className={`grid gap-4 ${stacked ? 'mx-auto w-full max-w-2xl' : 'md:grid-cols-2'}`}>
        {mineFirst ? (
          <>
            {mine}
            {theirs}
          </>
        ) : (
          <>
            {theirs}
            {mine}
          </>
        )}
      </div>

      {countdown && (
        <p className="text-center text-sm font-extrabold tracking-widest" aria-live="polite">
          PHOTO {countdown.shot + 1} OF {SHOTS_PER_SESSION}
        </p>
      )}

      {captureNote && (
        <p role="alert" className="rounded-xl border border-coral bg-blush p-3 text-sm font-semibold text-ink">
          {captureNote}
        </p>
      )}

      <div className="card p-5">
        <SessionSettings
          value={settings}
          onChange={patchSettings}
          disabled={Boolean(countdown)}
          shared
          partnerName={partnerName}
          partnerAgrees={snap.peerRecordConsent}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {countdown || sessionRunning ? (
          <button type="button" className="btn btn-danger" onClick={cancelSession}>
            Cancel
          </button>
        ) : allTaken ? (
          <button type="button" className="btn btn-primary" onClick={() => setStage('post')}>
            Review photos
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={!canShoot} onClick={() => startSession(retakeSlots)}>
            {taken === 0 ? 'Start 4-photo session' : `Take remaining ${retakeSlots.length}`}
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={() => patchStyle({ arrangement: { ...style.arrangement, orientation: stacked ? 'side' : 'stacked' } })}>
          {stacked ? 'Side by side' : 'Stacked'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => patchStyle({ arrangement: { ...style.arrangement, mineFirst: !mineFirst } })}>
          Swap sides
        </button>
        {camera.devices.length > 1 && (
          <button type="button" className="btn btn-secondary" onClick={() => void camera.switchCamera()} disabled={Boolean(countdown)}>
            Switch camera
          </button>
        )}
        <span className="t-meta ml-auto" aria-live="polite">
          {taken} of {SHOTS_PER_SESSION} taken
        </span>
      </div>
      {!canShoot && !countdown && !allTaken && (
        <p className="text-sm text-muted">
          {snap.peerPresent ? 'Shooting unlocks when both cameras are connected and ready.' : 'Shooting unlocks when your partner has joined.'}
        </p>
      )}

      <PhotoReview
        shots={shots}
        style={style}
        onRetake={
          countdown || !snap.peerPresent
            ? undefined
            : slot => {
                setShots(previous => previous.map((shot, index) => (index === slot ? null : shot)))
                startSession([slot])
              }
        }
      />
    </div>
  )
}
