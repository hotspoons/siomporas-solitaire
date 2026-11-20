import { RANKS, SUITS, shuffle } from './cards.ts'
import type { Card } from './cards.ts'
import { isSameSuitRun, pileAt, topCard } from './moves.ts'
import type { GameState, Move, Pile, PileRef } from './types.ts'

const COLUMNS = 10

function spiderDeck(difficulty: number): Card[] {
  const suits = SUITS.slice(0, difficulty)
  const copies = 8 / difficulty
  const cards: Card[] = []
  for (let c = 0; c < copies; c++) {
    for (const suit of suits) {
      for (const rank of RANKS) {
        cards.push({ id: `${c}-${suit}-${rank}`, suit, rank, faceUp: false })
      }
    }
  }
  return cards
}

export function dealSpider(seed: number, difficulty = 1): GameState {
  const deck = shuffle(spiderDeck(difficulty), seed)
  const piles: Pile[] = []
  for (let i = 0; i < COLUMNS; i++) piles.push({ kind: 'tableau', index: i, cards: [] })
  piles.push({ kind: 'stock', index: 0, cards: [] })

  // Columns 0–3 get six cards, 4–9 get five: 54 dealt, 50 left for five deals.
  let k = 0
  for (let col = 0; col < COLUMNS; col++) {
    const count = col < 4 ? 6 : 5
    for (let row = 0; row < count; row++) {
      const card = deck[k++]
      card.faceUp = row === count - 1
      piles[col].cards.push(card)
    }
  }
  const stock = piles.find((p) => p.kind === 'stock')!
  while (k < deck.length) stock.cards.push(deck[k++])

  return {
    variant: 'spider',
    piles,
    seed,
    moves: 0,
    stockPasses: 0,
    completed: 0,
    difficulty,
    draw: 1,
    won: false,
  }
}

export function spiderCanDrop(state: GameState, from: PileRef, to: PileRef, count: number): boolean {
  const src = pileAt(state, from)
  const dst = pileAt(state, to)
  if (!src || !dst) return false
  if (from.kind === 'tableau' && to.kind === 'tableau' && from.index === to.index) return false
  if (src.kind !== 'tableau' || dst.kind !== 'tableau') return false
  if (count < 1 || src.cards.length < count) return false

  const run = src.cards.slice(src.cards.length - count)
  if (!isSameSuitRun(run)) return false

  const top = topCard(dst)
  if (!top) return true
  return top.faceUp && top.suit === run[0].suit && top.rank === run[0].rank + 1
}

export function spiderExtraMoves(state: GameState): Move[] {
  const stock = state.piles.find((p) => p.kind === 'stock')
  if (!stock || stock.cards.length < COLUMNS) return []
  const tableaus = state.piles.filter((p) => p.kind === 'tableau')
  if (tableaus.some((p) => p.cards.length === 0)) return []
  return [{ type: 'deal' }]
}

/** Remove any completed K..A same-suit run from the top of a column. */
export function spiderCollect(state: GameState): void {
  for (const pile of state.piles) {
    if (pile.kind !== 'tableau' || pile.cards.length < 13) continue
    const run = pile.cards.slice(-13)
    if (!run.every((c) => c.faceUp) || run[0].rank !== 13) continue
    if (!isSameSuitRun(run)) continue
    pile.cards.splice(-13)
    state.completed++
    const top = topCard(pile)
    if (top && !top.faceUp) top.faceUp = true
  }
}

export function spiderIsWon(state: GameState): boolean {
  return state.completed >= 8
}
