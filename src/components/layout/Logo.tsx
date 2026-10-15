import { SWOOSH_PATH } from './logoPaths'

// . PIX by Rine wordmark: a bold charcoal "P" holding a heart photo strip, an "i" topped
// with a heart, and an "X" crossed by a coral brush stroke that finishes as the script "R".
// Flat brand colors only: no outlines, no shadows.

const INK = '#282629'
const CORAL = '#F4778B'
const BUTTER = '#F9DF75'
const BLUSH = '#F7E8EA'

const HEART = 'M0 22 C-6 16 -26 4 -26 -10 C-26 -24 -8 -26 0 -12 C8 -26 26 -24 26 -10 C26 4 6 16 0 22 Z'

function Heart({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d={HEART} fill={fill} />
}

/**
 * The "P": a tall stem that drops below the baseline, a bowl with a clearly open counter, and the
 * heart photo strip sitting on the stem.
 */
function PGlyph() {
  return (
    <>
      <path
        d="M150 322 V110 H214 C290 110 322 142 322 186 C322 230 290 264 214 264 H150"
        fill="none"
        stroke={INK}
        strokeWidth="66"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform="rotate(5 150 215)">
        <rect x="121" y="92" width="58" height="232" rx="14" fill="#FFFFFF" />
        <rect x="128" y="112" width="44" height="44" rx="8" fill={BLUSH} />
        <rect x="128" y="170" width="44" height="44" rx="8" fill={BLUSH} />
        <rect x="128" y="228" width="44" height="44" rx="8" fill={BLUSH} />
        <Heart x={150} y={134} s={0.55} fill={CORAL} />
        <Heart x={150} y={192} s={0.55} fill={CORAL} />
        <Heart x={150} y={250} s={0.55} fill={CORAL} />
      </g>
    </>
  )
}

export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="95 20 270 380" className={className} role="img" aria-label=". PIX">
      <PGlyph />
    </svg>
  )
}

export function Logo({ className = '', signature = true }: { className?: string; signature?: boolean }) {
  return (
    <svg
      overflow="visible"
      preserveAspectRatio="xMinYMid meet"
      viewBox={signature ? '80 0 1030 480' : '80 20 1030 395'}
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
