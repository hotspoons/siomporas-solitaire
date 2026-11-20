import { randomSeed } from './cards.ts'
import type { Card } from './cards.ts'
import { dealKlondike, klondikeCanDrop, klondikeExtraMoves, klondikeIsWon } from './klondike.ts'
import { dealSpider, spiderCanDrop, spiderCollect, spiderExtraMoves, spiderIsWon } from './spider.ts'
import { dealFreecell, freecellCanDrop, freecellExtraMoves, freecellIsWon } from './freecell.ts'
import { isAltRun, isSameSuitRun, pileAt, topCard } from './moves.ts'
import type { DealOptions, GameState, Move, PileRef, Variant } from './types.ts'

interface VariantModule {
  deal(seed: number, opts: DealOptions): GameState
  canDrop(state: GameState, from: PileRef, to: PileRef, count: number): boolean
  extraMoves(state: GameState): Move[]
  isWon(state: GameState): boolean
  afterMove?(state: GameState): void
  runValid: (cards: readonly Card[]) => boolean
}

const MODULES: Record<Variant, VariantModule> = {
  klondike: {
    deal: (seed, o) => dealKlondike(seed, o.draw ?? 1),
    canDrop: klondikeCanDrop,
    extraMoves: klondikeExtraMoves,
    isWon: klondikeIsWon,
    runValid: isAltRun,
  },
  spider: {
    deal: (seed, o) => dealSpider(seed, o.difficulty ?? 1),
    canDrop: spiderCanDrop,
    extraMoves: spiderExtraMoves,
    isWon: spiderIsWon,
    afterMove: spiderCollect,
    runValid: isSameSuitRun,
  },
  freecell: {
    deal: (seed) => dealFreecell(seed),
    canDrop: freecellCanDrop,
    extraMoves: freecellExtraMoves,
    isWon: freecellIsWon,
    runValid: isAltRun,
  },
}

export const VARIANTS: readonly Variant[] = ['klondike', 'spider', 'freecell']

export function variantLabel(variant: Variant): string {
  switch (variant) {
    case 'klondike':
      return 'Klondike'
    case 'spider':
      return 'Spider'
    case 'freecell':
      return 'FreeCell'
  }
}

export function newGame(variant: Variant, opts: DealOptions = {}): GameState {
  const seed = opts.seed ?? randomSeed()
  return MODULES[variant].deal(seed, opts)
}

export function canDrop(state: GameState, from: PileRef, to: PileRef, count: number): boolean {
  return MODULES[state.variant].canDrop(state, from, to, count)
}

/** Every legal move, used for hints and for highlighting destinations. */
export function legalMoves(state: GameState): Move[] {
  const mod = MODULES[state.variant]
  const moves: Move[] = [...mod.extraMoves(state)]
  const sources = state.piles.filter((p) => p.kind !== 'stock')
  const targets = state.piles.filter((p) => p.kind !== 'stock' && p.kind !== 'waste')

  for (const src of sources) {
    for (let start = 0; start < src.cards.length; start++) {
      const count = src.cards.length - start
      const run = src.cards.slice(start)
      if (!mod.runValid(run)) continue
      const from: PileRef = { kind: src.kind, index: src.index }
      for (const dst of targets) {
        const to: PileRef = { kind: dst.kind, index: dst.index }
        if (from.kind === to.kind && from.index === to.index) continue
        if (mod.canDrop(state, from, to, count)) moves.push({ type: 'move', from, to, count })
      }
    }
  }
  return moves
}

/** Legal destinations for the run of `count` cards at the top of `from`. */
export function legalTargets(state: GameState, from: PileRef, count: number): PileRef[] {
  const out: PileRef[] = []
  for (const dst of state.piles) {
    if (dst.kind === 'stock' || dst.kind === 'waste') continue
    if (dst.kind === from.kind && dst.index === from.index) continue
    const to: PileRef = { kind: dst.kind, index: dst.index }
    if (MODULES[state.variant].canDrop(state, from, to, count)) out.push(to)
  }
  return out
}

