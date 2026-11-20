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
  peek: boolean
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

export function Board({ state, selection, targets, onCard, onPile, onDrop, onStock, peek }: Props) {
  const of = (kind: Pile['kind']) => state.piles.filter((p) => p.kind === kind)

  /**
   * One path for mouse and touch. A mouse drags as soon as it moves; a finger
   * either taps, swipes the board, or rests briefly and then drags a card.
   *
   * Scrolling used to be impossible when a swipe started on a face-up card:
   * the card owns the gesture (`touch-action: none`), so the swipe became a
   * drag, and the drag's edge-scroll saw the finger near the top edge and
   * rewound the board to the top. In landscape the board is taller than the
   * screen, so that made the bottom half unreachable. A quick vertical swipe
   * now pans the board; resting a finger for a moment still picks the card up.
   */
  const onCardPointerDown = (e: PointerEvent, ref: PileRef, cardIndex: number) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // count 0 means "not a movable run": still a tap, just never a drag.
    const count = selectableCount(state, ref, cardIndex)
    const pile = pileAt(state, ref)
    if (!pile) return
    const cards = pile.cards.slice(cardIndex, cardIndex + count)
    const cardEl = e.currentTarget as HTMLElement
    // Use DOM order, not pile order: the waste renders only its top few cards.
    const pileCards = Array.from(
      cardEl.closest('[data-pile]')?.querySelectorAll<HTMLElement>('.card') ?? [],
    )
    const first = Math.max(0, pileCards.indexOf(cardEl))
    const sourceEls = pileCards.slice(first, first + count)
    const rect = cardEl.getBoundingClientRect()
    const ox = e.clientX - rect.left
    const oy = e.clientY - rect.top
    const startX = e.clientX
    const startY = e.clientY
    const legal = legalTargets(state, ref, count)
    const legalKeys = new Set(legal.map(pileKey))
    const pointerId = e.pointerId
    const boardEl = cardEl.closest('.board') as HTMLElement | null
    const touch = e.pointerType !== 'mouse'
    const scrollable = touch && !!boardEl && boardEl.scrollHeight > boardEl.clientHeight + 1
    let mode: 'idle' | 'drag' | 'pan' = 'idle'
    let lastX = startX
    let lastY = startY
    let intentX = 0
    let intentY = 0
    let hovered: Element | null = null
    let finished = false
    let moved = false
    let holdTimer = 0
    let raf = 0
    const panTop = boardEl?.scrollTop ?? 0
    const panLeft = boardEl?.scrollLeft ?? 0

    const overPile = (x: number, y: number): Element | null =>
      document.elementFromPoint(x, y)?.closest('[data-pile]') ?? null

    const paint = (x: number, y: number): void => {
      const next = overPile(x, y)
      if (next === hovered) return
      hovered?.classList.remove('drop-hover')
      hovered = next
      if (next && legalKeys.has(next.getAttribute('data-pile') ?? '')) next.classList.add('drop-hover')
    }

    const scrollsVertically = (): boolean =>
      !!boardEl && boardEl.scrollHeight > boardEl.clientHeight + 1

    /** Can this vertical swipe still move the board in the direction asked? */
    const canPan = (dy: number): boolean => {
      if (!boardEl) return false
      if (dy < 0) return boardEl.scrollTop < boardEl.scrollHeight - boardEl.clientHeight - 1
      return boardEl.scrollTop > 0
    }

    const pan = (ev: PointerEvent): void => {
      if (!boardEl) return
      boardEl.scrollTop = panTop - (ev.clientY - startY)
      boardEl.scrollLeft = panLeft - (ev.clientX - startX)
    }

    // Dragging near an edge of the board scrolls it, so piles that are off-screen
    // on a narrow phone can still be reached without letting go of the card.
    // Only the edge the finger is travelling toward scrolls: a drag that starts
    // near the top must never rewind the board under the player.
    const EDGE = 48
    const autoScroll = () => {
      if (mode !== 'drag' || !boardEl) return
      const r = boardEl.getBoundingClientRect()
      const step = (d: number) => Math.max(2, Math.round(d / 4))
      let dx = 0
      let dy = 0
      if (lastX < r.left + EDGE && intentX < 0) dx = -step(r.left + EDGE - lastX)
      else if (lastX > r.right - EDGE && intentX > 0) dx = step(lastX - (r.right - EDGE))
      if (lastY < r.top + EDGE && intentY < 0) dy = -step(r.top + EDGE - lastY)
      else if (lastY > r.bottom - EDGE && intentY > 0) dy = step(lastY - (r.bottom - EDGE))
      if (dx !== 0 || dy !== 0) {
        boardEl.scrollLeft += dx
        boardEl.scrollTop += dy
        paint(lastX, lastY)
      }
      raf = requestAnimationFrame(autoScroll)
    }

    const activate = (x: number, y: number): void => {
      mode = 'drag'
      raf = requestAnimationFrame(autoScroll)
      for (const el of sourceEls) el.classList.add('drag-src')
      for (const t of legal) {
        document.querySelector(`[data-pile="${pileKey(t)}"]`)?.classList.add('drag-target')
      }
      dragState.value = {
        from: ref,
        count,
        cards,
        x,
        y,
        ox,
        oy,
        cw: rect.width,
        targets: legal,
      }
      paint(x, y)
    }

    // Resting a finger on a card arms the drag. A finger that starts moving
    // first is panning the board, not picking anything up.
    if (touch && count > 0 && scrollsVertically()) {
      holdTimer = window.setTimeout(() => {
        holdTimer = 0
        if (mode === 'idle' && !finished) activate(startX, startY)
      }, 120)
    }

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId || finished) return
      const mx = ev.clientX - lastX
      const my = ev.clientY - lastY
      if (Math.abs(mx) > 0.5) intentX = Math.sign(mx)
      if (Math.abs(my) > 0.5) intentY = Math.sign(my)
      lastX = ev.clientX
      lastY = ev.clientY

      if (mode === 'pan') {
        pan(ev)
        return
      }
      if (mode === 'idle') {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        if (Math.hypot(dx, dy) < (touch ? 10 : DRAG_THRESHOLD)) return
        // On a board that scrolls, a quick vertical swipe is always a scroll.
        // Picking a card up vertically takes a short rest on it (above), so the
        // two gestures can never fight over the same movement.
        if (scrollable && Math.abs(dy) > Math.abs(dx)) {
          // Even at an end of the board the swipe is a scroll gesture: the hold
          // must not fire and turn it into a card drag halfway through.
          mode = 'pan'
          window.clearTimeout(holdTimer)
          holdTimer = 0
          if (canPan(dy)) pan(ev)
          return
        }
        if (count === 0) return
        activate(ev.clientX, ev.clientY)
        moved = true
        return
      }
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG_THRESHOLD) moved = true
      dragState.value = {
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
      paint(lastX, lastY)
    }

    const teardown = () => {
      window.clearTimeout(holdTimer)
      holdTimer = 0
      cancelAnimationFrame(raf)
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
      const was = mode
      teardown()
      if (was === 'pan') {
        suppressClicks()
        return
      }
      // A tap, or a drag that never actually moved, is still a selection.
      if (was !== 'drag' || !moved) {
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
    // Klondike's waste shows the last one or three cards, fanned. The pile behind
    // it still holds every card played, but the row never grows taller.
    const wasteFrom =
      pile.kind === 'waste' ? Math.max(0, pile.cards.length - Math.min(state.draw || 1, pile.cards.length)) : 0
    const visibleCards = pile.kind === 'waste' ? pile.cards.slice(wasteFrom) : pile.cards

    return (
      <div
        class={`pile ${className}${pile.kind === 'waste' ? ' waste' : ''}${target ? ' target' : ''}`}
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
          visibleCards.map((card, n) => {
            const i = wasteFrom + n
            return (
              <CardView
                key={card.id}
                card={card}
                selected={isSelectedPile && i >= selectedFrom}
                peek={peek}
                onSelect={() => onCard(ref, i)}
                onPointerDown={(e) => onCardPointerDown(e, ref, i)}
              />
            )
          })}
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
        {selection ? 'Card selected. Tap a highlighted pile to move it.' : ''}
      </div>
      <span class="moves sr-only">{state.moves} moves</span>
      <DragLayer />
    </div>
  )
}
