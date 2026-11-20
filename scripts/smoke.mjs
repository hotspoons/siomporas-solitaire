#!/usr/bin/env node
// End-to-end interaction smoke test against a running preview/preview URL.
// Seeds a deterministic deal into localStorage, then taps cards like a player.
import { chromium, devices } from 'playwright'
import { legalMoves, newGame, serialize } from '../src/engine/game.ts'

const url = process.argv[2] ?? 'http://127.0.0.1:4173/'
const browser = await chromium.launch()
const failures = []
const ok = (cond, msg) => { if (!cond) failures.push(msg) }

for (const variant of ['klondike', 'spider', 'freecell']) {
  const state = newGame(variant, { seed: 4242, draw: 1, difficulty: 1 })
  const moves = legalMoves(state)
  const playable = moves.find((m) => m.type === 'move' && m.from.kind === 'tableau')
  const context = await browser.newContext({ ...devices['Pixel 7'] })
  const page = await context.newPage()
  page.on('pageerror', (e) => failures.push(`${variant}: ${e}`))
  await page.addInitScript((saved) => {
    if (!localStorage.getItem('siomporas-solitaire.game.v1')) {
      localStorage.setItem('siomporas-solitaire.game.v1', saved)
    }
  }, serialize(state))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Continue last game' }).click()
  await page.waitForSelector('.board[data-ready]')

  const before = await page.locator('.moves').textContent()
  if (playable && playable.type === 'move') {
    const src = state.piles.find((p) => p.kind === playable.from.kind && p.index === playable.from.index)
    const index = src.cards.length - playable.count
    await page.locator(`[data-pile="${playable.from.kind}:${playable.from.index}"] .card`).nth(index).click()
    const selected = await page.locator('.card.selected').count()
    ok(selected === playable.count, `${variant}: selected ${selected}, expected ${playable.count}`)
    const targets = await page.locator('.pile.target').count()
    ok(targets > 0, `${variant}: no highlighted targets after selecting`)
    await page.locator(`[data-pile="${playable.to.kind}:${playable.to.index}"]`).first().click()
    const after = await page.locator('.moves').textContent()
    ok(after !== before, `${variant}: move counter did not change (${before} -> ${after})`)
    const selectedAfter = await page.locator('.card.selected').count()
    ok(selectedAfter === 0, `${variant}: selection not cleared after move`)
  }

  await page.getByRole('button', { name: 'Undo' }).click()
  await page.waitForTimeout(100)

  const stock = page.locator('.stock')
  if (await stock.count()) {
    const movesBefore = await page.locator('.moves').textContent()
    await stock.click()
    await page.waitForTimeout(150)
    const movesAfter = await page.locator('.moves').textContent()
    ok(movesAfter !== movesBefore, `${variant}: stock click did not advance the game`)
  }

  // Reload: the persisted game should still be there and resumable.
  await page.reload({ waitUntil: 'networkidle' })
  const resume = page.getByRole('button', { name: 'Continue last game' })
  ok((await resume.count()) > 0, `${variant}: game did not survive a reload`)
  console.log(`${variant}: ok`)
  await context.close()
}

await browser.close()
if (failures.length) {
  console.error(`FAILURES:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log('smoke: all interactions passed')
