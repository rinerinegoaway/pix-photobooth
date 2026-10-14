import { useCallback, useEffect, useRef, useState } from 'react'
import { SessionRecorder } from '../lib/sessionRecorder'
import type { RecordingLayout, RecordingResult, RecordingSource } from '../lib/sessionRecorder'

export type RecordingState =
  | { status: 'off' }
  | { status: 'recording' }
  | { status: 'ready'; result: RecordingResult }
  | { status: 'error'; message: string }

interface BeginOptions {
  getSources: () => RecordingSource[]
  layout: RecordingLayout
  /** Ask for the microphone too. Needs to be called from a click so the prompt is allowed. */
  sound?: boolean
}

export function useSessionRecording() {
  const [state, setState] = useState<RecordingState>({ status: 'off' })
  const [elapsedMs, setElapsedMs] = useState(0)
  const [notice, setNotice] = useState('')
  const recorderRef = useRef<SessionRecorder | null>(null)
  const resultUrlRef = useRef<string | null>(null)

  const revoke = useCallback(() => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    resultUrlRef.current = null
  }, [])

  /** Starts recording. Never throws: failures become state so photos keep working. */
  const begin = useCallback(
    async ({ getSources, layout, sound = false }: BeginOptions) => {
      recorderRef.current?.cancel()
      revoke()
      setNotice('')
      let audio: MediaStream | null = null
      if (sound) {
        try {
          audio = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        } catch {
          setNotice('Microphone access wasn’t allowed, so the video will be silent.')
        }
      }
      try {
        const recorder = new SessionRecorder({
          getSources,
          layout,
          audio,
          onError: message => setState({ status: 'error', message }),
        })
        recorder.start()
        recorderRef.current = recorder
        setState({ status: 'recording' })
        return true
      } catch (error) {
        audio?.getTracks().forEach(track => track.stop())
        setState({ status: 'error', message: error instanceof Error ? error.message : 'Recording could not start.' })
        return false
      }
    },
    [revoke],
  )

  /** Stops recording and keeps the file for playback and download. */
  const finish = useCallback(async () => {
    const recorder = recorderRef.current
    if (!recorder) return
    recorderRef.current = null
    try {
      const result = await recorder.stop()
      resultUrlRef.current = result.url
      setState({ status: 'ready', result })
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'The recording could not be saved.' })
    }
  }, [])

  /** Throws the recording away (cancelled or interrupted session, or starting over). */
  const discard = useCallback(() => {
    recorderRef.current?.cancel()
    recorderRef.current = null
    revoke()
    setState({ status: 'off' })
  }, [revoke])

  // Tick the on-screen timer while recording.
  const recording = state.status === 'recording'
  useEffect(() => {
    if (!recording) return
    const id = window.setInterval(() => setElapsedMs(recorderRef.current?.elapsedMs() ?? 0), 250)
    return () => window.clearInterval(id)
  }, [recording])

  // Leaving the booth always stops recording and frees the microphone and the file URL.
  useEffect(
    () => () => {
      recorderRef.current?.cancel()
      recorderRef.current = null
      revoke()
    },
    [revoke],
  )

  return { state, elapsedMs, notice, begin, finish, discard }
}

export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
