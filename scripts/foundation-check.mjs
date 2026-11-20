#!/usr/bin/env node
// Foundations: a tall pile must never grow the top row. Stacked cards share the
// ace's footprint, show a small depth edge, and the top card still drags.
import { chromium } from 'playwright'
import { newGame, serialize } from '../src/engine/game.ts'

const url = process.argv[2] ?? 'http://127.0.0.1:4173/'
const browser = await chromium.launch()
const failures = []
const ok = (cond, msg) => { if (!cond) failures.push(msg); else console.log('  ok:', msg) }

const suits = ['clubs', 'diamonds', 'hearts', 'spades']

/** A near-finished Klondike deal with deliberately uneven foundations. */
function stackedState() {
  const state = newGame('klondike', { seed: 7, draw: 3 })
  state.piles
    .filter((p) => p.kind === 'foundation')
    .forEach((p, i) => {
      const n = [13, 12, 11, 10][i] ?? 1
      p.cards = Array.from({ length: n }, (_, k) => ({
        id: `f${i}-${k}`,
        suit: suits[i],
        rank: k + 1,
        faceUp: true,
      }))
    })
  return state
}

for (const [name, viewport] of [
  ['portrait', { width: 412, height: 915 }],
  ['landscape', { width: 915, height: 412 }],
]) {
  console.log(name)
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 })
  let page = await context.newPage()
  page.on('pageerror', (e) => failures.push(`${name}: ${e.message}`))

  const seed = async (state) => {
    await page.addInitScript(
      ({ saved, prefs }) => {
        localStorage.setItem('siomporas-solitaire.game.v1', saved)
        localStorage.setItem('siomporas-solitaire.prefs.v1', prefs)
      },
      { saved: serialize(state), prefs: JSON.stringify({ variant: 'klondike', difficulty: 1, draw: 3 }) },
    )
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Continue last game' }).click()
    await page.waitForSelector('.board[data-ready]')
    await page.waitForTimeout(200)
  }

  // Empty foundations are the baseline row height.
  await seed(newGame('klondike', { seed: 7, draw: 3 }))
  const emptyTop = await page.locator('.top-row').evaluate((el) => el.getBoundingClientRect().height)

  // A fresh context so the seeded deep game replaces the saved one cleanly.
  await context.close()
  const deep = await browser.newContext({ viewport, deviceScaleFactor: 2 })
  const deepPage = await deep.newPage()
  deepPage.on('pageerror', (e) => failures.push(`${name}: ${e.message}`))
  page = deepPage
  await seed(stackedState())
  await page.screenshot({ path: `shots/foundation-${name}.png` })

  const m = await page.evaluate(() => {
    const top = document.querySelector('.top-row')
    const board = document.querySelector('.board')
    const pile = document.querySelector('[data-pile^="foundation"]')
    const cards = [...pile.querySelectorAll('.card')]
    const cardH = cards.at(-1).getBoundingClientRect().height
    const cs = (el) => getComputedStyle(el).pointerEvents
    return {
      topRowH: top.getBoundingClientRect().height,
      pileH: pile.getBoundingClientRect().height,
      cardH,
      cards: cards.length,
      buriedEvents: cards.slice(0, -1).map(cs),
      topEvents: cs(cards.at(-1)),
      boardScrollH: board.scrollHeight,
      viewH: innerHeight,
    }
  })

  ok(Math.abs(m.topRowH - m.cardH) < 4, `top row is one card tall (${Math.round(m.topRowH)} vs card ${Math.round(m.cardH)})`)
  ok(Math.abs(m.topRowH - emptyTop) < 4, `stacking did not grow the row (${Math.round(m.topRowH)} vs empty ${Math.round(emptyTop)})`)
  ok(Math.abs(m.pileH - m.cardH) < 4, `foundation pile keeps the ace footprint (${Math.round(m.pileH)})`)
  ok(m.cards === 13, 'thirteen cards stay in the pile')
  ok(m.buriedEvents.every((v) => v === 'none'), 'buried cards do not take pointer events')
  ok(m.topEvents === 'auto', 'the top card still takes pointer events')
  if (name === 'landscape') {
    ok(m.topRowH < m.viewH * 0.45, `top row leaves room for the tableau (${Math.round(m.topRowH)} of ${m.viewH})`)
  }
  await deep.close()
}

// Dropping onto a foundation still works with the compressed stack.
console.log('drop')
const dragState = newGame('klondike', { seed: 7, draw: 1 })
for (const p of dragState.piles) {
  if (p.kind === 'foundation') p.cards = []
  if (p.kind === 'waste') p.cards = [{ id: 'ace-spades', suit: 'spades', rank: 1, faceUp: true }]
}
const context = await browser.newContext({ viewport: { width: 900, height: 700 } })
const page = await context.newPage()
page.on('pageerror', (e) => failures.push(`drop: ${e.message}`))
await page.addInitScript(
  ({ saved, prefs }) => {
    localStorage.setItem('siomporas-solitaire.game.v1', saved)
    localStorage.setItem('siomporas-solitaire.prefs.v1', prefs)
  },
  { saved: serialize(dragState), prefs: JSON.stringify({ variant: 'klondike', difficulty: 1, draw: 1 }) },
)
await page.goto(url, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Continue last game' }).click()
await page.waitForSelector('.board[data-ready]')

const from = await page.locator('[data-pile^="waste"] .card').boundingBox()
const to = await page.locator('[data-pile="foundation:0"]').boundingBox()
await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
await page.mouse.down()
await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 })
await page.waitForTimeout(80)
await page.mouse.up()
await page.waitForTimeout(150)
ok((await page.locator('[data-pile="foundation:0"] .card').count()) === 1, 'ace lands on the foundation')
ok((await page.locator('[data-pile^="waste"] .card').count()) === 0, 'waste is empty after the drop')

await context.close()
await browser.close()

if (failures.length) {
  console.error('\nfoundation: FAIL')
  for (const f of failures) console.error('  -', f)
  process.exit(1)
}
console.log('\nfoundation: all checks passed')
