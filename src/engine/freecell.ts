import { isRed, makeDeck, shuffle } from './cards.ts'
import { canPlaceOnFoundation, isAltRun, pileAt, topCard } from './moves.ts'
import type { GameState, Move, Pile, PileRef } from './types.ts'

export function dealFreecell(seed: number): GameState {
  const deck = shuffle(makeDeck(1), seed)
  const piles: Pile[] = []
  for (let i = 0; i < 8; i++) piles.push({ kind: 'tableau', index: i, cards: [] })
  for (let i = 0; i < 4; i++) piles.push({ kind: 'freecell', index: i, cards: [] })
  for (let i = 0; i < 4; i++) piles.push({ kind: 'foundation', index: i, cards: [] })

  let k = 0
  for (let col = 0; col < 8; col++) {
    const count = col < 4 ? 7 : 6
    for (let row = 0; row < count; row++) {
      const card = deck[k++]
      card.faceUp = true
      piles[col].cards.push(card)
    }
  }

  return {
    variant: 'freecell',
    piles,
    seed,
    moves: 0,
    stockPasses: 0,
    completed: 0,
    difficulty: 1,
    draw: 1,
    won: false,
  }
}

/** How many cards may move at once with the free cells and empty columns left. */
export function freecellCapacity(state: GameState, to: PileRef): number {
  const free = state.piles.filter((p) => p.kind === 'freecell' && p.cards.length === 0).length
  const emptyCols = state.piles.filter((p) => p.kind === 'tableau' && p.cards.length === 0)
  const targetWasEmpty = emptyCols.some((p) => p.index === to.index)
  const empties = emptyCols.length - (targetWasEmpty ? 1 : 0)
  return (free + 1) * (empties + 1)
}

export function freecellCanDrop(state: GameState, from: PileRef, to: PileRef, count: number): boolean {
  const src = pileAt(state, from)
  const dst = pileAt(state, to)
  if (!src || !dst) return false
  if (from.kind === to.kind && from.index === to.index) return false
  if (count < 1 || src.cards.length < count) return false
  if (src.kind === 'freecell' && count !== 1) return false
  if (src.kind === 'foundation' && count !== 1) return false

  const run = src.cards.slice(src.cards.length - count)
  if (!isAltRun(run)) return false

  if (dst.kind === 'freecell') {
    return count === 1 && dst.cards.length === 0
  }
  if (dst.kind === 'foundation') {
    return count === 1 && canPlaceOnFoundation(run[0], dst)
  }
  if (dst.kind === 'tableau') {
    if (count > freecellCapacity(state, to)) return false
    const top = topCard(dst)
    if (!top) return true
    return top.faceUp && top.rank === run[0].rank + 1 && isRed(top.suit) !== isRed(run[0].suit)
  }
  return false
}

export function freecellExtraMoves(_state: GameState): Move[] {
  return []
}

export function freecellIsWon(state: GameState): boolean {
  return state.piles
    .filter((p) => p.kind === 'foundation')
    .every((p) => p.cards.length === 13)
}
