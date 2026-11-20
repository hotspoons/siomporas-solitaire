import { randomSeed, shuffle } from './cards.ts'
import type { Card } from './cards.ts'
import type { GameState } from './types.ts'
import { refOf } from './types.ts'
import { applyMove, foundationMove } from './game.ts'

/**
 * Cheats are pure state transforms: the app snapshots the old state for Undo
 * before committing these, exactly like a normal move.
 */

/** Keep every face-up card where it is; shuffle the face-down ones among the
 *  slots they already occupy. The stock, the deal and the exposed runs stay put,
 *  so the table you were reading is still the table you were reading. */
export function shuffleHidden(state: GameState, seed = randomSeed()): GameState {
  const next = structuredClone(state)
  const hidden: Card[] = []
  for (const pile of next.piles) {
    for (const card of pile.cards) if (!card.faceUp) hidden.push(card)
  }
  if (hidden.length < 2) return next
  const mixed = shuffle(hidden, seed)
  let i = 0
  for (const pile of next.piles) {
    for (let k = 0; k < pile.cards.length; k++) {
      if (!pile.cards[k].faceUp) pile.cards[k] = mixed[i++]
    }
  }
  return next
}

/** Send every card that is already legal on a foundation home, repeating until
 *  nothing else fits. Klondike and FreeCell only: Spider foundations take a
 *  whole K..A set at once, so there is nothing single-card to send. */
export function sendHome(state: GameState): GameState | null {
  if (state.variant === 'spider') return null
  let next = state
  let sent = 0
  for (let guard = 0; guard < 400; guard++) {
    let moved = false
    for (const pile of next.piles) {
      if (pile.kind === 'stock' || pile.kind === 'foundation' || pile.cards.length === 0) continue
      const move = foundationMove(next, refOf(pile))
      if (!move) continue
      const after = applyMove(next, move)
      if (after) {
        next = after
        sent++
        moved = true
        break
      }
    }
    if (!moved) break
  }
  return sent > 0 ? next : null
}
