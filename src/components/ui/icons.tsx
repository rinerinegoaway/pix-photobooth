// Small line icons (24px grid, charcoal strokes) shared by buttons and feature badges.

const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function CameraIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...common}>
      <path d="M4 8h3l1.5-2h7L17 8h3v10H4z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  )
}

export function ChevronIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...common}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function HeartIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="#F4778B" stroke="#282629" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 20.5C5 15.5 3 12 3 8.8 3 6.2 5 4.5 7.3 4.5c1.8 0 3.3 1 4.7 3 1.4-2 2.9-3 4.7-3C19 4.5 21 6.2 21 8.8c0 3.2-2 6.7-9 11.7z" />
    </svg>
  )
}

export function PlaneIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...common}>
      <path d="M3 13l8-2.5L6 4l2-.5 7 5.5 5-1.5c1.5-.5 2 .8.8 1.6L16 12l3 7-2 .5-4.5-5.5L8 16l-.5 3.5L6 20l-1-4z" />
    </svg>
  )
}

/** Three tiny dashes radiating from a point, used as a "sparkle" accent next to buttons and labels. */
export function Ticks({ className = 'h-5 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 24" className={className} aria-hidden="true" fill="none" stroke="#F4778B" strokeWidth="2.4" strokeLinecap="round">
      <path d="M4 5l7 3M5 12h8M4 19l7-3" />
    </svg>
  )
}

export function LockIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...common}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  )
}

export function ClockIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function ArrowRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...common}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}
