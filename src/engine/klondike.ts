import { isRed, makeDeck, shuffle } from './cards.ts'
import { canPlaceOnFoundation, isAltRun, pileAt, topCard } from './moves.ts'
import type { GameState, Move, Pile, PileRef } from './types.ts'

export function dealKlondike(seed: number, draw = 1): GameState {
  const deck = shuffle(makeDeck(1), seed)
  const piles: Pile[] = []
  for (let i = 0; i < 7; i++) piles.push({ kind: 'tableau', index: i, cards: [] })
  for (let i = 0; i < 4; i++) piles.push({ kind: 'foundation', index: i, cards: [] })
  const stock: Pile = { kind: 'stock', index: 0, cards: [] }
  const waste: Pile = { kind: 'waste', index: 0, cards: [] }
  piles.push(stock, waste)

  let k = 0
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck[k++]
      card.faceUp = row === col
      piles[col].cards.push(card)
    }
  }
  while (k < deck.length) stock.cards.push(deck[k++])

  return {
    variant: 'klondike',
    piles,
    seed,
    moves: 0,
    stockPasses: 0,
    completed: 0,
    difficulty: 1,
    draw,
    won: false,
  }
}

export function klondikeCanDrop(state: GameState, from: PileRef, to: PileRef, count: number): boolean {
  const src = pileAt(state, from)
  const dst = pileAt(state, to)
  if (!src || !dst || from.kind === to.kind && from.index === to.index) return false
  if (count < 1 || src.cards.length < count) return false
  if (src.kind === 'stock' || dst.kind === 'stock' || dst.kind === 'waste') return false
  if ((src.kind === 'waste' || src.kind === 'foundation') && count !== 1) return false

  const run = src.cards.slice(src.cards.length - count)
  if (!isAltRun(run)) return false

  if (dst.kind === 'tableau') {
    const top = topCard(dst)
    if (!top) return run[0].rank === 13
    return top.faceUp && top.rank === run[0].rank + 1 && isRed(top.suit) !== isRed(run[0].suit)
  }
  if (dst.kind === 'foundation') {
    return count === 1 && canPlaceOnFoundation(run[0], dst)
  }
  return false
}

export function klondikeExtraMoves(state: GameState): Move[] {
  const stock = state.piles.find((p) => p.kind === 'stock')
  const waste = state.piles.find((p) => p.kind === 'waste')
  if (!stock || !waste) return []
  if (stock.cards.length > 0) return [{ type: 'draw' }]
  if (waste.cards.length > 0) return [{ type: 'recycle' }]
  return []
}

export function klondikeIsWon(state: GameState): boolean {
  return state.piles
    .filter((p) => p.kind === 'foundation')
    .every((p) => p.cards.length === 13)
}
