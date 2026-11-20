#!/usr/bin/env node
// Klondike stock/waste: draw 1 and draw 3 never grow the row, and the tableau
// does not get pushed down as cards are drawn.
import { chromium } from 'playwright'
import { newGame, serialize } from '../src/engine/game.ts'

const url = process.argv[2] ?? 'http://127.0.0.1:4173/'
const browser = await chromium.launch()
const failures = []
const ok = (cond, msg) => { if (!cond) failures.push(msg); else console.log('  ok:', msg) }

for (const draw of [1, 3]) {
  const context = await browser.newContext({ viewport: { width: 900, height: 700 } })
  const page = await context.newPage()
  page.on('pageerror', (e) => failures.push(`draw ${draw}: ${e.message}`))
  await page.addInitScript(
    ({ saved, prefs }) => {
      localStorage.setItem('siomporas-solitaire.game.v1', saved)
      localStorage.setItem('siomporas-solitaire.prefs.v1', prefs)
    },
    {
      saved: serialize(newGame('klondike', { seed: 99, draw })),
      prefs: JSON.stringify({ variant: 'klondike', difficulty: 1, draw }),
    },
  )
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Continue last game' }).click()
  await page.waitForSelector('.board[data-ready]')

  const tableauTop = () => page.locator('.tableau').evaluate((el) => Math.round(el.getBoundingClientRect().top))
  const before = await tableauTop()
  const stock = page.locator('.stock')
  for (let i = 0; i < 9; i++) {
    await stock.click()
    await page.waitForTimeout(60)
  }
  for (let i = 0; i < 60 && (await page.locator('.stock .count').count()); i++) {
    await stock.click()
    await page.waitForTimeout(20)
  }
  await stock.click() // recycle
  await page.waitForTimeout(80)
  for (let i = 0; i < 4; i++) {
    await stock.click()
    await page.waitForTimeout(40)
  }
  const after = await tableauTop()
  ok(after === before, `draw ${draw}: drawing does not push the tableau down (${before} -> ${after})`)

  const shown = await page.locator('.pile.waste .card').count()
  ok(shown === draw, `draw ${draw}: waste shows ${shown} card(s), expected ${draw}`)

  const heights = await page.evaluate(() => {
    const pile = document.querySelector('.pile.waste')
    const card = pile.querySelector('.card')
    const cards = [...pile.querySelectorAll('.card')]
    return {
      pile: Math.round(pile.getBoundingClientRect().height),
      card: Math.round(card.getBoundingClientRect().height),
      spread: Math.round(
        cards[cards.length - 1].getBoundingClientRect().right - cards[0].getBoundingClientRect().left,
      ),
    }
  })
  ok(Math.abs(heights.pile - heights.card) <= 2, `draw ${draw}: waste row is one card tall (${heights.pile} vs ${heights.card})`)
  if (draw === 3) ok(heights.spread > heights.card, `draw 3: waste is fanned (${heights.spread}px wide for one ${heights.card}px card)`)

  await page.screenshot({ path: `shots/waste-draw${draw}.png` })
  await context.close()
}

await browser.close()
if (failures.length) {
  console.error(`FAILURES:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log('waste: draw 1 and draw 3 both stack in place')
