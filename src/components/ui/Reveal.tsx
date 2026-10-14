import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/** Fades content up once as it scrolls into view. Skipped entirely for reduced-motion users. */
export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  // Reduced-motion users (or browsers without IntersectionObserver) get the content immediately.
  const [shown, setShown] = useState(() => !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const node = ref.current
    if (!node || shown) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setShown(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [shown])

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out ${shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}
