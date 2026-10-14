import { useEffect, useRef } from 'react'

/** Draws a pre-made illustration canvas into a responsive element. */
export function SampleCanvas({ source, className = '' }: { source: HTMLCanvasElement; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.width = source.width
    canvas.height = source.height
    ctx.drawImage(source, 0, 0)
  }, [source])
  return <canvas ref={ref} className={`block aspect-[4/3] h-auto w-full ${className}`} aria-hidden="true" />
}
