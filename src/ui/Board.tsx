import type { GameState, Pile, PileRef } from '../engine/types.ts'
import { refOf } from '../engine/types.ts'
import { pileAt, topCard } from '../engine/moves.ts'
import { CardView } from './CardView.tsx'

interface Props {
  state: GameState
  selection: { ref: PileRef; count: number } | null
  targets: PileRef[]
  onCard: (ref: PileRef, cardIndex: number) => void
  onAuto: (ref: PileRef) => void
  onPile: (ref: PileRef) => void
  onStock: () => void
}

const isTarget = (targets: PileRef[], ref: PileRef) =>
  targets.some((t) => t.kind === ref.kind && t.index === ref.index)

export function Board({ state, selection, targets, onCard, onAuto, onPile, onStock }: Props) {
  const of = (kind: Pile['kind']) => state.piles.filter((p) => p.kind === kind)

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
              onAuto={() => onAuto(ref)}
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
    </div>
  )
}
