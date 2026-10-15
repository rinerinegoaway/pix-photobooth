import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { clamp, clampCenter, hitTest, MAX_STICKER_W, MIN_STICKER_W, resizeFromCorner, rotationFromHandle } from '../../lib/stickerGeometry'
import { stickerDef } from '../../lib/stickers'
import type { PlacedSticker } from '../../lib/stickers'
import { geometry } from '../../lib/strip'
import type { Shot, StripStyle } from '../../lib/strip'
import { PhotoStripPreview } from './PhotoStripPreview'

interface Props {
  style: StripStyle
  shots: (Shot | null)[]
  onChange: (placed: PlacedSticker[]) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Lets people edit the caption and names directly on the strip. */
  onTextChange: (patch: { caption?: string; names?: string }) => void
}

type Mode = 'move' | 'resize' | 'rotate'

/**
 * The strip preview with an editing layer on top. The stickers themselves are drawn into the canvas by
 * the same renderer that makes the PNG, so what you see is exactly what you download. This layer only
 * adds the selection box and handles (interface chrome, never exported).
 */
export function StickerEditor({ style, shots, onChange, selectedId, onSelect, onTextChange }: Props) {
  const [editingText, setEditingText] = useState(false)
  const textId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  const geo = geometry(style.layout)
  const placed = style.placed
  const placedRef = useRef(placed)
  const dragCleanup = useRef<(() => void) | null>(null)

  useEffect(() => {
    placedRef.current = placed
  })
  // Stop listening if the editor goes away mid-drag.
  useEffect(() => () => dragCleanup.current?.(), [])

  const selected = placed.find(item => item.id === selectedId) ?? null

  /** Pointer position in the strip's design units. */
  function toDesign(event: { clientX: number; clientY: number }) {
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return { px: 0, py: 0 }
    return { px: ((event.clientX - rect.left) / rect.width) * geo.width, py: ((event.clientY - rect.top) / rect.height) * geo.height }
  }

  function update(id: string, patch: Partial<PlacedSticker>) {
    onChange(placedRef.current.map(item => (item.id === id ? { ...item, ...patch } : item)))
  }

  function startDrag(event: ReactPointerEvent, mode: Mode, sticker: PlacedSticker) {
    event.preventDefault()
    event.stopPropagation()
    dragCleanup.current?.()
    const aspect = stickerDef(sticker.kind)?.aspect ?? 1
    const start = toDesign(event)
    const offsetX = start.px - sticker.x * geo.width
    const offsetY = start.py - sticker.y * geo.height
    // Bring the grabbed sticker to the front so it is never hidden behind another one.
    if (mode === 'move') {
      const rest = placedRef.current.filter(item => item.id !== sticker.id)
      onChange([...rest, sticker])
    }
    onSelect(sticker.id)

    const move = (e: PointerEvent) => {
      const { px, py } = toDesign(e)
      const current = placedRef.current.find(item => item.id === sticker.id)
      if (!current) return
      if (mode === 'move') {
        update(sticker.id, clampCenter((px - offsetX) / geo.width, (py - offsetY) / geo.height))
      } else if (mode === 'resize') {
        update(sticker.id, { w: resizeFromCorner(current, px, py, geo.width, geo.height, aspect) })
      } else {
        update(sticker.id, { rot: rotationFromHandle(current, px, py, geo.width, geo.height) })
      }
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      dragCleanup.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    dragCleanup.current = end
  }

  /** Clicking the strip selects the top-most sticker under the pointer, or clears the selection. */
  function onBackgroundPointerDown(event: ReactPointerEvent) {
    const { px, py } = toDesign(event)
    // Tapping the caption area (when no sticker is on top of it) opens the text editor.
    if (Math.abs(py - geo.textY) < 62) {
      const overSticker = placedRef.current.some(item => hitTest(item, px, py, geo.width, geo.height, stickerDef(item.kind)?.aspect ?? 1))
      if (!overSticker) {
        onSelect(null)
        setEditingText(true)
        return
      }
    }
    for (let i = placedRef.current.length - 1; i >= 0; i--) {
      const sticker = placedRef.current[i]
      const aspect = stickerDef(sticker.kind)?.aspect ?? 1
      if (hitTest(sticker, px, py, geo.width, geo.height, aspect)) {
        startDrag(event, 'move', sticker)
        return
      }
    }
    onSelect(null)
  }

  function onKeyDown(event: ReactKeyboardEvent) {
    if (!selected) return
    const step = event.shiftKey ? 0.04 : 0.01
    const move = (dx: number, dy: number) => {
      event.preventDefault()
      update(selected.id, clampCenter(selected.x + dx, selected.y + dy))
    }
    switch (event.key) {
      case 'ArrowLeft':
        return move(-step, 0)
      case 'ArrowRight':
        return move(step, 0)
      case 'ArrowUp':
        return move(0, -step)
      case 'ArrowDown':
        return move(0, step)
      case '+':
      case '=':
        event.preventDefault()
        return update(selected.id, { w: clamp(selected.w * 1.08, MIN_STICKER_W, MAX_STICKER_W) })
      case '-':
        event.preventDefault()
        return update(selected.id, { w: clamp(selected.w / 1.08, MIN_STICKER_W, MAX_STICKER_W) })
      case '[':
        event.preventDefault()
        return update(selected.id, { rot: selected.rot - 0.1 })
      case ']':
        event.preventDefault()
        return update(selected.id, { rot: selected.rot + 0.1 })
      case 'Delete':
      case 'Backspace':
        event.preventDefault()
        onChange(placed.filter(item => item.id !== selected.id))
        return onSelect(null)
      case 'Escape':
        return onSelect(null)
    }
  }

  const selectedAspect = selected ? (stickerDef(selected.kind)?.aspect ?? 1) : 1

  return (
    <div
      ref={boxRef}
      className="relative select-none rounded-sm outline-offset-4"
      role="group"
      tabIndex={0}
      aria-label="Photo strip with stickers. Select a sticker, then use the arrow keys to move it, plus and minus to resize, brackets to rotate, and Delete to remove it."
      onKeyDown={onKeyDown}
    >
      <PhotoStripPreview style={style} shots={shots} quality={1} className="rounded-sm" label="Your photo strip. Stickers you add appear here exactly as they will in the download." />

      {/* A soft hint over the caption area so it is clear the words can be edited. */}
      {!editingText && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute grid place-items-end justify-items-center rounded-md border border-dashed border-ink/25"
          style={{ left: '5%', right: '5%', top: `${((geo.textY - 62) / geo.height) * 100}%`, height: `${(124 / geo.height) * 100}%` }}
        >
          <span className="mb-1 rounded-full bg-white/90 px-2 py-0.5 text-[0.65rem] font-extrabold tracking-wide text-muted">✎ Tap to edit text</span>
        </div>
      )}

      {/* Pointer layer: pan-y keeps page scrolling possible on touch until a sticker is selected. */}
      <div className="absolute inset-0 cursor-pointer" style={{ touchAction: selected ? 'none' : 'pan-y' }} onPointerDown={onBackgroundPointerDown} />

      {selected && (
        <div
          className="absolute"
          style={{
            left: `${selected.x * 100}%`,
            top: `${selected.y * 100}%`,
            width: `${selected.w * 100}%`,
            height: `${((selected.w * geo.width * selectedAspect) / geo.height) * 100}%`,
            transform: `translate(-50%, -50%) rotate(${selected.rot}rad)`,
            touchAction: 'none',
          }}
        >
          <div className="absolute inset-0 cursor-move rounded-md border-2 border-dashed border-coral" onPointerDown={event => startDrag(event, 'move', selected)} />
          {/* rotate handle */}
          <div
            aria-hidden="true"
            className="absolute -top-8 left-1/2 grid h-6 w-6 -translate-x-1/2 cursor-grab place-items-center rounded-full border-2 border-white bg-coral text-[0.7rem] font-black leading-none text-ink shadow"
            style={{ touchAction: 'none' }}
            onPointerDown={event => startDrag(event, 'rotate', selected)}
          >
            ↻
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute -top-2 left-1/2 h-2 w-px -translate-x-1/2 bg-coral" />
          {/* resize handle */}
          <div
            aria-hidden="true"
            className="absolute -bottom-3 -right-3 h-6 w-6 cursor-nwse-resize rounded-full border-2 border-white bg-coral shadow"
            style={{ touchAction: 'none' }}
            onPointerDown={event => startDrag(event, 'resize', selected)}
          />
          {/* remove */}
          <button
            type="button"
            aria-label="Remove this sticker"
            className="absolute -right-3 -top-3 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-ink text-xs font-black leading-none text-paper shadow"
            style={{ touchAction: 'none' }}
            onPointerDown={event => event.stopPropagation()}
            onClick={() => {
              onChange(placed.filter(item => item.id !== selected.id))
              onSelect(null)
            }}
          >
            ×
          </button>
        </div>
      )}

      {editingText && (
        <div
          role="dialog"
          aria-label="Edit caption and names"
          className="absolute z-10 flex flex-col gap-2 rounded-2xl border border-line bg-white p-3 shadow-[0_14px_34px_-14px_rgba(40,38,41,0.45)]"
          style={{ left: '3%', right: '3%', bottom: `${(1 - (geo.textY - 70) / geo.height) * 100}%` }}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              setEditingText(false)
            }
          }}
        >
          <label className="block">
            <span className="mb-0.5 block text-xs font-extrabold">Caption</span>
            <input
              id={`${textId}-caption`}
              autoFocus
              className="field !min-h-10 !py-1.5"
              value={style.caption}
              maxLength={40}
              placeholder="a forever memory"
              onChange={event => onTextChange({ caption: event.target.value })}
              onKeyDown={event => event.key === 'Enter' && setEditingText(false)}
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-xs font-extrabold">
              Names <span className="font-semibold text-muted">(optional)</span>
            </span>
            <input
              className="field !min-h-10 !py-1.5"
              value={style.names}
              maxLength={50}
              placeholder="Rie & Rob"
              onChange={event => onTextChange({ names: event.target.value })}
              onKeyDown={event => event.key === 'Enter' && setEditingText(false)}
            />
          </label>
          <button type="button" className="btn btn-primary btn-sm self-end" onClick={() => setEditingText(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  )
}
