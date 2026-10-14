import { SWOOSH_PATH } from './logoPaths'

// . PIX by Rine wordmark: coral dot, a bold charcoal "P" holding a heart photo strip, an "i" topped
// with a heart, and an "X" crossed by a coral brush stroke that finishes as the script "R".
// Flat brand colors only: no outlines, no shadows.

const INK = '#242124'
const CORAL = '#FF5576'
const BUTTER = '#F7E8A4'
const BLUSH = '#FFE3E8'

const HEART = 'M0 22 C-6 16 -26 4 -26 -10 C-26 -24 -8 -26 0 -12 C8 -26 26 -24 26 -10 C26 4 6 16 0 22 Z'

function Heart({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d={HEART} fill={fill} />
}

/** The "P" with its photo strip, plus the leading dot. Shared by the mark and the full wordmark. */
function PGlyph() {
  return (
    <>
      <circle cx="52" cy="290" r="40" fill={CORAL} />
      <path
        d="M150 305 V110 H225 C300 110 330 145 330 195 C330 245 300 280 225 280 H150"
        fill="none"
        stroke={INK}
        strokeWidth="104"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform="rotate(6 190 200)">
        <rect x="138" y="70" width="112" height="240" rx="16" fill="#FFFFFF" />
        <rect x="152" y="104" width="84" height="84" rx="10" fill={BLUSH} />
        <rect x="152" y="204" width="84" height="84" rx="10" fill={BLUSH} />
        <Heart x={194} y={148} s={0.95} fill={CORAL} />
        <Heart x={194} y={248} s={0.95} fill={CORAL} />
      </g>
    </>
  )
}

export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 330 360" className={className} role="img" aria-label=". PIX">
      <PGlyph />
    </svg>
  )
}

export function Logo({ className = '', signature = true }: { className?: string; signature?: boolean }) {
  return (
    <svg
      overflow="visible"
      preserveAspectRatio="xMinYMid meet"
      viewBox={signature ? '-30 0 1140 480' : '-30 20 1140 370'}
      className={className}
      role="img"
      aria-label={signature ? '. PIX by Rine' : '. PIX'}
    >
      <g transform="translate(0 40) scale(0.98)">
        <PGlyph />
        {/* i */}
        <rect x="405" y="170" width="72" height="170" rx="36" fill={INK} />
        <Heart x={441} y={92} s={1.45} fill={CORAL} />
        {/* X */}
        <path d="M545 130 L690 325" stroke={INK} strokeWidth="92" strokeLinecap="round" />
        <path d="M690 130 L545 325" stroke={INK} strokeWidth="92" strokeLinecap="round" />
        {/* brush stroke that becomes the R */}
        <path d={SWOOSH_PATH} fill={CORAL} />
        {/* sparkle */}
        <path d="M1030 70 Q1036 100 1060 106 Q1036 112 1030 142 Q1024 112 1000 106 Q1024 100 1030 70 Z" fill={BUTTER} />
      </g>
      {signature && (
        <text x="800" y="440" fontFamily="Caveat, 'Segoe Script', cursive" fontSize="68" fontWeight="600" fill={INK}>
          by Rine
        </text>
      )}
    </svg>
  )
}
