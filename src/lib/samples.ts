import type { Shot } from './strip'

// Colors are pinned here so the illustrations keep their original look whatever the UI palette does.
const INK = '#17140f'
const COLORS = { coral: '#f2765c', cherry: '#c42b36', butter: '#f6d85f', lilac: '#c9b6ee' }

// Illustrated sample portraits for the marketing pages. They are drawings, not user photos,
// and they are always labelled as samples where they appear.

const palettes = [
  { bg: COLORS.lilac, skinA: '#f0c9a4', skinB: '#c98d62', hairA: INK, hairB: '#6b3a2a', topA: COLORS.coral, topB: COLORS.butter },
  { bg: COLORS.butter, skinA: '#e8b98f', skinB: '#f5d3b5', hairA: '#4a2c1d', hairB: INK, topA: COLORS.cherry, topB: COLORS.lilac },
  { bg: COLORS.coral, skinA: '#f5d3b5', skinB: '#a96c47', hairA: '#8a5a2b', hairB: INK, topA: INK, topB: '#fbf7ee' },
  { bg: '#bfe0d2', skinA: '#c98d62', skinB: '#f0c9a4', hairA: INK, hairB: '#a8431f', topA: COLORS.lilac, topB: COLORS.cherry },
]

type Gender = 'boy' | 'girl'

function person(ctx: CanvasRenderingContext2D, cx: number, base: number, size: number, skin: string, hair: string, top: string, tilt: number, gender: Gender) {
  ctx.save()
  ctx.translate(cx, base)
  ctx.rotate(tilt)
  ctx.lineWidth = Math.max(2, size * 0.03)
  ctx.strokeStyle = INK
  // long hair falls behind the shoulders for girls
  if (gender === 'girl') {
    ctx.fillStyle = hair
    ctx.beginPath()
    ctx.roundRect(-size * 0.36, -size * 1.0, size * 0.72, size * 0.62, size * 0.3)
    ctx.fill()
    ctx.stroke()
  }
  // shoulders
  ctx.fillStyle = top
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 0.62, size * 0.5, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // neck
  ctx.fillStyle = skin
  ctx.fillRect(-size * 0.09, -size * 0.52, size * 0.18, size * 0.2)
  // head
  ctx.beginPath()
  ctx.ellipse(0, -size * 0.78, size * 0.3, size * 0.36, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // hair
  ctx.fillStyle = hair
  ctx.beginPath()
  if (gender === 'girl') {
    // side-swept fringe plus a small bow
    ctx.ellipse(0, -size * 0.88, size * 0.33, size * 0.3, 0, Math.PI, 0)
    ctx.lineTo(size * 0.2, -size * 0.78)
    ctx.quadraticCurveTo(0, -size * 0.9, -size * 0.3, -size * 0.74)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#c42b36'
    ctx.beginPath()
    ctx.arc(size * 0.24, -size * 1.05, size * 0.06, 0, Math.PI * 2)
    ctx.arc(size * 0.36, -size * 1.05, size * 0.06, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.ellipse(0, -size * 0.92, size * 0.31, size * 0.24, 0, Math.PI, 0)
    ctx.fill()
    ctx.stroke()
  }
  // face
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.arc(-size * 0.1, -size * 0.78, size * 0.025, 0, Math.PI * 2)
  ctx.arc(size * 0.1, -size * 0.78, size * 0.025, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, -size * 0.72, size * 0.09, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
  ctx.restore()
}

// Strip order: boy+boy, girl+girl, boy+girl, boy+girl.
const PAIRS: [Gender, Gender][] = [
  ['boy', 'boy'],
  ['girl', 'girl'],
  ['boy', 'girl'],
  ['boy', 'girl'],
]

export function makeSampleFrame(index: number, mode: 'pair' | 'left' | 'right' = 'pair'): HTMLCanvasElement {
  const p = palettes[index % palettes.length]
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 480
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, 640, 480)
  // soft window light
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.fillRect(40 + index * 18, 0, 90, 480)
  const tilt = (index % 2 === 0 ? 1 : -1) * 0.05
  const [first, second] = PAIRS[index % PAIRS.length]
  if (mode === 'pair') {
    person(ctx, 215, 480, 300, p.skinA, first === 'girl' ? p.hairB : p.hairA, p.topA, -tilt, first)
    person(ctx, 420, 480, 300, p.skinB, second === 'girl' ? p.hairB : p.hairA, p.topB, tilt * 1.4, second)
  } else if (mode === 'left') {
    person(ctx, 320, 480, 380, p.skinA, p.hairA, p.topA, -tilt, 'boy')
  } else {
    person(ctx, 320, 480, 380, p.skinB, p.hairB, p.topB, tilt, 'girl')
  }
  return canvas
}

export function makeSampleShots(kind: 'pair' | 'distance' = 'pair'): Shot[] {
  return [0, 1, 2, 3].map(i =>
    kind === 'pair'
      ? { frames: [makeSampleFrame(i, 'pair')] }
      : { frames: [makeSampleFrame(i, 'left'), makeSampleFrame(i + 2, 'right')] },
  )
}
