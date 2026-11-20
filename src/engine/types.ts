import type { Card } from './cards.ts'

export type Variant = 'klondike' | 'spider' | 'freecell'
export type PileKind = 'tableau' | 'foundation' | 'stock' | 'waste' | 'freecell'

export interface Pile {
  kind: PileKind
  index: number
  cards: Card[]
}

export interface PileRef {
  kind: PileKind
  index: number
}

export type Move =
  | { type: 'move'; from: PileRef; to: PileRef; count: number }
  | { type: 'draw' }
  | { type: 'recycle' }
  | { type: 'deal' }

export interface GameState {
  variant: Variant
  piles: Pile[]
  seed: number
  moves: number
  stockPasses: number
  /** Spider: completed K..A sets. */
  completed: number
  /** Spider: 1, 2 or 4 suits. */
  difficulty: number
  /** Klondike: cards drawn at a time. */
  draw: number
  won: boolean
  /** How many cheats were used on this deal (0 or absent means none). */
  cheats?: number
}

export interface DealOptions {
  seed?: number
  difficulty?: number
  draw?: number
}

export function refKey(ref: PileRef): string {
  return `${ref.kind}:${ref.index}`
}

export function sameRef(a: PileRef, b: PileRef): boolean {
  return a.kind === b.kind && a.index === b.index
}

export function refOf(pile: Pile): PileRef {
  return { kind: pile.kind, index: pile.index }
}
