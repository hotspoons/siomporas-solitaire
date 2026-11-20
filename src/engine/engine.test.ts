import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeDeck, rankLabel, shuffle } from './cards.ts'
import { dealFreecell, freecellCanDrop, freecellCapacity } from './freecell.ts'
import { applyMove, legalMoves, newGame } from './game.ts'
import { dealKlondike, klondikeCanDrop } from './klondike.ts'
import { dealSpider, spiderCanDrop, spiderCollect } from './spider.ts'
import type { Card } from './cards.ts'
import type { GameState, PileRef } from './types.ts'

const ref = (kind: PileRef['kind'], index: number): PileRef => ({ kind, index })

function card(suit: Card['suit'], rank: Card['rank'], faceUp = true): Card {
  return { id: `${suit}-${rank}-${Math.random()}`, suit, rank, faceUp }
}

function freshSpider(): GameState {
  const state = dealSpider(42, 1)
  for (const p of state.piles) p.cards = []
  return state
}

test('deck: 52 unique cards, seeded shuffle is reproducible', () => {
  const deck = makeDeck(1)
  assert.equal(deck.length, 52)
  assert.equal(new Set(deck.map((c) => c.id)).size, 52)
  assert.deepEqual(shuffle(deck, 7).map((c) => c.id), shuffle(deck, 7).map((c) => c.id))
  assert.notDeepEqual(shuffle(deck, 7).map((c) => c.id), shuffle(deck, 8).map((c) => c.id))
})

test('rank labels', () => {
  assert.equal(rankLabel(1), 'A')
  assert.equal(rankLabel(10), '10')
  assert.equal(rankLabel(11), 'J')
  assert.equal(rankLabel(13), 'K')
})

test('klondike deal invariants', () => {
  const state = dealKlondike(123, 1)
  const tables = state.piles.filter((p) => p.kind === 'tableau')
  assert.equal(tables.length, 7)
  assert.deepEqual(tables.map((p) => p.cards.length), [1, 2, 3, 4, 5, 6, 7])
  for (const pile of tables) {
    assert.equal(pile.cards.filter((c) => c.faceUp).length, 1)
    assert.equal(pile.cards[pile.cards.length - 1].faceUp, true)
  }
  const stock = state.piles.find((p) => p.kind === 'stock')!
  assert.equal(stock.cards.length, 24)
  assert.equal(state.piles.filter((p) => p.kind === 'foundation').length, 4)
})

test('klondike draw moves cards to the waste and recycle restores the stock', () => {
  let state = dealKlondike(5, 3)
  const before = state.piles.find((p) => p.kind === 'stock')!.cards.length
  state = applyMove(state, { type: 'draw' })!
  const stock = state.piles.find((p) => p.kind === 'stock')!
  const waste = state.piles.find((p) => p.kind === 'waste')!
  assert.equal(stock.cards.length, before - 3)
  assert.equal(waste.cards.length, 3)
  assert.ok(waste.cards.every((c) => c.faceUp))

  for (let i = 0; i < 20; i++) {
    const now = state.piles.find((p) => p.kind === 'stock')!
    if (now.cards.length === 0) break
    state = applyMove(state, { type: 'draw' })!
  }
  const emptyStock = state.piles.find((p) => p.kind === 'stock')!
  assert.equal(emptyStock.cards.length, 0)
  state = applyMove(state, { type: 'recycle' })!
  const refilled = state.piles.find((p) => p.kind === 'stock')!
  assert.equal(refilled.cards.length, 24)
  assert.ok(refilled.cards.every((c) => !c.faceUp))
})