/** The foundation a single card can go to right now, if any. */
export function foundationMove(state: GameState, from: PileRef): Move | null {
  const src = pileAt(state, from)
  if (!src || src.cards.length === 0) return null
  for (const dst of state.piles) {
    if (dst.kind !== 'foundation') continue
    const to: PileRef = { kind: 'foundation', index: dst.index }
    if (MODULES[state.variant].canDrop(state, from, to, 1)) {
      return { type: 'move', from, to, count: 1 }
    }
  }
  return null
}

function finish(state: GameState): GameState {
  const mod = MODULES[state.variant]
  mod.afterMove?.(state)
  state.moves++
  state.won = mod.isWon(state)
  return state
}

export function applyMove(state: GameState, move: Move): GameState | null {
  const next = structuredClone(state)
  switch (move.type) {
    case 'draw':
      return draw(next)
    case 'recycle':
      return recycle(next)
    case 'deal':
      return dealStock(next)
    case 'move':
      return moveCards(next, move)
  }
}

function draw(state: GameState): GameState | null {
  if (state.variant !== 'klondike') return null
  const stock = state.piles.find((p) => p.kind === 'stock')
  const waste = state.piles.find((p) => p.kind === 'waste')
  if (!stock || !waste || stock.cards.length === 0) return null
  const k = Math.min(state.draw, stock.cards.length)
  const cards = stock.cards.splice(stock.cards.length - k, k)
  for (const card of cards) card.faceUp = true
  waste.cards.push(...cards)
  return finish(state)
}

function recycle(state: GameState): GameState | null {
  if (state.variant !== 'klondike') return null
  const stock = state.piles.find((p) => p.kind === 'stock')
  const waste = state.piles.find((p) => p.kind === 'waste')
  if (!stock || !waste || stock.cards.length > 0 || waste.cards.length === 0) return null
  stock.cards = waste.cards.reverse()
  for (const card of stock.cards) card.faceUp = false
  waste.cards = []
  state.stockPasses++
  return finish(state)
}

function dealStock(state: GameState): GameState | null {
  if (state.variant !== 'spider') return null
  const stock = state.piles.find((p) => p.kind === 'stock')
  const tableaus = state.piles.filter((p) => p.kind === 'tableau')
  if (!stock || stock.cards.length < tableaus.length) return null
  if (tableaus.some((p) => p.cards.length === 0)) return null
  for (const pile of tableaus) {
    const card = stock.cards.pop()
    if (!card) return null
    card.faceUp = true
    pile.cards.push(card)
  }
  return finish(state)
}

function moveCards(state: GameState, move: Extract<Move, { type: 'move' }>): GameState | null {
  if (!canDrop(state, move.from, move.to, move.count)) return null
  const src = pileAt(state, move.from)
  const dst = pileAt(state, move.to)
  if (!src || !dst) return null
  const cards = src.cards.splice(src.cards.length - move.count, move.count)
  dst.cards.push(...cards)
  if (src.kind === 'tableau') {
    const top = topCard(src)
    if (top && !top.faceUp) top.faceUp = true
  }
  return finish(state)
}

export function serialize(state: GameState): string {
  return JSON.stringify(state)
}

export function deserialize(raw: string | null): GameState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as GameState
    if (!parsed || !Array.isArray(parsed.piles) || !VARIANTS.includes(parsed.variant)) return null
    if (!parsed.piles.every((p) => typeof p.kind === 'string' && Array.isArray(p.cards))) return null
    return parsed
  } catch {
    return null
  }
}

export function isStockEmpty(state: GameState): boolean {
  const stock = state.piles.find((p) => p.kind === 'stock')
  return !stock || stock.cards.length === 0
}

/** Cards the player may pick up from `cardIndex` to the end of the pile. */
export function selectableCount(state: GameState, ref: PileRef, cardIndex: number): number {
  const pile = pileAt(state, ref)
  if (!pile || pile.kind === 'stock') return 0
  if (cardIndex < 0 || cardIndex >= pile.cards.length) return 0
  if (pile.kind !== 'tableau') {
    return cardIndex === pile.cards.length - 1 ? 1 : 0
  }
  const run = pile.cards.slice(cardIndex)
  return MODULES[state.variant].runValid(run) ? run.length : 0
}
