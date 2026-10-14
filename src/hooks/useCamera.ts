import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable' | 'error'

export interface CameraApi {
  stream: MediaStream | null
  status: CameraStatus
  message: string
  devices: MediaDeviceInfo[]
  deviceId: string
  /** False for rear cameras, whose preview and photos should not be flipped. */
  mirrored: boolean
  /** Starts the camera. Must be called from an explicit user action. */
  start: () => Promise<void>
  switchCamera: () => Promise<void>
  switchError: string
  stop: () => void
}

function explain(error: unknown): { status: CameraStatus; message: string } {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return {
      status: 'denied',
      message: 'Camera access is blocked. Allow the camera for this site in your browser’s address bar, then try again.',
    }
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return { status: 'unavailable', message: 'No camera was found on this device.' }
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return {
      status: 'error',
      message: 'Your camera is busy. Close other apps or tabs that are using it, then try again.',
    }
  }
  return {
    status: 'error',
    message: error instanceof Error ? error.message : 'The camera could not be started.',
  }
}

export function useCamera(): CameraApi {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [message, setMessage] = useState('')
  const [switchError, setSwitchError] = useState('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [mirrored, setMirrored] = useState(true)
  const streamRef = useRef<MediaStream | null>(null)
  const requestRef = useRef(0)

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => {
      track.onended = null
      track.stop()
    })
    streamRef.current = null
  }, [])

  const stop = useCallback(() => {
    requestRef.current++
    release()
    setStream(null)
    setStatus('idle')
    setMessage('')
  }, [release])

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      setDevices(all.filter(device => device.kind === 'videoinput'))
    } catch {
      /* listing devices is optional */
    }
  }, [])

  const open = useCallback(
    async (wantedId: string | null): Promise<boolean> => {
      const request = ++requestRef.current
      setStatus('requesting')
      setMessage('')
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable')
        setMessage(
          window.isSecureContext
            ? 'This browser does not support camera access.'
            : 'Camera access needs a secure (HTTPS) connection.',
        )
        return false
      }
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: wantedId
            ? { deviceId: { exact: wantedId }, width: { ideal: 1280 }, height: { ideal: 960 } }
            : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        })
        if (request !== requestRef.current) {
          next.getTracks().forEach(track => track.stop())
          return false
        }
        release()
        streamRef.current = next
        const track = next.getVideoTracks()[0]
        const settings = track?.getSettings() ?? {}
        setDeviceId(settings.deviceId ?? '')
        setMirrored(settings.facingMode !== 'environment')
        track.onended = () => {
          if (streamRef.current === next) {
            release()
            setStream(null)
            setStatus('error')
            setMessage('The camera disconnected. Reconnect it or choose Try again.')
          }
        }
        setStream(next)
        setStatus('ready')
        void refreshDevices()
        return true
      } catch (error) {
        if (request !== requestRef.current) return false
        const result = explain(error)
        setStatus(result.status)
        setMessage(result.message)
        return false
      }
    },
    [refreshDevices, release],
  )

  const start = useCallback(async () => {
    setSwitchError('')
    await open(null)
  }, [open])

  const switchCamera = useCallback(async () => {
    if (devices.length < 2) return
    setSwitchError('')
    const index = devices.findIndex(device => device.deviceId === deviceId)
    const next = devices[(index + 1) % devices.length]
    const previous = deviceId
    release()
    setStream(null)
    const ok = await open(next.deviceId)
    if (!ok) {
      setSwitchError('That camera could not be opened. Going back to the previous one.')
      if (previous) await open(previous)
    }
  }, [devices, deviceId, open, release])

  useEffect(() => {
    const onChange = () => void refreshDevices()
    navigator.mediaDevices?.addEventListener?.('devicechange', onChange)
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', onChange)
  }, [refreshDevices])

  // Always turn the camera off when the booth unmounts.
  useEffect(() => {
    return () => {
      requestRef.current++
      release()
    }
  }, [release])

  return { stream, status, message, devices, deviceId, mirrored, start, switchCamera, switchError, stop }
}
