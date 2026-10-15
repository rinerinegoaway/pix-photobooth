import { useEffect, useRef } from 'react'
import { useFontsVersion } from '../../hooks/useFontsVersion'
import { ensureStickers } from '../../lib/stickers'
import { drawCell, drawStrip, ensureFont, geometry } from '../../lib/strip'
import type { Shot, StripStyle } from '../../lib/strip'

interface StripProps {
  style: StripStyle
  shots: (Shot | null)[]
  /** Pixel density of the backing canvas relative to the strip's design units. */
  quality?: number
  className?: string
  label?: string
}

/** Live preview: the exact renderer used for PNG and video, drawn into a visible canvas. */
export function PhotoStripPreview({ style, shots, quality = 0.9, className = '', label }: StripProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const fontsVersion = useFontsVersion()
  const geo = geometry(style.layout)

  useEffect(() => {
    let cancelled = false
    const canvas = ref.current
    if (!canvas) return
    void Promise.all([ensureFont(style.font), ensureStickers(style.placed.map(item => item.kind))]).then(() => {
      if (cancelled) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = Math.round(geo.width * quality)
      canvas.height = Math.round(geo.height * quality)
      drawStrip(ctx, style, shots, quality)
    })
    return () => {
      cancelled = true
    }
  }, [style, shots, quality, geo.width, geo.height, fontsVersion])

  return (
    <canvas
      ref={ref}
      className={`block h-auto w-full ${className}`}
      style={{ aspectRatio: `${geo.width} / ${geo.height}` }}
      role="img"
      aria-label={label ?? 'Preview of your photo strip'}
    />
  )
}

/** One framed photo, drawn with the same cell renderer as the strip. */
export function ShotThumb({ style, shot, index, className = '' }: { style: StripStyle; shot: Shot | null; index: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const geo = geometry(style.layout)
  const pad = 8
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const scale = 0.8
    canvas.width = Math.round((geo.cellW + pad * 2) * scale)
    canvas.height = Math.round((geo.cellH + pad * 2) * scale)
    ctx.scale(scale, scale)
    ctx.translate(pad, pad)
    drawCell(ctx, { ...style, stickers: [] }, shot, index, geo.cellW, geo.cellH)
  }, [style, shot, index, geo.cellW, geo.cellH])
  return (
    <canvas
      ref={ref}
      className={`block h-auto w-full ${className}`}
      style={{ aspectRatio: `${geo.cellW + pad * 2} / ${geo.cellH + pad * 2}` }}
      role="img"
      aria-label={shot ? `Photo ${index + 1}` : `Photo ${index + 1} not taken yet`}
    />
  )
}
