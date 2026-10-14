// Strip design data and the canvas renderer. One renderer powers the live preview,
// the PNG export and the video export, so they cannot drift apart.
// Nothing here draws a ". PIX" signature: keepsakes are clean unless the user adds text.

export type LayoutId = 'classic' | 'grid' | 'card'
export type FrameId = 'clean' | 'film' | 'soft' | 'taped'
export type BackgroundId = 'ivory' | 'speckle' | 'butter' | 'blush' | 'coral' | 'white' | 'charcoal'
export type StickerId = 'hearts' | 'sparkles' | 'flowers' | 'smiles' | 'cherries'
export type FontId = 'clean' | 'italic' | 'hand' | 'bold'
export type TextColorId = 'auto' | 'ink' | 'cream' | 'coral'

export type Surface = HTMLCanvasElement | ImageBitmap

/** One captured moment: a single frame, or two frames (mine, theirs) for a shared booth. */
export interface Shot {
  frames: Surface[]
}

export interface Arrangement {
  orientation: 'side' | 'stacked'
  /** When true the local participant's frame is drawn first (left / top). */
  mineFirst: boolean
}

export interface StripStyle {
  layout: LayoutId
  frame: FrameId
  background: BackgroundId
  stickers: StickerId[]
  caption: string
  names: string
  font: FontId
  textColor: TextColorId
  showDate: boolean
  date: string
  /** Optional small ". PIX" tag. Off by default: keepsakes stay unbranded unless the user opts in. */
  showBrand: boolean
  arrangement: Arrangement
}

export const INK = '#242124'
export const CREAM = '#FFF9F0'
export const COLORS = {
  ink: INK,
  cream: CREAM,
  coral: '#FF5576',
  butter: '#F7E8A4',
  blush: '#FFE3E8',
  white: '#FFFFFF',
}

export const layouts: { id: LayoutId; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic strip', description: 'Four photos, stacked' },
  { id: 'grid', name: '2 × 2 grid', description: 'A small collage' },
  { id: 'card', name: 'Photo card', description: 'Wide margins, room for words' },
]

export const frames: { id: FrameId; name: string; description: string }[] = [
  { id: 'clean', name: 'Clean white', description: 'Slim white border' },
  { id: 'film', name: 'Film edge', description: 'Numbered frames' },
  { id: 'soft', name: 'Soft corners', description: 'Rounded and friendly' },
  { id: 'taped', name: 'Taped print', description: 'Tilted, with washi tape' },
]

export const backgrounds: { id: BackgroundId; name: string; color: string; dark: boolean }[] = [
  { id: 'ivory', name: 'Ivory', color: CREAM, dark: false },
  { id: 'speckle', name: 'Speckled paper', color: CREAM, dark: false },
  { id: 'butter', name: 'Butter', color: COLORS.butter, dark: false },
  { id: 'blush', name: 'Blush', color: COLORS.blush, dark: false },
  { id: 'coral', name: 'Coral', color: COLORS.coral, dark: false },
  { id: 'white', name: 'White', color: COLORS.white, dark: false },
  { id: 'charcoal', name: 'Charcoal', color: INK, dark: true },
]

export const stickers: { id: StickerId; name: string }[] = [
  { id: 'hearts', name: 'Hearts' },
  { id: 'sparkles', name: 'Sparkles' },
  { id: 'flowers', name: 'Flowers' },
  { id: 'smiles', name: 'Smiles' },
  { id: 'cherries', name: 'Cherries' },
]

export const textColors: { id: TextColorId; name: string; color: string | null }[] = [
  { id: 'auto', name: 'Auto', color: null },
  { id: 'ink', name: 'Charcoal', color: INK },
  { id: 'cream', name: 'Ivory', color: CREAM },
  { id: 'coral', name: 'Coral', color: '#E8325A' },
]

// Caption fonts stay inside the site's two families: Nunito and Caveat.
export const fonts: {
  id: FontId
  name: string
  family: string
  weight: number
  style: 'normal' | 'italic'
  scale: number
  sample: string
}[] = [
  { id: 'clean', name: 'Clean', family: '"Nunito", system-ui, sans-serif', weight: 800, style: 'normal', scale: 1, sample: 'Aa' },
  { id: 'italic', name: 'Soft italic', family: '"Nunito", system-ui, sans-serif', weight: 700, style: 'italic', scale: 1, sample: 'Aa' },
  { id: 'hand', name: 'Handwritten', family: '"Caveat", "Segoe Script", cursive', weight: 600, style: 'normal', scale: 1.4, sample: 'Aa' },
  { id: 'bold', name: 'Bold caps', family: '"Nunito", system-ui, sans-serif', weight: 900, style: 'normal', scale: 0.72, sample: 'AA' },
]

