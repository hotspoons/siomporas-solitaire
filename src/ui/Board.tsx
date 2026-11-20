import type { GameState, Pile, PileRef } from '../engine/types.ts'
import { refOf } from '../engine/types.ts'
import { legalTargets, selectableCount } from '../engine/game.ts'
import { pileAt } from '../engine/moves.ts'
import { CardView } from './CardView.tsx'
import { dragState, pileKey, suppressClicks, type DragState } from './drag.ts'

interface Props {
  state: GameState
  selection: { ref: PileRef; count: number } | null
  targets: PileRef[]
  onCard: (ref: PileRef, cardIndex: number) => void
  onPile: (ref: PileRef) => void
  onDrop: (from: PileRef, to: PileRef, count: number) => void
  onStock: () => void
}

const isTarget = (targets: PileRef[], ref: PileRef) =>
  targets.some((t) => t.kind === ref.kind && t.index === ref.index)

const DRAG_THRESHOLD = 5

function DragLayer() {
  const d = dragState.value
  if (!d) return null
  return (
    <div
      class="drag-layer"
      aria-hidden="true"
      style={{ transform: `translate3d(${d.x - d.ox}px, ${d.y - d.oy}px, 0)`, width: `${d.cw}px` }}
    >
      <div class="drag-stack" style={{ '--cw': `${d.cw}px` } as Record<string, string>}>
        {d.cards.map((card) => (
          <CardView key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}

export function Board({ state, selection, targets, onCard, onPile, onDrop, onStock }: Props) {
  const of = (kind: Pile['kind']) => state.piles.filter((p) => p.kind === kind)

  /**
   * One path for mouse and touch: press a face-up card, move to drag it (the whole
   * movable run comes along), release on a pile to play it, release without moving
   * to tap-select it. Text can never be selected because the cards opt out of it.
   */
  const onCardPointerDown = (e: PointerEvent, ref: PileRef, cardIndex: number) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // count 0 means "not a movable run": still a tap, just never a drag.
    const count = selectableCount(state, ref, cardIndex)
    const pile = pileAt(state, ref)
    if (!pile) return
    const cards = pile.cards.slice(cardIndex, cardIndex + count)
    const cardEl = e.currentTarget as HTMLElement
    const sourceEls = Array.from(
      cardEl.closest('[data-pile]')?.querySelectorAll<HTMLElement>('.card') ?? [],
    ).slice(cardIndex, cardIndex + count)
    const rect = cardEl.getBoundingClientRect()
    const ox = e.clientX - rect.left
    const oy = e.clientY - rect.top
    const startX = e.clientX
    const startY = e.clientY
    const legal = legalTargets(state, ref, count)
    const legalKeys = new Set(legal.map(pileKey))
    const pointerId = e.pointerId
    const boardEl = cardEl.closest('.board') as HTMLElement | null
    let active = false
    let lastX = startX
    let lastY = startY
    let hovered: Element | null = null
    let finished = false

    const overPile = (x: number, y: number): Element | null =>
      document.elementFromPoint(x, y)?.closest('[data-pile]') ?? null

    const paint = (x: number, y: number): void => {
      const next = overPile(x, y)
      if (next === hovered) return
      hovered?.classList.remove('drop-hover')
      hovered = next
      if (next && legalKeys.has(next.getAttribute('data-pile') ?? '')) next.classList.add('drop-hover')
    }

    // Dragging near an edge of the board scrolls it, so piles that are off-screen
    // on a narrow phone can still be reached without letting go of the card.
    let raf = 0
    const EDGE = 48
    const autoScroll = () => {
      if (!active || !boardEl) return
      const r = boardEl.getBoundingClientRect()
      const step = (d: number) => Math.max(2, Math.round(d / 4))
      let dx = 0
      let dy = 0
      if (lastX < r.left + EDGE) dx = -step(r.left + EDGE - lastX)
      else if (lastX > r.right - EDGE) dx = step(lastX - (r.right - EDGE))
      if (lastY < r.top + EDGE) dy = -step(r.top + EDGE - lastY)
      else if (lastY > r.bottom - EDGE) dy = step(lastY - (r.bottom - EDGE))
      if (dx !== 0 || dy !== 0) {
        boardEl.scrollLeft += dx
        boardEl.scrollTop += dy
        paint(lastX, lastY)
      }
      raf = requestAnimationFrame(autoScroll)
    }

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      if (!active) {
        if (count === 0 || Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return
        active = true
        raf = requestAnimationFrame(autoScroll)
        for (const el of sourceEls) el.classList.add('drag-src')
        for (const t of legal) {
          document.querySelector(`[data-pile="${pileKey(t)}"]`)?.classList.add('drag-target')
        }
      }
      const next: DragState = {
        from: ref,
        count,
        cards,
        x: ev.clientX,
        y: ev.clientY,
        ox,
        oy,
        cw: rect.width,
        targets: legal,
      }
      dragState.value = next
      lastX = ev.clientX
      lastY = ev.clientY
      paint(lastX, lastY)
    }

    const teardown = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      for (const el of sourceEls) el.classList.remove('drag-src')
      document.querySelectorAll('.drag-target').forEach((el) => el.classList.remove('drag-target'))
      hovered?.classList.remove('drop-hover')
      hovered = null
      dragState.value = null
    }

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId || finished) return
      finished = true
      const dragged = active
      teardown()
      if (!dragged) {
        onCard(ref, cardIndex)
        return
      }
      suppressClicks()
      // Touch pointerup can carry no coordinates; the finger is where it last was.
      const px = ev.clientX || lastX
      const py = ev.clientY || lastY
      const el = overPile(px, py)
      const key = el?.getAttribute('data-pile')
      if (!key || !legalKeys.has(key)) return
      const [kind, index] = key.split(':')
      onDrop(ref, { kind: kind as Pile['kind'], index: Number(index) }, count)
    }

    const onCancel = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId || finished) return
      finished = true
      teardown()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }

  const renderPile = (pile: Pile, className = '') => {
    const ref = refOf(pile)
    const target = isTarget(targets, ref)
    const isSelectedPile = selection?.ref.kind === ref.kind && selection?.ref.index === ref.index
    const selectedFrom = isSelectedPile ? pile.cards.length - selection!.count : pile.cards.length

    return (
      <div
        class={`pile ${className}${target ? ' target' : ''}`}
        data-pile={`${pile.kind}:${pile.index}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.card')) return
          onPile(ref)
        }}
      >
        {pile.kind === 'foundation' && pile.cards.length === 0 && <div class="slot" aria-hidden="true">♦</div>}
        {pile.kind === 'tableau' && pile.cards.length === 0 && <div class="slot empty" aria-hidden="true" />}
        {pile.kind === 'freecell' && pile.cards.length === 0 && <div class="slot cell" aria-hidden="true" />}
        {pile.kind === 'stock' && (
          <button type="button" class="card back stock" onClick={onStock} aria-label="Stock pile, draw a card">
            {pile.cards.length > 0 ? <span class="count">{pile.cards.length}</span> : <span class="recycle">↻</span>}
          </button>
        )}
        {pile.kind !== 'stock' &&
          pile.cards.map((card, i) => (
            <CardView
              key={card.id}
              card={card}
              selected={isSelectedPile && i >= selectedFrom}
              onSelect={() => onCard(ref, i)}
              onPointerDown={(e) => onCardPointerDown(e, ref, i)}
            />
          ))}
      </div>
    )
  }

  const tableaus = of('tableau')
  const foundations = of('foundation')
  const freecells = of('freecell')
  const stock = of('stock')[0]
  const waste = of('waste')[0]

  return (
    <div class={`board v-${state.variant}`} data-ready={state.piles.length > 0 ? '' : undefined}>
      <div class="top-row">
        {stock && <div class="cell-1">{renderPile(stock)}</div>}
        {waste && <div class="cell-2">{renderPile(waste)} </div>}
        {freecells.map((p, i) => (
          <div class={`cell-${i + 1}`} key={`f${p.index}`}>
            {renderPile(p)}
          </div>
        ))}
        {foundations.map((p, i) => (
          <div class={`cell-${(state.variant === 'freecell' ? 5 : 4) + i}`} key={`fnd${p.index}`}>
            {renderPile(p)}
          </div>
        ))}
      </div>
      <div class="tableau">
        {tableaus.map((p) => renderPile(p, 'tableau-pile'))}
      </div>
      <div class="sr-only" aria-live="polite">
        {selection ? 'Card selected. Tap a highlighted pile to move it.' : `${state.moves} moves`}
      </div>
      <DragLayer />
    </div>
  )
}
