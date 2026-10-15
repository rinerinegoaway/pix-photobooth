import { clamp, MAX_STICKER_W, MIN_STICKER_W } from '../../lib/stickerGeometry'
import { newSticker, stickerCatalog } from '../../lib/stickers'
import type { PlacedSticker } from '../../lib/stickers'

interface Props {
  placed: PlacedSticker[]
  selectedId: string | null
  onChange: (placed: PlacedSticker[]) => void
  onSelect: (id: string | null) => void
}

export function StickerPicker({ placed, selectedId, onChange, onSelect }: Props) {
  const selected = placed.find(item => item.id === selectedId) ?? null

  function add(kind: string) {
    const sticker = newSticker(kind)
    onChange([...placed, sticker])
    onSelect(sticker.id)
  }
  function patch(change: Partial<PlacedSticker>) {
    if (!selected) return
    onChange(placed.map(item => (item.id === selected.id ? { ...item, ...change } : item)))
  }
  function remove() {
    if (!selected) return
    onChange(placed.filter(item => item.id !== selected.id))
    onSelect(null)
  }
  function toFront() {
    if (!selected) return
    onChange([...placed.filter(item => item.id !== selected.id), selected])
  }

  return (
    <section aria-labelledby="stickers-heading" className="flex flex-col gap-4">
      <div>
        <h3 id="stickers-heading" className="t-label mb-1">
          Stickers
        </h3>
        <p className="text-sm text-muted">Tap a sticker to add it, then drag it anywhere on your strip. Add as many as you like.</p>
      </div>

      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-6 lg:grid-cols-3">
        {stickerCatalog.map(item => (
          <li key={item.id}>
            <button type="button" className="option w-full flex-col justify-center !gap-1 !px-1 !py-2" onClick={() => add(item.id)} aria-label={`Add ${item.name} sticker`}>
              <img src={item.url} alt="" className="h-12 w-12 object-contain" draggable={false} />
              <span className="text-xs font-bold">{item.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 rounded-2xl bg-blush p-3" aria-live="polite">
        {selected ? (
          <>
            <p className="text-sm font-bold">Selected: {stickerCatalog.find(item => item.id === selected.kind)?.name}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => patch({ w: clamp(selected.w / 1.15, MIN_STICKER_W, MAX_STICKER_W) })}>
                Smaller
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => patch({ w: clamp(selected.w * 1.15, MIN_STICKER_W, MAX_STICKER_W) })}>
                Bigger
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => patch({ rot: selected.rot - 0.2 })} aria-label="Rotate left">
                ↺ Rotate
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => patch({ rot: selected.rot + 0.2 })} aria-label="Rotate right">
                ↻ Rotate
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={toFront}>
                To front
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={remove}>
                Remove
              </button>
            </div>
            <p className="text-xs text-muted">You can also drag the sticker, pull the round handles to resize and rotate, or use the arrow keys.</p>
          </>
        ) : (
          <p className="text-sm text-muted">{placed.length > 0 ? 'Tap a sticker on the strip to select it.' : 'No stickers yet.'}</p>
        )}
        {placed.length > 0 && (
          <button
            type="button"
            className="btn btn-quiet btn-sm self-start"
            onClick={() => {
              onChange([])
              onSelect(null)
            }}
          >
            Remove all stickers ({placed.length})
          </button>
        )}
      </div>
    </section>
  )
}