export const defaultStyle = (): StripStyle => ({
  layout: 'classic',
  frame: 'clean',
  background: 'ivory',
  stickers: ['hearts'],
  caption: 'a little closer',
  names: '',
  font: 'hand',
  textColor: 'auto',
  showDate: true,
  date: formatDate(new Date()),
  showBrand: false,
  arrangement: { orientation: 'side', mineFirst: true },
})

export function formatDate(date: Date): string {
  return date
    .toLocaleDateString('en', { year: 'numeric', month: 'short', day: '2-digit' })
    .toUpperCase()
}

// ---------- font loading ----------

/** Resolves once the caption font is ready (or after a short timeout so exports never hang). */
export async function ensureFont(fontId: FontId): Promise<void> {
  const font = fonts.find(item => item.id === fontId)
  if (!font || !('fonts' in document)) return
  const spec = `${font.style === 'italic' ? 'italic ' : ''}${font.weight} 40px ${font.family}`
  const attempt = Promise.all([document.fonts.load(spec, 'Aa'), document.fonts.load('600 20px "Nunito"', 'Aa')]).then(() => undefined)
  const timeout = new Promise<void>(resolve => setTimeout(resolve, 2500))
  await Promise.race([attempt, timeout])
}

// ---------- geometry ----------

interface Geometry {
  width: number
  height: number
  cellW: number
  cellH: number
  cells: { x: number; y: number }[]
  /** Y of the caption block's vertical center. */
  textY: number
  cardBorder: boolean
}

export function geometry(layout: LayoutId): Geometry {
  if (layout === 'classic') {
    const padding = 40
    const cellW = 520
    const cellH = 390
    const gap = 22
    const footer = 190
    const cells = [0, 1, 2, 3].map(i => ({ x: padding, y: padding + i * (cellH + gap) }))
    const height = padding + 4 * cellH + 3 * gap + footer
    return { width: cellW + padding * 2, height, cellW, cellH, cells, textY: height - footer / 2 - 6, cardBorder: false }
  }
  if (layout === 'grid') {
    const padding = 40
    const cellW = 320
    const cellH = 320
    const gap = 22
    const footer = 190
    const cells = [0, 1, 2, 3].map(i => ({
      x: padding + (i % 2) * (cellW + gap),
      y: padding + Math.floor(i / 2) * (cellH + gap),
    }))
    const height = padding + 2 * cellH + gap + footer
    return { width: padding * 2 + cellW * 2 + gap, height, cellW, cellH, cells, textY: height - footer / 2 - 6, cardBorder: false }
  }
  const padding = 64
  const cellW = 300
  const cellH = 300
  const gap = 28
  const footer = 240
  const cells = [0, 1, 2, 3].map(i => ({
    x: padding + (i % 2) * (cellW + gap),
    y: padding + Math.floor(i / 2) * (cellH + gap),
  }))
  const height = padding + 2 * cellH + gap + footer
  return { width: padding * 2 + cellW * 2 + gap, height, cellW, cellH, cells, textY: height - footer / 2 - 2, cardBorder: true }
}

export function stripAspect(layout: LayoutId): number {
  const { width, height } = geometry(layout)
  return width / height
}

// ---------- drawing primitives ----------

function surfaceSize(surface: Surface): { w: number; h: number } {
  return { w: surface.width, h: surface.height }
}

