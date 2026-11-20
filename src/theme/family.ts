import type { Rank, Suit } from '../engine/cards.ts'

/**
 * Family faces: who appears on the court cards.
 *
 * Fill this in when the artwork arrives. `FAMILY` is empty by default, which
 * means the normal J/Q/K pips; as soon as a suit has an entry, its court cards
 * show that person. Pictures live in `public/family/` (see docs/FAMILY.md) and
 * are cached offline with the rest of the app.
 */
export interface FamilyMember {
  /** Read aloud and printed under the picture. */
  name: string
  /** e.g. '/family/hearts-q.png'. Without one, the initials are shown. */
  image?: string
}

export interface SuitFamily {
  /** The person this suit belongs to. */
  suit: FamilyMember
  /** Where their picture shows: court cards only (default) or every card. */
  faces?: 'court' | 'all'
  j?: FamilyMember
  q?: FamilyMember
  k?: FamilyMember
}

export const FAMILY: Partial<Record<Suit, SuitFamily>> = {}

export function memberFor(suit: Suit, rank: Rank): FamilyMember | null {
  const family = FAMILY[suit]
  if (!family) return null
  if (rank === 11) return family.j ?? family.suit
  if (rank === 12) return family.q ?? family.suit
  if (rank === 13) return family.k ?? family.suit
  return family.faces === 'all' ? family.suit : null
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
