// Behind-the-scenes recording of the live session.
//
// This records what is actually on screen while people pose: the same live camera video
// elements the booth already shows (no second camera stream), drawn frame by frame onto a canvas
// and recorded with MediaRecorder. A canvas is used so that (a) the recording is mirrored exactly
// like the preview people were watching and (b) a shared session can show both participants.
// It is never built from the captured photos, and it never leaves the device.

import { pickVideoFormat } from './video'

export interface RecordingSource {
  video: HTMLVideoElement | null
  /** Flip horizontally, like the on-screen selfie preview. */
  mirror: boolean
}

export type RecordingLayout = 'single' | 'side' | 'stacked'

export interface RecordingResult {
  blob: Blob
  url: string
  ext: 'mp4' | 'webm'
  mime: string
  durationMs: number
  hasAudio: boolean
}

export interface SessionRecorderOptions {
  getSources: () => RecordingSource[]
  layout: RecordingLayout
  /** Microphone stream to include, if the person opted in. Stopped when recording ends. */
  audio?: MediaStream | null
  onError?: (message: string) => void
}

const FPS = 30

const AUDIO_CANDIDATES = [
  { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' as const },
  { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' as const },
  { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' as const },
]

function drawCover(ctx: CanvasRenderingContext2D, source: RecordingSource, x: number, y: number, w: number, h: number) {
  const video = source.video
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  if (!video || video.readyState < 2 || !video.videoWidth) {
    ctx.fillStyle = '#F7E8EA'
    ctx.fillRect(x, y, w, h)
  } else {
    const scale = Math.max(w / video.videoWidth, h / video.videoHeight)
    const dw = video.videoWidth * scale
    const dh = video.videoHeight * scale
    ctx.translate(x + w / 2, y + h / 2)
    if (source.mirror) ctx.scale(-1, 1)
    ctx.drawImage(video, -dw / 2, -dh / 2, dw, dh)
  }
  ctx.restore()
}

export class SessionRecorder {
  private canvas = document.createElement('canvas')
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private timer: ReturnType<typeof setInterval> | undefined
  private startedAt = 0
  private stream: MediaStream | null = null
  private failed = ''
  private ext: 'mp4' | 'webm' = 'webm'
  private hasAudio = false

  private options: SessionRecorderOptions

  constructor(options: SessionRecorderOptions) {
    this.options = options
  }

  get active(): boolean {
    return this.recorder !== null && this.recorder.state !== 'inactive'
  }

  elapsedMs(): number {
    return this.startedAt ? performance.now() - this.startedAt : 0
  }

  /** Throws a readable error if the browser cannot record. */
  start() {
    const base = pickVideoFormat()
    if (!base) throw new Error('This browser can’t record video, so the behind-the-scenes video isn’t available. Your photos still work.')

    const [first] = this.options.getSources()
    const sw = first?.video?.videoWidth || 960
    const sh = first?.video?.videoHeight || 720
    if (this.options.layout === 'side') [this.canvas.width, this.canvas.height] = [1280, 720]
    else if (this.options.layout === 'stacked') [this.canvas.width, this.canvas.height] = [720, 1280]
    else {
      const scale = Math.min(1, 1280 / sw)
      this.canvas.width = Math.round(sw * scale)
      this.canvas.height = Math.round(sh * scale)
    }
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not prepare the recording surface.')

    this.drawFrame(ctx)
    const canvasStream = this.canvas.captureStream(FPS)
    const audioTracks = this.options.audio?.getAudioTracks() ?? []
    this.stream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks])

    let mime = base.mime
    this.ext = base.ext
    this.hasAudio = false
    if (audioTracks.length > 0) {
      const withAudio = AUDIO_CANDIDATES.find(candidate => MediaRecorder.isTypeSupported(candidate.mime))
      if (withAudio) {
        mime = withAudio.mime
        this.ext = withAudio.ext
        this.hasAudio = true
      }
    }

    try {
      this.recorder = new MediaRecorder(this.stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 })
    } catch (error) {
      this.teardown()
      throw new Error(`Recording could not start: ${error instanceof Error ? error.message : 'unknown error'}.`)
    }
    this.recorder.ondataavailable = event => {
      if (event.data.size > 0) this.chunks.push(event.data)
    }
    this.recorder.onerror = () => {
      this.failed = 'The browser stopped recording unexpectedly.'
      this.options.onError?.(this.failed)
    }
    this.startedAt = performance.now()
    this.recorder.start(500)
    // A timer rather than requestAnimationFrame so recording continues if the tab loses focus.
    this.timer = setInterval(() => this.drawFrame(ctx), 1000 / FPS)
  }

  private drawFrame(ctx: CanvasRenderingContext2D) {
    const sources = this.options.getSources()
    const { width, height } = this.canvas
    if (this.options.layout === 'single' || sources.length < 2) {
      if (sources[0]) drawCover(ctx, sources[0], 0, 0, width, height)
    } else if (this.options.layout === 'side') {
      drawCover(ctx, sources[0], 0, 0, width / 2, height)
      drawCover(ctx, sources[1], width / 2, 0, width / 2, height)
    } else {
      drawCover(ctx, sources[0], 0, 0, width, height / 2)
      drawCover(ctx, sources[1], 0, height / 2, width, height / 2)
    }
  }

  /** Stops recording and assembles the collected chunks into one playable file. */
  stop(): Promise<RecordingResult> {
    const recorder = this.recorder
    if (!recorder) return Promise.reject(new Error('Nothing was recorded.'))
    return new Promise((resolve, reject) => {
      const finish = () => {
        const durationMs = this.elapsedMs()
        const blob = new Blob(this.chunks, { type: this.ext === 'mp4' ? 'video/mp4' : 'video/webm' })
        const { ext, hasAudio, failed } = this
        const mime = recorder.mimeType
        this.teardown()
        if (failed && blob.size === 0) reject(new Error(failed))
        else if (blob.size === 0) reject(new Error('The recording came out empty. Please try again.'))
        else resolve({ blob, url: URL.createObjectURL(blob), ext, mime, durationMs, hasAudio })
      }
      if (recorder.state === 'inactive') finish()
      else {
        recorder.onstop = finish
        try {
          recorder.stop()
        } catch (error) {
          this.teardown()
          reject(error instanceof Error ? error : new Error('Recording could not be stopped.'))
        }
      }
    })
  }

  /** Throws the recording away (cancelled or interrupted session). */
  cancel() {
    const recorder = this.recorder
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      try {
        recorder.stop()
      } catch {
        /* already stopped */
      }
    }
    this.teardown()
  }

  private teardown() {
    clearInterval(this.timer)
    this.timer = undefined
    this.stream?.getVideoTracks().forEach(track => track.stop())
    // The microphone stream (if any) is ours alone: always release it.
    this.options.audio?.getTracks().forEach(track => track.stop())
    this.stream = null
    this.recorder = null
    this.chunks = []
    this.startedAt = 0
  }
}
