import { backgrounds, drawBackground, drawCaption, drawCell, drawStrip, ensureFont, geometry } from './strip'
import type { Shot, StripStyle } from './strip'

// Video export: we draw the finished story onto a canvas in real time and record it with
// MediaRecorder. The file extension always follows the encoding the browser actually used.
// No ". PIX" signature is drawn: only the user's own caption/names/date appear.

export interface VideoFormat {
  mime: string
  ext: 'mp4' | 'webm'
  label: string
}

const CANDIDATES: VideoFormat[] = [
  { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4', label: 'MP4 (H.264)' },
  { mime: 'video/mp4;codecs=avc1', ext: 'mp4', label: 'MP4 (H.264)' },
  { mime: 'video/mp4', ext: 'mp4', label: 'MP4' },
  { mime: 'video/webm;codecs=vp9', ext: 'webm', label: 'WebM (VP9)' },
  { mime: 'video/webm;codecs=vp8', ext: 'webm', label: 'WebM (VP8)' },
  { mime: 'video/webm', ext: 'webm', label: 'WebM' },
]

/** Picks the best recording format this browser can really encode, preferring MP4. */
export function pickVideoFormat(): VideoFormat | null {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
    return null
  }
  return CANDIDATES.find(format => MediaRecorder.isTypeSupported(format.mime)) ?? null
}

export const VIDEO_DURATIONS = [6, 10, 15] as const
export type VideoDuration = (typeof VIDEO_DURATIONS)[number]

const W = 1080
const H = 1350
const FPS = 30

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp = (t: number) => Math.min(1, Math.max(0, t))