function drawCover(ctx: CanvasRenderingContext2D, surface: Surface, x: number, y: number, w: number, h: number) {
  const { w: sw, h: sh } = surfaceSize(surface)
  if (!sw || !sh) return
  const scale = Math.max(w / sw, h / sh)
  const cw = w / scale
  const ch = h / scale
  ctx.drawImage(surface, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h)
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function heartPath(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath()
  ctx.moveTo(0, s * 0.38)
  ctx.bezierCurveTo(-s * 0.1, s * 0.3, -s * 0.5, s * 0.05, -s * 0.5, -s * 0.18)
  ctx.bezierCurveTo(-s * 0.5, -s * 0.45, -s * 0.08, -s * 0.5, 0, -s * 0.22)
  ctx.bezierCurveTo(s * 0.08, -s * 0.5, s * 0.5, -s * 0.45, s * 0.5, -s * 0.18)
  ctx.bezierCurveTo(s * 0.5, s * 0.05, s * 0.1, s * 0.3, 0, s * 0.38)
  ctx.closePath()
}

function sparklePath(ctx: CanvasRenderingContext2D, s: number) {
  const r = s * 0.5
  const k = s * 0.12
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.quadraticCurveTo(k, -k, r, 0)
  ctx.quadraticCurveTo(k, k, 0, r)
  ctx.quadraticCurveTo(-k, k, -r, 0)
  ctx.quadraticCurveTo(-k, -k, 0, -r)
  ctx.closePath()
}

/** Sticker look: colored shape with a white die-cut border. */
function outlined(ctx: CanvasRenderingContext2D, fill: string, width: number) {
  ctx.lineJoin = 'round'
  ctx.lineWidth = width * 2.6
  ctx.strokeStyle = COLORS.white
  ctx.stroke()
  ctx.fillStyle = fill
  ctx.fill()
}

function drawSticker(ctx: CanvasRenderingContext2D, id: StickerId, x: number, y: number, size: number, angle: number) {
  const line = Math.max(2, size * 0.04)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  switch (id) {
    case 'hearts':
      heartPath(ctx, size)
      outlined(ctx, COLORS.coral, line)
      break
    case 'sparkles':
      sparklePath(ctx, size)
      outlined(ctx, COLORS.butter, line)
      break
    case 'flowers': {
      const petal = size * 0.24
      for (let i = 0; i < 5; i++) {
        ctx.save()
        ctx.rotate((i * Math.PI * 2) / 5)
        ctx.beginPath()
        ctx.ellipse(0, -size * 0.27, petal, petal * 1.15, 0, 0, Math.PI * 2)
        outlined(ctx, COLORS.blush, line)
        ctx.restore()
      }
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.17, 0, Math.PI * 2)
      outlined(ctx, COLORS.butter, line)
      break
    }
    case 'smiles':
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2)
      outlined(ctx, COLORS.butter, line)
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.arc(-size * 0.16, -size * 0.08, size * 0.055, 0, Math.PI * 2)
      ctx.arc(size * 0.16, -size * 0.08, size * 0.055, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, size * 0.02, size * 0.24, 0.15 * Math.PI, 0.85 * Math.PI)
      ctx.lineWidth = line
      ctx.lineCap = 'round'
      ctx.stroke()
      break
    case 'cherries': {
      ctx.lineWidth = line * 1.4
      ctx.strokeStyle = INK
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-size * 0.22, size * 0.14)
      ctx.quadraticCurveTo(-size * 0.1, -size * 0.3, size * 0.12, -size * 0.45)
      ctx.moveTo(size * 0.2, size * 0.2)
      ctx.quadraticCurveTo(size * 0.2, -size * 0.2, size * 0.12, -size * 0.45)
      ctx.stroke()
      for (const dx of [-0.22, 0.2]) {
        ctx.beginPath()
        ctx.arc(size * dx, size * 0.22, size * 0.21, 0, Math.PI * 2)
        outlined(ctx, COLORS.coral, line)
      }
      break
    }
  }
  ctx.restore()
}

// ---------- backgrounds ----------

