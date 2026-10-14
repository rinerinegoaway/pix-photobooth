import type { Surface } from './strip'

const MAX_CAPTURE_WIDTH = 1280

/** Copies the current video frame into a canvas. Returns null while the video has no frame yet. */
export function grabFrame(video: HTMLVideoElement, mirror: boolean): HTMLCanvasElement | null {
  const sourceW = video.videoWidth
  const sourceH = video.videoHeight
  if (!sourceW || !sourceH || video.readyState < 2) return null
  const scale = Math.min(1, MAX_CAPTURE_WIDTH / sourceW)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sourceW * scale)
  canvas.height = Math.round(sourceH * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  if (mirror) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas
}

export function surfaceToBlob(surface: Surface, quality = 0.88): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = surface.width
  canvas.height = surface.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('Could not prepare the photo.'))
  ctx.drawImage(surface, 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not encode the photo.'))), 'image/jpeg', quality)
  })
}

export async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Could not read the photo from your partner.')
  }
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return canvas
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}