export interface ExportVideoOptions {
  style: StripStyle
  shots: Shot[]
  duration: VideoDuration
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

export interface ExportedVideo {
  blob: Blob
  ext: 'mp4' | 'webm'
  mime: string
}

export async function exportVideo({ style, shots, duration, onProgress, signal }: ExportVideoOptions): Promise<ExportedVideo> {
  const format = pickVideoFormat()
  if (!format) {
    throw new Error('This browser cannot record video. Your PNG download still works.')
  }
  await ensureFont(style.font)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create a drawing surface for the video.')

  const hasText = Boolean(style.caption.trim() || style.names.trim() || (style.showDate && style.date) || style.showBrand)
  const intro = hasText ? (duration === 6 ? 0.8 : 1.1) : 0
  const outro = duration === 6 ? 2.2 : 3
  const perShot = (duration - intro - outro) / shots.length

  // Pre-render the finished strip once, at the size it will appear in the final scene.
  const geo = geometry(style.layout)
  const fit = Math.min((W * 0.86) / geo.width, (H * 0.9) / geo.height)
  const strip = document.createElement('canvas')
  strip.width = Math.round(geo.width * fit)
  strip.height = Math.round(geo.height * fit)
  const stripCtx = strip.getContext('2d')
  if (!stripCtx) throw new Error('Could not prepare the final strip for the video.')
  drawStrip(stripCtx, style, shots, fit)

  const cellScale = Math.min(900 / geo.cellW, 860 / geo.cellH)
  const cellH = geo.cellH * cellScale

  function drawFrame(time: number) {
    drawBackground(ctx!, style.background, W, H)

    if (time < intro) {
      const t = ease(clamp(time / Math.min(0.6, intro)))
      ctx!.save()
      ctx!.globalAlpha = t
      ctx!.translate(0, (1 - t) * 24)
      ctx!.scale(1.9, 1.9)
      drawCaption(ctx!, style, W / 2 / 1.9, H / 2 / 1.9, (W - 160) / 1.9)
      ctx!.restore()
      return
    }

    const photoTime = time - intro
    const photosEnd = perShot * shots.length
    if (photoTime < photosEnd) {
      const index = Math.min(shots.length - 1, Math.floor(photoTime / perShot))
      const local = (photoTime - index * perShot) / perShot
      const enter = ease(clamp(local / 0.2))
      const zoom = 1 + 0.045 * local
      ctx!.save()
      ctx!.globalAlpha = enter
      ctx!.translate(W / 2, 600 + (1 - enter) * 36)
      ctx!.scale(cellScale * zoom, cellScale * zoom)
      ctx!.translate(-geo.cellW / 2, -geo.cellH / 2)
      drawCell(ctx!, style, shots[index], index, geo.cellW, geo.cellH)
      ctx!.restore()

      // Progress ticks, drawn in the strip's own ink so they stay on-palette.
      ctx!.save()
      ctx!.translate(W / 2, 600 + cellH / 2 + 70)
      ctx!.scale(1.5, 1.5)
      drawCaptionLine(ctx!, style, index, shots.length)
      ctx!.restore()
      return
    }

    const t = ease(clamp((time - intro - photosEnd) / 0.55))
    const scale = 0.94 + 0.06 * t
    ctx!.save()
    ctx!.globalAlpha = t
    ctx!.translate(W / 2, H / 2)
    ctx!.scale(scale, scale)
    ctx!.drawImage(strip, -strip.width / 2, -strip.height / 2)
    ctx!.restore()
  }

  const stream = canvas.captureStream(FPS)
  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: 6_000_000 })
  } catch (error) {
    stream.getTracks().forEach(track => track.stop())
    throw new Error(
      `The browser accepted ${format.label} but could not start recording: ${error instanceof Error ? error.message : 'unknown error'}.`,
    )
  }

  const chunks: Blob[] = []
  recorder.ondataavailable = event => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  return new Promise<ExportedVideo>((resolve, reject) => {
    let timer: ReturnType<typeof setInterval> | undefined
    let finished = false
    const start = performance.now()

    const cleanup = () => {
      clearInterval(timer)
      stream.getTracks().forEach(track => track.stop())
      signal?.removeEventListener('abort', onAbort)
    }
    const fail = (error: Error) => {
      if (finished) return
      finished = true
      cleanup()
      if (recorder.state !== 'inactive') {
        recorder.onstop = null
        try {
          recorder.stop()
        } catch {
          /* already stopped */
        }
      }
      reject(error)
    }
    const onAbort = () => fail(new DOMException('Video export cancelled.', 'AbortError'))
    signal?.addEventListener('abort', onAbort)

    recorder.onerror = () => fail(new Error('The browser stopped recording unexpectedly. Try again or use the PNG.'))
    recorder.onstop = () => {
      if (finished) return
      finished = true
      cleanup()
      const blob = new Blob(chunks, { type: format.ext === 'mp4' ? 'video/mp4' : 'video/webm' })
      if (blob.size === 0) reject(new Error('The recording came out empty. Try again or use the PNG.'))
      else {
        onProgress?.(1)
        resolve({ blob, ext: format.ext, mime: recorder.mimeType || format.mime })
      }
    }

    try {
      drawFrame(0)
      recorder.start(250)
    } catch (error) {
      fail(error instanceof Error ? error : new Error('Recording could not start.'))
      return
    }

    const tick = () => {
      if (finished) return
      const elapsed = (performance.now() - start) / 1000
      try {
        drawFrame(Math.min(elapsed, duration))
      } catch (error) {
        fail(error instanceof Error ? error : new Error('A frame could not be drawn.'))
        return
      }
      onProgress?.(Math.min(0.99, elapsed / duration))
      if (elapsed >= duration) {
        clearInterval(timer)
        if (recorder.state !== 'inactive') recorder.stop()
        return
      }
    }
    // A timer (not requestAnimationFrame) keeps recording even if the tab loses focus.
    timer = setInterval(tick, 1000 / FPS)
  })
}

/** Small "1 / 4" style progress dots under the photo, in the strip's text color. */
function drawCaptionLine(ctx: CanvasRenderingContext2D, style: StripStyle, index: number, count: number) {
  const dark = backgrounds.find(item => item.id === style.background)?.dark ?? false
  const color = dark ? '#FFF9F0' : '#242124'
  const gap = 20
  const start = -((count - 1) * gap) / 2
  for (let i = 0; i < count; i++) {
    ctx.beginPath()
    ctx.arc(start + i * gap, 0, i === index ? 6 : 4, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.globalAlpha = i === index ? 1 : 0.35
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