export function drawBackground(ctx: CanvasRenderingContext2D, id: BackgroundId, w: number, h: number) {
  const bg = backgrounds.find(item => item.id === id) ?? backgrounds[0]
  ctx.fillStyle = bg.color
  ctx.fillRect(0, 0, w, h)
  if (id === 'speckle') {
    // Deterministic speckles so preview, PNG and video always match.
    let seed = 7
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    const count = Math.round((w * h) / 1400)
    for (let i = 0; i < count; i++) {
      const x = rand() * w
      const y = rand() * h
      const r = 0.5 + rand() * 1.3
      const tint = rand()
      ctx.fillStyle =
        tint > 0.93 ? 'rgba(255, 85, 118, 0.4)' : tint > 0.86 ? 'rgba(247, 232, 164, 0.9)' : 'rgba(36, 33, 36, 0.14)'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function resolveTextColor(style: StripStyle): string {
  const chosen = textColors.find(item => item.id === style.textColor)?.color
  if (chosen) return chosen
  return (backgrounds.find(item => item.id === style.background)?.dark ?? false) ? CREAM : INK
}

function isDark(style: StripStyle): boolean {
  return backgrounds.find(item => item.id === style.background)?.dark ?? false
}

// ---------- photo cell ----------

/** Draws the photo area of a shot (one or two frames) into the rectangle. */
export function drawShotImage(
  ctx: CanvasRenderingContext2D,
  shot: Shot,
  arrangement: Arrangement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (shot.frames.length < 2) {
    drawCover(ctx, shot.frames[0], x, y, w, h)
    return
  }
  const [mine, theirs] = shot.frames
  const first = arrangement.mineFirst ? mine : theirs
  const second = arrangement.mineFirst ? theirs : mine
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  if (arrangement.orientation === 'side') {
    drawCover(ctx, first, x, y, w / 2, h)
    drawCover(ctx, second, x + w / 2, y, w / 2, h)
    ctx.fillStyle = COLORS.white
    ctx.fillRect(x + w / 2 - 1.5, y, 3, h)
  } else {
    drawCover(ctx, first, x, y, w, h / 2)
    drawCover(ctx, second, x, y + h / 2, w, h / 2)
    ctx.fillStyle = COLORS.white
    ctx.fillRect(x, y + h / 2 - 1.5, w, 3)
  }
  ctx.restore()
}

const ANCHORS: [number, number, number][] = [
  [0.1, 0.12, -0.35],
  [0.9, 0.9, 0.3],
  [0.9, 0.12, 0.4],
  [0.1, 0.9, -0.25],
]

/**
 * Draws one framed cell with its local origin at (0, 0) and size (w, h).
 * Callers translate/scale the context, which lets the video exporter reuse this at any size.
 */
export function drawCell(
  ctx: CanvasRenderingContext2D,
  style: StripStyle,
  shot: Shot | null,
  index: number,
  w: number,
  h: number,
) {
  const dark = isDark(style)
  ctx.save()

  if (style.frame === 'taped') {
    ctx.translate(w / 2, h / 2)
    ctx.rotate(((index % 2 === 0 ? -1 : 1) * 1.4 * Math.PI) / 180)
    ctx.translate(-w / 2, -h / 2)
  }

  // Every frame is a white print; the style decides border, corners and details.
  const inset = style.frame === 'clean' ? 8 : 12
  const bottom = style.frame === 'film' ? 32 : style.frame === 'taped' ? 28 : inset
  const radius = style.frame === 'soft' ? 26 : style.frame === 'clean' ? 6 : 4

  ctx.save()
  if (!dark) {
    ctx.shadowColor = 'rgba(36, 33, 36, 0.22)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 4
  }
  ctx.fillStyle = COLORS.white
  roundedRect(ctx, 0, 0, w, h, radius)
  ctx.fill()
  ctx.restore()

  const px = inset
  const py = inset
  const pw = w - inset * 2
  const ph = h - inset - bottom

  ctx.save()
  roundedRect(ctx, px, py, pw, ph, Math.max(0, radius - 3))
  ctx.clip()
  if (shot) {
    drawShotImage(ctx, shot, style.arrangement, px, py, pw, ph)
  } else {
    ctx.fillStyle = COLORS.blush
    ctx.fillRect(px, py, pw, ph)
    ctx.fillStyle = 'rgba(36, 33, 36, 0.3)'
    ctx.font = `800 ${Math.round(Math.min(pw, ph) * 0.22)}px "Nunito", system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(index + 1), w / 2, py + ph / 2)
  }
  ctx.restore()

  if (style.frame === 'film') {
    ctx.fillStyle = INK
    ctx.font = '700 12px "Nunito", system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(`FRAME ${String(index + 1).padStart(2, '0')}`, px, h - bottom / 2 - 1)
    ctx.textAlign = 'right'
    ctx.fillStyle = COLORS.coral
    ctx.fillText(`${index + 1}A`, w - px, h - bottom / 2 - 1)
  }

  if (style.frame === 'taped') {
    ctx.fillStyle = index % 2 === 0 ? 'rgba(247, 232, 164, 0.92)' : 'rgba(255, 85, 118, 0.55)'
    for (const [tx, angle] of [
      [w * 0.14, -0.5],
      [w * 0.86, 0.5],
    ] as const) {
      ctx.save()
      ctx.translate(tx, 4)
      ctx.rotate(angle)
      ctx.fillRect(-34, -11, 68, 22)
      ctx.restore()
    }
  }

  // Stickers sit on top of the cell, spread over the corners.
  const size = Math.min(w, h) * 0.2
  style.stickers.forEach((id, i) => {
    const [ax, ay, angle] = ANCHORS[(i + index) % ANCHORS.length]
    drawSticker(ctx, id, w * ax, h * ay, size, angle)
  })

  ctx.restore()
}

// ---------- full strip ----------

export function drawStrip(
  ctx: CanvasRenderingContext2D,
  style: StripStyle,
  shots: (Shot | null)[],
  scale: number,
) {
  const geo = geometry(style.layout)
  ctx.save()
  ctx.scale(scale, scale)
  drawBackground(ctx, style.background, geo.width, geo.height)

  if (geo.cardBorder) {
    ctx.strokeStyle = isDark(style) ? 'rgba(255, 249, 240, 0.6)' : 'rgba(36, 33, 36, 0.35)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([2, 6])
    ctx.lineCap = 'round'
    roundedRect(ctx, 20.5, 20.5, geo.width - 41, geo.height - 41, 18)
    ctx.stroke()
    ctx.setLineDash([])
  }

  geo.cells.forEach((cell, index) => {
    ctx.save()
    ctx.translate(cell.x, cell.y)
    drawCell(ctx, style, shots[index] ?? null, index, geo.cellW, geo.cellH)
    ctx.restore()
  })

  drawCaption(ctx, style, geo.width / 2, geo.textY, geo.width - 110)
  ctx.restore()
}

/** Caption, optional names, optional date, centered on (cx, cy). Only user-provided text is drawn. */
export function drawCaption(ctx: CanvasRenderingContext2D, style: StripStyle, cx: number, cy: number, maxWidth: number) {
  const font = fonts.find(item => item.id === style.font) ?? fonts[0]
  const color = resolveTextColor(style)
  const caption = style.caption.trim()
  const names = style.names.trim()
  const date = style.showDate ? style.date : ''

  const upper = font.id === 'bold'
  const italic = font.style === 'italic' ? 'italic ' : ''
  const capSize = 46 * font.scale
  const nameSize = font.id === 'hand' ? 28 : 21
  const dateSize = 12
  const ui = '"Nunito", system-ui, sans-serif'

  const lines: { text: string; font: string; spacing: string; gap: number }[] = []
  if (caption) {
    lines.push({
      text: upper ? caption.toUpperCase() : caption,
      font: `${italic}${font.weight} ${capSize}px ${font.family}`,
      spacing: upper ? '4px' : '0px',
      gap: capSize * 1.15,
    })
  }
  if (names) lines.push({ text: names, font: `${italic}${Math.min(font.weight, 700)} ${nameSize}px ${font.family}`, spacing: '0px', gap: nameSize * 1.35 })
  if (date) lines.push({ text: date, font: `700 ${dateSize}px ${ui}`, spacing: '2px', gap: dateSize * 2 })
  if (style.showBrand) lines.push({ text: '. PIX', font: `800 ${dateSize + 1}px ${ui}`, spacing: '3px', gap: dateSize * 2 })
  if (lines.length === 0) return

  const total = lines.reduce((sum, line) => sum + line.gap, 0)
  let y = cy - total / 2
  ctx.save()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const line of lines) {
    ctx.font = line.font
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = line.spacing
    ctx.fillText(line.text.slice(0, 48), cx, y + line.gap / 2, maxWidth)
    y += line.gap
  }
  ctx.restore()
}

/** Renders a finished strip at the given scale to a PNG blob. Always waits for the caption font. */
export async function renderStripBlob(style: StripStyle, shots: Shot[], scale = 2): Promise<Blob> {
  await ensureFont(style.font)
  const geo = geometry(style.layout)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(geo.width * scale)
  canvas.height = Math.round(geo.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser could not create a drawing surface.')
  drawStrip(ctx, style, shots, scale)
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('The photo strip could not be turned into a PNG.'))), 'image/png')
  })
}
