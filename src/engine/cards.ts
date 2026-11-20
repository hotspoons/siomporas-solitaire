export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface Card {
  id: string
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export const SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

export function isRed(suit: Suit): boolean {
  return suit === 'diamonds' || suit === 'hearts'
}

export function rankLabel(rank: Rank): string {
  switch (rank) {
    case 1:
      return 'A'
    case 11:
      return 'J'
    case 12:
      return 'Q'
    case 13:
      return 'K'
    default:
      return String(rank)
  }
}

export function suitGlyph(suit: Suit): string {
  switch (suit) {
    case 'clubs':
      return '♣'
    case 'diamonds':
      return '♦'
    case 'hearts':
      return '♥'
    case 'spades':
      return '♠'
  }
}

/** A full 52-card deck (or several), all face down, with stable ids. */
export function makeDeck(decks = 1): Card[] {
  const cards: Card[] = []
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ id: `${d}-${suit}-${rank}`, suit, rank, faceUp: false })
      }
    }
  }
  return cards
}

/** Small, fast, seedable PRNG so a seed always reproduces the same deal. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice()
  const rand = mulberry32(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff)
}