test('klondike tableau rules: colour alternation, kings only on empty', () => {
  const state = dealKlondike(9, 1)
  const tables = state.piles.filter((p) => p.kind === 'tableau')
  tables[0].cards = [card('spades', 5, false), card('hearts', 8)]
  tables[1].cards = [card('clubs', 9)]
  tables[2].cards = []

  assert.equal(klondikeCanDrop(state, ref('tableau', 0), ref('tableau', 1), 1), true)
  assert.equal(klondikeCanDrop(state, ref('tableau', 1), ref('tableau', 0), 1), false)
  assert.equal(klondikeCanDrop(state, ref('tableau', 1), ref('tableau', 2), 1), false)

  const kings = dealKlondike(9, 1)
  kings.piles.filter((p) => p.kind === 'tableau')[0].cards = [card('spades', 13)]
  kings.piles.filter((p) => p.kind === 'tableau')[2].cards = []
  assert.equal(klondikeCanDrop(kings, ref('tableau', 0), ref('tableau', 2), 1), true)
})

test('klondike foundations: ace first, same suit, ascending', () => {
  const state = dealKlondike(11, 1)
  const tables = state.piles.filter((p) => p.kind === 'tableau')
  const founds = state.piles.filter((p) => p.kind === 'foundation')
  tables[0].cards = [card('hearts', 1)]
  assert.equal(klondikeCanDrop(state, ref('tableau', 0), ref('foundation', 0), 1), true)
  tables[0].cards = [card('hearts', 2)]
  assert.equal(klondikeCanDrop(state, ref('tableau', 0), ref('foundation', 0), 1), false)
  founds[0].cards = [card('hearts', 1)]
  tables[0].cards = [card('spades', 2)]
  assert.equal(klondikeCanDrop(state, ref('tableau', 0), ref('foundation', 0), 1), false)
  tables[0].cards = [card('hearts', 2)]
  assert.equal(klondikeCanDrop(state, ref('tableau', 0), ref('foundation', 0), 1), true)
})

test('klondike: only the face-up run can be moved', () => {
  const state = dealKlondike(3, 1)
  const tables = state.piles.filter((p) => p.kind === 'tableau')
  tables[0].cards = [card('spades', 9, false), card('hearts', 8), card('clubs', 7)]
  tables[1].cards = [card('clubs', 9)]
  assert.equal(klondikeCanDrop(state, ref('tableau', 0), ref('tableau', 1), 2), true)
  assert.equal(klondikeCanDrop(state, ref('tableau', 0), ref('tableau', 1), 3), false)
})

test('spider deal: 104 cards, 54 on the table, 50 in stock', () => {
  const state = dealSpider(77, 1)
  const tables = state.piles.filter((p) => p.kind === 'tableau')
  const stock = state.piles.find((p) => p.kind === 'stock')!
  assert.equal(tables.length, 10)
  assert.deepEqual(tables.map((p) => p.cards.length), [6, 6, 6, 6, 5, 5, 5, 5, 5, 5])
  assert.equal(stock.cards.length, 50)
  const all = [...tables.flatMap((p) => p.cards), ...stock.cards]
  assert.equal(all.length, 104)
})

test('spider moves only same-suit descending runs; empty column takes anything', () => {
  const state = freshSpider()
  const tables = state.piles.filter((p) => p.kind === 'tableau')
  tables[0].cards = [card('spades', 8), card('spades', 7)]
  tables[1].cards = [card('spades', 9)]
  tables[2].cards = []
  tables[3].cards = [card('hearts', 9)]
  assert.equal(spiderCanDrop(state, ref('tableau', 0), ref('tableau', 1), 2), true)
  assert.equal(spiderCanDrop(state, ref('tableau', 0), ref('tableau', 3), 2), false)
  tables[0].cards = [card('spades', 8), card('hearts', 7)]
  assert.equal(spiderCanDrop(state, ref('tableau', 0), ref('tableau', 1), 2), false)
  tables[0].cards = [card('clubs', 13)]
  assert.equal(spiderCanDrop(state, ref('tableau', 0), ref('tableau', 2), 1), true)
  tables[0].cards = [card('clubs', 13), card('diamonds', 4)]
  assert.equal(spiderCanDrop(state, ref('tableau', 0), ref('tableau', 2), 2), false)
})

