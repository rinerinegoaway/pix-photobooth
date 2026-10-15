import type { Shot } from './strip'

// Illustrated sample portraits for the marketing pages: a chibi couple in soft pastel colors.
// They are drawings, not user photos, and they are always presented as illustrations. The real
// booth only ever uses real captured photos.

const BROWN = '#5B3B33' // soft outline
// Two coordinated looks in the same drawing style. Look 0 is the hero couple; look 1 has a different
// skin tone, hair and muted pastel outfits, for the other sample strips so the set feels varied.
interface Look {
  skin: string
  hairBoy: string
  hairGirl: string
  boyTop: string
  boyTrim: string
  girlTop: string
  girlTrim: string
}
const LOOKS: Look[] = [
  { skin: '#FFDCC6', hairBoy: '#2B2227', hairGirl: '#5A3A2F', boyTop: '#2E2B34', boyTrim: '#4A4552', girlTop: '#FFF3E4', girlTrim: '#E8CFB4' },
  { skin: '#E8B995', hairBoy: '#4A332B', hairGirl: '#2A2226', boyTop: '#DCCDB8', boyTrim: '#BFAE98', girlTop: '#EBCDD3', girlTrim: '#D4A9B1' },
]
let SKIN = LOOKS[0].skin
let HAIR_BOY = LOOKS[0].hairBoy
let HAIR_GIRL = LOOKS[0].hairGirl
let HOODIE = LOOKS[0].boyTop
let TOP = LOOKS[0].girlTop
let BOY_TRIM = LOOKS[0].boyTrim
let GIRL_TRIM = LOOKS[0].girlTrim

function applyLook(index: number) {
  const look = LOOKS[index % LOOKS.length]
  SKIN = look.skin
  HAIR_BOY = look.hairBoy
  HAIR_GIRL = look.hairGirl
  HOODIE = look.boyTop
  TOP = look.girlTop
  BOY_TRIM = look.boyTrim
  GIRL_TRIM = look.girlTrim
}
const BLUSH = 'rgba(244, 119, 139, 0.38)'

const BG = { pink: '#F6B1C1', yellow: '#F8DDBB', lavender: '#CDB9F0', mint: '#BFE4D8', sky: '#BBDDF4', rose: '#F6B1C1' }

type Eyes = 'open' | 'happy' | 'closed' | 'wink'
type Mouth = 'smile' | 'laugh' | 'kiss' | 'small'
type Hand = { kind: 'peace' | 'cheek' | 'point'; x: number; y: number; flip?: boolean }

interface Pose {
  eyes: Eyes
  mouth: Mouth
  hands?: Hand[]
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke = false, lw = 2) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.lineWidth = lw
    ctx.strokeStyle = BROWN
    ctx.stroke()
  }
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string, rot = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(size / 52, size / 52)
  ctx.beginPath()
  ctx.moveTo(0, 22)
  ctx.bezierCurveTo(-6, 16, -26, 4, -26, -10)
  ctx.bezierCurveTo(-26, -24, -8, -26, 0, -12)
  ctx.bezierCurveTo(8, -26, 26, -24, 26, -10)
  ctx.bezierCurveTo(26, 4, 6, 16, 0, 22)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.restore()
}

