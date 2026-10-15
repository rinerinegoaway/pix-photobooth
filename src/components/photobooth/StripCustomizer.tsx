import type { ReactNode } from 'react'
import { backgrounds, fonts, frames, layouts, stickers, textColors } from '../../lib/strip'
import type { BackgroundId, FontId, FrameId, LayoutId, StickerId, StripStyle, TextColorId } from '../../lib/strip'

interface Props {
  style: StripStyle
  onChange: (patch: Partial<StripStyle>) => void
  /** Show the side-by-side / stacked and left/right controls (shared booth only). */
  shared?: boolean
  /** Only the layout section, used before shooting. */
  layoutOnly?: boolean
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="t-label mb-2 p-0">{title}</legend>
      {children}
    </fieldset>
  )
}

function LayoutGlyph({ id }: { id: LayoutId }) {
  const cells =
    id === 'classic'
      ? [0, 1, 2, 3].map(i => <rect key={i} x="9" y={3 + i * 7.5} width="14" height="6" rx="1" />)
      : [0, 1, 2, 3].map(i => (
          <rect key={i} x={3 + (i % 2) * 14} y={4 + Math.floor(i / 2) * 15} width="12" height="12" rx="1" />
        ))
  return (
    <svg viewBox="0 0 32 34" className="h-9 w-8 shrink-0" aria-hidden="true" fill="currentColor">
      <rect x="1" y="1" width="30" height="32" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {cells}
    </svg>
  )
}

export function BackgroundPicker({ value, onChange }: { value: BackgroundId; onChange: (id: BackgroundId) => void }) {
  return (
        <div className="flex flex-wrap gap-2">
          {backgrounds.map(item => (
            <button
              key={item.id}
              type="button"
              aria-pressed={value === item.id}
              aria-label={item.name}
              title={item.name}
              onClick={() => onChange(item.id as BackgroundId)}
              className={`grid h-11 w-11 place-items-center rounded-full border border-line ${
                value === item.id ? 'outline-2 outline-offset-2 outline-coral' : ''
              } `}
              style={{ backgroundColor: item.color }}
            >
              {value === item.id && (
                <span className={`text-sm font-bold ${item.dark ? 'text-paper' : 'text-ink'}`} aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
  )
}

export function LayoutPicker({ value, onChange }: { value: LayoutId; onChange: (id: LayoutId) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
      {layouts.map(item => (
        <button key={item.id} type="button" className="option" aria-pressed={value === item.id} onClick={() => onChange(item.id)}>
          <LayoutGlyph id={item.id} />
          <span className="leading-tight">
            <strong className="block text-sm">{item.name}</strong>
            <span className="text-xs text-muted">{item.description}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

export function StripCustomizer({ style, onChange, shared = false, layoutOnly = false }: Props) {
  if (layoutOnly) return <LayoutPicker value={style.layout} onChange={layout => onChange({ layout })} />

  const toggleSticker = (id: StickerId) =>
    onChange({
      stickers: style.stickers.includes(id) ? style.stickers.filter(item => item !== id) : [...style.stickers, id],
    })

  return (
    <div className="flex flex-col gap-6">
      <Section title="Layout">
        <LayoutPicker value={style.layout} onChange={layout => onChange({ layout })} />
      </Section>

      {shared && (
        <Section title="Two people, one frame">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="option"
              aria-pressed={style.arrangement.orientation === 'side'}
              onClick={() => onChange({ arrangement: { ...style.arrangement, orientation: 'side' } })}
            >
              Side by side
            </button>
            <button
              type="button"
              className="option"
              aria-pressed={style.arrangement.orientation === 'stacked'}
              onClick={() => onChange({ arrangement: { ...style.arrangement, orientation: 'stacked' } })}
            >
              Stacked
            </button>
            <button
              type="button"
              className="option"
              aria-pressed={style.arrangement.mineFirst}
              onClick={() => onChange({ arrangement: { ...style.arrangement, mineFirst: true } })}
            >
              {style.arrangement.orientation === 'side' ? 'Me on the left' : 'Me on top'}
            </button>
            <button
              type="button"
              className="option"
              aria-pressed={!style.arrangement.mineFirst}
              onClick={() => onChange({ arrangement: { ...style.arrangement, mineFirst: false } })}
            >
              {style.arrangement.orientation === 'side' ? 'Me on the right' : 'Me on the bottom'}
            </button>
          </div>
        </Section>
      )}

      <Section title="Frame">
        <div className="grid grid-cols-2 gap-2">
          {frames.map(item => (
            <button key={item.id} type="button" className="option" aria-pressed={style.frame === item.id} onClick={() => onChange({ frame: item.id as FrameId })}>
              <span className="leading-tight">
                <strong className="block text-sm">{item.name}</strong>
                <span className="text-xs text-muted">{item.description}</span>
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Background">
        <BackgroundPicker value={style.background} onChange={background => onChange({ background })} />
      </Section>

      <Section title="Auto decorations (every photo)">
        <div className="flex flex-wrap gap-2">
          {stickers.map(item => (
            <button key={item.id} type="button" className="option !py-1.5" aria-pressed={style.stickers.includes(item.id)} onClick={() => toggleSticker(item.id)}>
              <span className="text-sm font-medium">{item.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Pick as many as you like. Stickers are drawn into the PNG and the video.</p>
      </Section>

      <Section title="Caption and names">
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Caption</span>
            <input className="field" value={style.caption} maxLength={40} placeholder="a forever memory" onChange={event => onChange({ caption: event.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Names <span className="font-normal text-muted">(optional)</span>
            </span>
            <input className="field" value={style.names} maxLength={50} placeholder="Rie & Rob" onChange={event => onChange({ names: event.target.value })} />
          </label>
          <div>
            <span className="mb-1 block text-sm font-medium">Caption font</span>
            <div className="grid grid-cols-2 gap-2">
              {fonts.map(item => (
                <button key={item.id} type="button" className="option" aria-pressed={style.font === item.id} onClick={() => onChange({ font: item.id as FontId })}>
                  <span style={{ fontFamily: item.family, fontStyle: item.style, fontWeight: item.weight, fontSize: `${1.25 * item.scale}rem` }} aria-hidden="true">
                    {item.sample}
                  </span>
                  <span className="text-sm">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium">Text color</span>
            <div className="flex flex-wrap gap-2">
              {textColors.map(item => (
                <button key={item.id} type="button" className="option !py-1.5" aria-pressed={style.textColor === item.id} onClick={() => onChange({ textColor: item.id as TextColorId })}>
                  {item.color && <span className="h-4 w-4 rounded-full border border-line" style={{ backgroundColor: item.color }} aria-hidden="true" />}
                  <span className="text-sm">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-ink" checked={style.showDate} onChange={event => onChange({ showDate: event.target.checked })} />
            Show today’s date
          </label>
        </div>
      </Section>
    </div>
  )
}
