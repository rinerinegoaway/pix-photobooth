import { describe, expect, test } from 'bun:test'
import { clampCenter, hitTest, MAX_STICKER_W, MIN_STICKER_W, resizeFromCorner, rotationFromHandle } from '../src/lib/stickerGeometry.ts'
import type { PlacedSticker } from '../src/lib/stickerGeometry.ts'

const W = 600
const H = 1800
const base: PlacedSticker = { id: 'a', kind: 'flower', x: 0.5, y: 0.5, w: 0.3, rot: 0 }

describe('sticker geometry', () => {
  test('hit testing follows the sticker size and position', () => {
    // 0.3 * 600 = 180 units wide, square (aspect 1), centered at (300, 900)
    expect(hitTest(base, 300, 900, W, H, 1)).toBe(true)
    expect(hitTest(base, 380, 980, W, H, 1)).toBe(true)
    expect(hitTest(base, 400, 900, W, H, 1)).toBe(false)
    expect(hitTest(base, 300, 1100, W, H, 1)).toBe(false)
  })

  test('hit testing accounts for rotation', () => {
    const wide: PlacedSticker = { ...base, w: 0.5 } // 300 x 150 at aspect 0.5
    expect(hitTest(wide, 300 + 140, 900, W, H, 0.5)).toBe(true) // inside the wide end
    expect(hitTest(wide, 300, 900 + 100, W, H, 0.5)).toBe(false) // above/below is outside
    const turned: PlacedSticker = { ...wide, rot: Math.PI / 2 }
    expect(hitTest(turned, 300 + 140, 900, W, H, 0.5)).toBe(false) // now the narrow side
    expect(hitTest(turned, 300, 900 + 140, W, H, 0.5)).toBe(true) // the wide end points down
  })

  test('dragging the corner handle resizes, clamped to sensible limits', () => {
    // The corner of a 180 x 180 square is 180 * sqrt(2) / 2 ≈ 127.3 from the center.
    const corner = 300 + 90
    const same = resizeFromCorner(base, corner, 900 + 90, W, H, 1)
    expect(same).toBeCloseTo(0.3, 3)
    expect(resizeFromCorner(base, 300 + 180, 900 + 180, W, H, 1)).toBeCloseTo(0.6, 3)
    expect(resizeFromCorner(base, 301, 901, W, H, 1)).toBe(MIN_STICKER_W)
    expect(resizeFromCorner(base, 5000, 5000, W, H, 1)).toBe(MAX_STICKER_W)
  })

  test('rotating by the top handle gives zero when straight above the center', () => {
    expect(rotationFromHandle(base, 300, 900 - 150, W, H)).toBeCloseTo(0, 5)
    expect(rotationFromHandle(base, 300 + 150, 900, W, H)).toBeCloseTo(Math.PI / 2, 5)
  })

  test('centers stay inside the strip', () => {
    expect(clampCenter(-2, 3)).toEqual({ x: 0, y: 1 })
    expect(clampCenter(0.4, 0.6)).toEqual({ x: 0.4, y: 0.6 })
  })
})
