import { isRed } from './cards.ts'
import type { Card } from './cards.ts'
import type { GameState, Pile, PileRef } from './types.ts'

export function pileAt(state: GameState, ref: PileRef): Pile | undefined {
  return state.piles.find((p) => p.kind === ref.kind && p.index === ref.index)
}

export function topCard(pile: Pile): Card | undefined {
  return pile.cards[pile.cards.length - 1]
}

export function isFaceUpRun(cards: readonly Card[]): boolean {
  return cards.every((c) => c.faceUp)
}

/** Strictly descending ranks, 13 → 1. */
export function isDescending(cards: readonly Card[]): boolean {
  for (let i = 1; i < cards.length; i++) {
    if (cards[i - 1].rank !== cards[i].rank + 1) return false
  }
  return true
}

/** Face up, descending, alternating colours (Klondike, FreeCell). */
export function isAltRun(cards: readonly Card[]): boolean {
  if (!isFaceUpRun(cards) || !isDescending(cards)) return false
  for (let i = 1; i < cards.length; i++) {
    if (isRed(cards[i - 1].suit) === isRed(cards[i].suit)) return false
  }
  return true
}

/** Face up, descending, one suit (Spider). */
export function isSameSuitRun(cards: readonly Card[]): boolean {
  if (!isFaceUpRun(cards) || !isDescending(cards)) return false
  for (let i = 1; i < cards.length; i++) {
    if (cards[i - 1].suit !== cards[i].suit) return false
  }
  return true
}

export function canPlaceOnFoundation(card: Card, foundation: Pile): boolean {
  const top = topCard(foundation)
  if (!top) return card.rank === 1
  return top.suit === card.suit && card.rank === top.rank + 1
}

/** The longest face-up run ending at `startIndex` that follows `valid`. */
export function runFrom(cards: readonly Card[], startIndex: number, valid: (run: readonly Card[]) => boolean): Card[] {
  if (startIndex < 0 || startIndex >= cards.length) return []
  const run = cards.slice(startIndex)
  return valid(run) ? run : []
}

export function countFaceDown(pile: Pile): number {
  return pile.cards.filter((c) => !c.faceUp).length
}