test('spider collects a completed K..A run and flips the new top', () => {
  const state = freshSpider()
  const pile = state.piles.find((p) => p.kind === 'tableau' && p.index === 0)!
  const run: Card[] = []
  for (let rank = 13; rank >= 1; rank--) run.push(card('hearts', rank as Card['rank']))
  pile.cards = [card('clubs', 6, false), ...run]
  spiderCollect(state)
  assert.equal(state.completed, 1)
  assert.equal(pile.cards.length, 1)
  assert.equal(pile.cards[0].faceUp, true)
})

test('spider stock deal is blocked while a column is empty', () => {
  const state = dealSpider(4, 1)
  const stockBefore = state.piles.find((p) => p.kind === 'stock')!.cards.length
  const moved = applyMove(state, { type: 'deal' })!
  assert.equal(moved.piles.find((p) => p.kind === 'stock')!.cards.length, stockBefore - 10)

  const blocked = dealSpider(4, 1)
  blocked.piles.find((p) => p.kind === 'tableau' && p.index === 0)!.cards = []
  assert.equal(applyMove(blocked, { type: 'deal' }), null)
})

test('freecell deal: 52 face-up cards across 8 columns, 4 free cells', () => {
  const state = dealFreecell(21)
  const tables = state.piles.filter((p) => p.kind === 'tableau')
  assert.deepEqual(tables.map((p) => p.cards.length), [7, 7, 7, 7, 6, 6, 6, 6])
  assert.ok(tables.every((p) => p.cards.every((c) => c.faceUp)))
  assert.equal(state.piles.filter((p) => p.kind === 'freecell').length, 4)
})

test('freecell: one card per free cell; runs limited by capacity', () => {
  const state = dealFreecell(33)
  const tables = state.piles.filter((p) => p.kind === 'tableau')
  const cells = state.piles.filter((p) => p.kind === 'freecell')
  // Leave no empty columns, so capacity is governed by the free cells alone.
  tables.forEach((t, i) => (t.cards = [card('clubs', ((i % 12) + 1) as Card['rank'])]))
  for (const c of cells) c.cards = []

  tables[0].cards = [card('spades', 8), card('hearts', 7), card('clubs', 6)]
  tables[1].cards = [card('diamonds', 9)]
  assert.equal(freecellCapacity(state, ref('tableau', 1)), 5)
  assert.equal(freecellCanDrop(state, ref('tableau', 0), ref('tableau', 1), 3), true)

  cells[0].cards = [card('clubs', 2)]
  assert.equal(freecellCapacity(state, ref('tableau', 1)), 4)
  assert.equal(freecellCanDrop(state, ref('tableau', 0), ref('freecell', 1), 1), true)
  assert.equal(freecellCanDrop(state, ref('tableau', 0), ref('freecell', 0), 1), false)

  // A six-card run cannot fit in five slots; five can go to an empty column.
  for (const c of cells) c.cards = []
  tables[0].cards = [
    card('spades', 13),
    card('hearts', 12),
    card('clubs', 11),
    card('diamonds', 10),
    card('spades', 9),
    card('hearts', 8),
  ]
  tables[7].cards = []
  assert.equal(freecellCapacity(state, ref('tableau', 7)), 5)
  assert.equal(freecellCanDrop(state, ref('tableau', 0), ref('tableau', 7), 6), false)
  assert.equal(freecellCanDrop(state, ref('tableau', 0), ref('tableau', 7), 5), true)
})

test('legalMoves never returns a move applyMove rejects', () => {
  for (const variant of ['klondike', 'spider', 'freecell'] as const) {
    const state = newGame(variant, { seed: 101 })
    for (const move of legalMoves(state).slice(0, 25)) {
      assert.notEqual(applyMove(state, move), null, `${variant} ${JSON.stringify(move)}`)
    }
  }
})

test('seeded deals are reproducible', () => {
  const a = newGame('klondike', { seed: 999 })
  const b = newGame('klondike', { seed: 999 })
  assert.equal(JSON.stringify(a), JSON.stringify(b))
})