/** Eyes, blush and mouth, drawn around the head center (0, 0). */
function face(ctx: CanvasRenderingContext2D, s: number, eyes: Eyes, mouth: Mouth) {
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#2A1E22'
  ctx.fillStyle = '#2A1E22'
  const eye = (x: number, kind: Eyes) => {
    const y = 0.04 * s
    if (kind === 'open') {
      ctx.fillStyle = '#2A1E22'
      ctx.beginPath()
      ctx.ellipse(x, y, 0.052 * s, 0.078 * s, 0, 0, Math.PI * 2)
      ctx.fill()
      circle(ctx, x - 0.016 * s, y - 0.03 * s, 0.018 * s, '#fff')
    } else {
      ctx.lineWidth = 0.032 * s
      ctx.beginPath()
      if (kind === 'happy') ctx.arc(x, y + 0.045 * s, 0.075 * s, Math.PI * 1.12, Math.PI * 1.88)
      else ctx.arc(x, y - 0.03 * s, 0.075 * s, Math.PI * 0.12, Math.PI * 0.88)
      ctx.stroke()
    }
  }
  eye(-0.24 * s, eyes === 'wink' ? 'open' : eyes)
  eye(0.24 * s, eyes === 'wink' ? 'happy' : eyes)

  ctx.fillStyle = BLUSH
  for (const x of [-0.4 * s, 0.4 * s]) {
    ctx.beginPath()
    ctx.ellipse(x, 0.2 * s, 0.11 * s, 0.068 * s, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = '#2A1E22'
  ctx.lineWidth = 0.026 * s
  if (mouth === 'smile' || mouth === 'small') {
    const r = mouth === 'small' ? 0.06 * s : 0.1 * s
    ctx.beginPath()
    ctx.arc(0, 0.22 * s, r, Math.PI * 0.18, Math.PI * 0.82)
    ctx.stroke()
  } else if (mouth === 'laugh') {
    ctx.beginPath()
    ctx.moveTo(-0.13 * s, 0.24 * s)
    ctx.quadraticCurveTo(0, 0.52 * s, 0.13 * s, 0.24 * s)
    ctx.closePath()
    ctx.fillStyle = '#C94B63'
    ctx.fill()
    ctx.lineWidth = 0.02 * s
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(0, 0.36 * s, 0.055 * s, 0.03 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#F58EA0'
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.ellipse(0, 0.27 * s, 0.035 * s, 0.03 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#E56F86'
    ctx.fill()
  }
}

function hand(ctx: CanvasRenderingContext2D, s: number, h: Hand) {
  ctx.save()
  ctx.translate(h.x * s, h.y * s)
  if (h.flip) ctx.scale(-1, 1)
  ctx.lineWidth = 0.018 * s
  ctx.strokeStyle = BROWN
  ctx.fillStyle = SKIN
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const fill = () => {
    ctx.fill()
    ctx.stroke()
  }
  const finger = (x: number, angle: number, length: number, width: number) => {
    ctx.save()
    ctx.translate(x * s, 0)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.roundRect((-width / 2) * s, -length * s, width * s, length * s, (width / 2) * s)
    fill()
    ctx.restore()
  }

  if (h.kind === 'cheek') {
    // a soft rounded hand resting on the cheek: palm, thumb, and three finger creases
    ctx.beginPath()
    ctx.ellipse(0, 0, 0.19 * s, 0.16 * s, 0, 0, Math.PI * 2)
    fill()
    ctx.beginPath()
    ctx.moveTo(-0.07 * s, -0.15 * s)
    ctx.lineTo(-0.07 * s, -0.05 * s)
    ctx.moveTo(0, -0.16 * s)
    ctx.lineTo(0, -0.05 * s)
    ctx.moveTo(0.07 * s, -0.15 * s)
    ctx.lineTo(0.07 * s, -0.05 * s)
    ctx.stroke()
  } else if (h.kind === 'peace') {
    // two raised fingers, then a plain palm on top so the joins look clean
    finger(-0.065, -0.14, 0.38, 0.11)
    finger(0.075, 0.16, 0.38, 0.11)
    ctx.beginPath()
    ctx.ellipse(0, 0.07 * s, 0.19 * s, 0.15 * s, 0, 0, Math.PI * 2)
    fill()
    ctx.beginPath()
    ctx.moveTo(0.02 * s, 0.0)
    ctx.lineTo(0.03 * s, 0.07 * s)
    ctx.stroke()
  } else {
    // one pointing finger
    ctx.beginPath()
    ctx.roundRect(-0.5 * s, -0.055 * s, 0.5 * s, 0.11 * s, 0.055 * s)
    fill()
    ctx.beginPath()
    ctx.ellipse(0.02 * s, 0.02 * s, 0.14 * s, 0.13 * s, 0, 0, Math.PI * 2)
    fill()
  }
  ctx.restore()
}

/** The boy: fluffy dark hair, black hoodie. Head center at (cx, cy). */
function boy(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, pose: Pose) {
  ctx.save()
  ctx.translate(cx, cy)
  // hair behind the head
  ctx.fillStyle = HAIR_BOY
  ctx.beginPath()
  ctx.ellipse(0, -0.1 * s, 0.7 * s, 0.64 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  // hoodie
  ctx.fillStyle = HOODIE
  ctx.beginPath()
  ctx.ellipse(0, 1.15 * s, 1.08 * s, 0.75 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = BOY_TRIM
  ctx.lineWidth = 0.05 * s
  ctx.beginPath()
  ctx.ellipse(0, 0.62 * s, 0.5 * s, 0.2 * s, 0, 0.05 * Math.PI, 0.95 * Math.PI)
  ctx.stroke()
  ctx.strokeStyle = '#E8E1D6'
  ctx.lineWidth = 0.018 * s
  for (const x of [-0.13, 0.13]) {
    ctx.beginPath()
    ctx.moveTo(x * s, 0.78 * s)
    ctx.lineTo(x * s, 1.0 * s)
    ctx.stroke()
  }
  // neck, ears, head
  ctx.fillStyle = SKIN
  ctx.fillRect(-0.13 * s, 0.45 * s, 0.26 * s, 0.22 * s)
  circle(ctx, -0.62 * s, 0.04 * s, 0.09 * s, SKIN, true, 0.016 * s)
  circle(ctx, 0.62 * s, 0.04 * s, 0.09 * s, SKIN, true, 0.016 * s)
  ctx.beginPath()
  ctx.ellipse(0, 0, 0.63 * s, 0.58 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = SKIN
  ctx.fill()
  ctx.lineWidth = 0.018 * s
  ctx.strokeStyle = BROWN
  ctx.stroke()
  // fluffy fringe
  ctx.fillStyle = HAIR_BOY
  for (let i = -3; i <= 3; i++) circle(ctx, i * 0.17 * s, -0.4 * s + Math.abs(i) * 0.045 * s, 0.2 * s, HAIR_BOY)
  circle(ctx, -0.57 * s, -0.2 * s, 0.14 * s, HAIR_BOY)
  circle(ctx, 0.57 * s, -0.2 * s, 0.14 * s, HAIR_BOY)
  // a few extra tufts on top so it reads as fluffy
  for (const [x, y, r] of [[-0.36, -0.62, 0.17], [-0.12, -0.7, 0.18], [0.14, -0.68, 0.17], [0.38, -0.58, 0.16], [-0.6, -0.4, 0.13], [0.6, -0.38, 0.13]] as const) circle(ctx, x * s, y * s, r * s, HAIR_BOY)
  ctx.beginPath()
  ctx.ellipse(0, -0.45 * s, 0.6 * s, 0.22 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  face(ctx, s, pose.eyes, pose.mouth)
  for (const h of pose.hands ?? []) hand(ctx, s, h)
  ctx.restore()
}

/** The girl: long brown hair with a center part, cream top. Head center at (cx, cy). */
function girl(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, pose: Pose) {
  ctx.save()
  ctx.translate(cx, cy)
  // long hair behind
  ctx.fillStyle = HAIR_GIRL
  ctx.beginPath()
  ctx.moveTo(-0.68 * s, -0.1 * s)
  ctx.quadraticCurveTo(-0.9 * s, 0.7 * s, -0.7 * s, 1.25 * s)
  ctx.lineTo(0.7 * s, 1.25 * s)
  ctx.quadraticCurveTo(0.9 * s, 0.7 * s, 0.68 * s, -0.1 * s)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(0, -0.1 * s, 0.7 * s, 0.64 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  // top
  ctx.fillStyle = TOP
  ctx.beginPath()
  ctx.ellipse(0, 1.15 * s, 1.0 * s, 0.75 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = GIRL_TRIM
  ctx.lineWidth = 0.03 * s
  ctx.beginPath()
  ctx.moveTo(-0.3 * s, 0.62 * s)
  ctx.lineTo(0, 0.92 * s)
  ctx.lineTo(0.3 * s, 0.62 * s)
  ctx.stroke()
  // neck + head
  ctx.fillStyle = SKIN
  ctx.fillRect(-0.12 * s, 0.45 * s, 0.24 * s, 0.22 * s)
  ctx.beginPath()
  ctx.ellipse(0, 0, 0.62 * s, 0.58 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 0.018 * s
  ctx.strokeStyle = BROWN
  ctx.stroke()
  // bangs with a center part
  ctx.fillStyle = HAIR_GIRL
  for (const m of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(0, -0.6 * s)
    ctx.quadraticCurveTo(m * 0.62 * s, -0.5 * s, m * 0.64 * s, 0.08 * s)
    ctx.quadraticCurveTo(m * 0.42 * s, -0.22 * s, 0, -0.26 * s)
    ctx.closePath()
    ctx.fill()
  }
  face(ctx, s, pose.eyes, pose.mouth)
  // front locks fall over the shoulders
  ctx.fillStyle = HAIR_GIRL
  for (const m of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(m * 0.6 * s, -0.05 * s)
    ctx.quadraticCurveTo(m * 0.82 * s, 0.55 * s, m * 0.58 * s, 1.05 * s)
    ctx.quadraticCurveTo(m * 0.44 * s, 0.55 * s, m * 0.5 * s, 0.12 * s)
    ctx.closePath()
    ctx.fill()
  }
  for (const h of pose.hands ?? []) hand(ctx, s, h)
  ctx.restore()
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill = '#fff') {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x + r * 0.12, y - r * 0.12, x + r, y)
  ctx.quadraticCurveTo(x + r * 0.12, y + r * 0.12, x, y + r)
  ctx.quadraticCurveTo(x - r * 0.12, y + r * 0.12, x - r, y)
  ctx.quadraticCurveTo(x - r * 0.12, y - r * 0.12, x, y - r)
  ctx.fillStyle = fill
  ctx.fill()
}

function canvasWith(bg: string): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 480
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 640, 480)
    // soft light band
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.fillRect(0, 0, 640, 150)
  }
  return { canvas, ctx }
}

// Four couple poses, in strip order.
const POSES: { bg: string; draw: (ctx: CanvasRenderingContext2D) => void }[] = [
  {
    // smiling, with a wink and a peace sign
    bg: BG.pink,
    draw: ctx => {
      boy(ctx, 215, 215, 150, { eyes: 'open', mouth: 'smile' })
      girl(ctx, 430, 245, 136, { eyes: 'wink', mouth: 'laugh', hands: [{ kind: 'peace', x: 0.74, y: 0.72 }] })
      heart(ctx, 565, 90, 44, '#fff')
      sparkle(ctx, 70, 80, 16)
    },
  },
  {
    // beaming, hands on cheeks
    bg: BG.yellow,
    draw: ctx => {
      boy(ctx, 215, 215, 150, { eyes: 'happy', mouth: 'laugh' })
      girl(ctx, 430, 245, 136, { eyes: 'happy', mouth: 'laugh', hands: [{ kind: 'cheek', x: -0.62, y: 0.42 }, { kind: 'cheek', x: 0.62, y: 0.42 }] })
      heart(ctx, 560, 80, 40, '#F4778B', 0.2)
      heart(ctx, 595, 130, 26, '#FFB3C3', -0.2)
    },
  },
  {
    // a playful poke on the cheek
    bg: BG.lavender,
    draw: ctx => {
      boy(ctx, 225, 215, 150, { eyes: 'happy', mouth: 'laugh', hands: [{ kind: 'point', x: 0.78, y: 0.42 }] })
      girl(ctx, 440, 245, 136, { eyes: 'happy', mouth: 'laugh', hands: [{ kind: 'cheek', x: 0.62, y: 0.42 }] })
      heart(ctx, 560, 85, 36, '#fff', 0.2)
      sparkle(ctx, 80, 95, 14)
    },
  },
  {
    // a kiss on the cheek
    bg: BG.mint,
    draw: ctx => {
      boy(ctx, 285, 220, 150, { eyes: 'closed', mouth: 'kiss' })
      girl(ctx, 450, 245, 136, { eyes: 'wink', mouth: 'smile' })
      heart(ctx, 565, 80, 40, '#F4778B', 0.15)
      heart(ctx, 100, 100, 28, '#FFB3C3', -0.2)
    },
  },
]

export function makeSampleFrame(index: number, mode: 'pair' | 'left' | 'right' = 'pair', look = 0): HTMLCanvasElement {
  applyLook(look)
  if (mode === 'left') {
    // "You": the boy with a peace sign on a powder-blue backdrop
    const { canvas, ctx } = canvasWith(BG.sky)
    if (ctx) {
      boy(ctx, 320, 235, 190, { eyes: 'open', mouth: 'smile', hands: [{ kind: 'peace', x: 0.86, y: 0.62 }] })
      sparkle(ctx, 90, 90, 14)
      heart(ctx, 560, 80, 34, '#fff', 0.2)
    }
    return canvas
  }
  if (mode === 'right') {
    // "Your person": the girl with her hands on her cheeks on a pink backdrop
    const { canvas, ctx } = canvasWith(BG.rose)
    if (ctx) {
      girl(ctx, 320, 255, 180, { eyes: 'happy', mouth: 'smile', hands: [{ kind: 'cheek', x: -0.66, y: 0.46 }, { kind: 'cheek', x: 0.66, y: 0.46 }] })
      heart(ctx, 95, 95, 34, '#fff', -0.2)
      sparkle(ctx, 560, 90, 14)
    }
    return canvas
  }
  const pose = POSES[index % POSES.length]
  const { canvas, ctx } = canvasWith(pose.bg)
  if (ctx) pose.draw(ctx)
  return canvas
}

export function makeSampleShots(kind: 'pair' | 'distance' = 'pair', look = 0): Shot[] {
  return [0, 1, 2, 3].map(i =>
    kind === 'pair'
      ? { frames: [makeSampleFrame(i, 'pair', look)] }
      : { frames: [makeSampleFrame(i, 'left', look), makeSampleFrame(i, 'right', look)] },
  )
}
