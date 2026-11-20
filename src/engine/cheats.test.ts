import test from 'node:test'
import assert from 'node:assert/strict'
import { foundationMove, newGame } from './game.ts'
import { sendHome, shuffleHidden } from './cheats.ts'
import type { GameState } from './types.ts'

const ids = (state: GameState): string[] =>
  state.piles.flatMap((p) => p.cards.map((c) => c.id)).sort()

test('shuffleHidden keeps every face-up card and every slot in place', () => {
  const before = newGame('klondike', { seed: 5 })
  const after = shuffleHidden(before, 7)

  assert.deepEqual(ids(after), ids(before), 'same cards, none lost or duplicated')

  before.piles.forEach((pile, pi) => {
    pile.cards.forEach((card, ci) => {
      const now = after.piles[pi].cards[ci]
      assert.equal(now.faceUp, card.faceUp, 'face-up/face-down pattern is unchanged')
      if (card.faceUp) assert.equal(now.id, card.id, 'face-up cards do not move')
    })
  })

  const changed = before.piles.some((pile, pi) =>
    pile.cards.some((card, ci) => !card.faceUp && after.piles[pi].cards[ci].id !== card.id),
  )
  assert.ok(changed, 'the face-down cards were actually shuffled')
})

test('shuffleHidden is seeded and repeatable', () => {
  const start = newGame('spider', { seed: 3 })
  assert.deepEqual(ids(shuffleHidden(start, 42)), ids(shuffleHidden(start, 42)))
})

test('sendHome leaves no legal foundation move behind', () => {
  let after: GameState | null = null
  for (let seed = 1; seed <= 60 && !after; seed++) after = sendHome(newGame('klondike', { seed }))
  assert.ok(after, 'some fresh deal exposes an ace')
  for (const pile of after.piles) {
    if (pile.kind === 'stock' || pile.kind === 'foundation' || pile.cards.length === 0) continue
    assert.equal(foundationMove(after, { kind: pile.kind, index: pile.index }), null)
  }
  const home = after.piles.filter((p) => p.kind === 'foundation').reduce((n, p) => n + p.cards.length, 0)
  assert.ok(home > 0)
})

test('sendHome is not offered for spider', () => {
  assert.equal(sendHome(newGame('spider', { seed: 1 })), null)
})
