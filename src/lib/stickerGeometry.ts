// Pure geometry for placed stickers. Positions are stored as fractions of the strip so they survive
// layout changes and render identically in the preview, the PNG and the video.

export interface PlacedSticker {
  id: string
  kind: string
  /** Center, as a fraction of the strip's width / height (0..1). */
  x: number
  y: number
  /** Width as a fraction of the strip's width. */
  w: number
  /** Rotation in radians. */
  rot: number
}

export const MIN_STICKER_W = 0.07
export const MAX_STICKER_W = 0.9

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Sticker size in strip design units. `aspect` is image height / width. */
export function stickerBox(sticker: PlacedSticker, stripW: number, aspect: number) {
  const w = sticker.w * stripW
  return { w, h: w * aspect }
}

/** True when the point (in strip design units) lies inside the rotated sticker. */
export function hitTest(sticker: PlacedSticker, px: number, py: number, stripW: number, stripH: number, aspect: number): boolean {
  const { w, h } = stickerBox(sticker, stripW, aspect)
  const dx = px - sticker.x * stripW
  const dy = py - sticker.y * stripH
  const cos = Math.cos(-sticker.rot)
  const sin = Math.sin(-sticker.rot)
  const lx = dx * cos - dy * sin
  const ly = dx * sin + dy * cos
  return Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2
}

/** New width fraction when dragging the corner handle to a point (design units). */
export function resizeFromCorner(sticker: PlacedSticker, px: number, py: number, stripW: number, stripH: number, aspect: number): number {
  const dist = Math.hypot(px - sticker.x * stripW, py - sticker.y * stripH)
  // The corner sits at distance w * sqrt(1 + aspect^2) / 2 from the center.
  const w = (2 * dist) / Math.sqrt(1 + aspect * aspect)
  return clamp(w / stripW, MIN_STICKER_W, MAX_STICKER_W)
}

/** Rotation (radians) for a handle that sits straight above the sticker's center. */
export function rotationFromHandle(sticker: PlacedSticker, px: number, py: number, stripW: number, stripH: number): number {
  return Math.atan2(py - sticker.y * stripH, px - sticker.x * stripW) + Math.PI / 2
}

/** Keeps the sticker's center inside the strip so it can always be grabbed again. */
export function clampCenter(x: number, y: number): { x: number; y: number } {
  return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) }
}
