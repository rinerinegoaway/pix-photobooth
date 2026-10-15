import airplaneUrl from '../assets/stickers/airplane.svg?url'
import flowerUrl from '../assets/stickers/flower.svg?url'
import heartUrl from '../assets/stickers/heart.svg?url'
import rainbowUrl from '../assets/stickers/rainbow.svg?url'
import smileUrl from '../assets/stickers/smile.svg?url'
import sparkleUrl from '../assets/stickers/sparkle.svg?url'
import { stickerBox } from './stickerGeometry'
import type { PlacedSticker } from './stickerGeometry'

export type { PlacedSticker } from './stickerGeometry'

export interface StickerDef {
  id: string
  name: string
  url: string
  /** Image height / width, from each SVG's viewBox. */
  aspect: number
}

export const stickerCatalog: StickerDef[] = [
  { id: 'rainbow', name: 'Rainbow', url: rainbowUrl, aspect: 92 / 112 },
  { id: 'airplane', name: 'Airplane', url: airplaneUrl, aspect: 92 / 132 },
  { id: 'flower', name: 'Flower', url: flowerUrl, aspect: 1 },
  { id: 'heart', name: 'Heart', url: heartUrl, aspect: 108 / 112 },
  { id: 'sparkle', name: 'Sparkle', url: sparkleUrl, aspect: 1 },
  { id: 'smile', name: 'Smile', url: smileUrl, aspect: 1 },
]

export function stickerDef(kind: string): StickerDef | undefined {
  return stickerCatalog.find(item => item.id === kind)
}

const images = new Map<string, HTMLImageElement>()
const loading = new Map<string, Promise<void>>()

function loadOne(def: StickerDef): Promise<void> {
  const existing = loading.get(def.id)
  if (existing) return existing
  const promise = new Promise<void>(resolve => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      images.set(def.id, image)
      resolve()
    }
    // A missing sticker is skipped rather than breaking the whole export.
    image.onerror = () => resolve()
    image.src = def.url
  })
  loading.set(def.id, promise)
  return promise
}

/** Resolves once the artwork for these stickers is decoded, so drawing them is synchronous. */
export async function ensureStickers(kinds: string[]): Promise<void> {
  const defs = [...new Set(kinds)].map(stickerDef).filter((def): def is StickerDef => Boolean(def))
  await Promise.all(defs.map(loadOne))
}

/** Draws all placed stickers on top of an already drawn strip (design units, scaled by the caller). */
export function drawPlacedStickers(ctx: CanvasRenderingContext2D, placed: PlacedSticker[], stripW: number, stripH: number) {
  for (const sticker of placed) {
    const def = stickerDef(sticker.kind)
    const image = images.get(sticker.kind)
    if (!def || !image) continue
    const { w, h } = stickerBox(sticker, stripW, def.aspect)
    ctx.save()
    ctx.translate(sticker.x * stripW, sticker.y * stripH)
    ctx.rotate(sticker.rot)
    // Soft shadow, drawn with the sticker so it appears in exports too.
    ctx.shadowColor = 'rgba(40, 38, 41, 0.22)'
    ctx.shadowBlur = Math.max(3, w * 0.05)
    ctx.shadowOffsetY = Math.max(1, w * 0.02)
    ctx.drawImage(image, -w / 2, -h / 2, w, h)
    ctx.restore()
  }
}

let counter = 0
export function newSticker(kind: string): PlacedSticker {
  counter++
  // Spread new stickers around so several don't land exactly on top of each other.
  const angle = counter * 2.4
  return {
    id: `${Date.now().toString(36)}-${counter}`,
    kind,
    x: 0.5 + Math.cos(angle) * 0.18,
    y: 0.4 + Math.sin(angle) * 0.18,
    w: 0.3,
    rot: ((counter % 5) - 2) * 0.08,
  }
}
