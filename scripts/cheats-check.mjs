#!/usr/bin/env node
// Cheats menu: shuffle hidden cards, peek, send home, and undo.
import { chromium, devices } from 'playwright'
import { newGame, serialize } from '../src/engine/game.ts'
import { sendHome } from '../src/engine/cheats.ts'

const url = process.argv[2] ?? 'http://127.0.0.1:4173/'
const browser = await chromium.launch()
const context = await browser.newContext({ ...devices['Pixel 7'] })
const page = await context.newPage()
const failures = []
const ok = (cond, msg) => { if (!cond) failures.push(msg); else console.log('  ok:', msg) }
page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`))

let seed = 1
while (seed < 60 && !sendHome(newGame('klondike', { seed }))) seed++
const saved = newGame('klondike', { seed, draw: 1 })
const hiddenBefore = saved.piles.flatMap((p) => p.cards.filter((c) => !c.faceUp).map((c) => c.id)).join()
await page.addInitScript((s) => localStorage.setItem('siomporas-solitaire.game.v1', s), serialize(saved))
await page.goto(url, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Continue last game' }).click()
await page.waitForSelector('.board[data-ready]')
ok((await page.locator('.card.peek').count()) === 0, 'no peek before asking')

const openCheats = async () => {
  // The in-game sheet, not the home screen. It stays open after a no-op cheat.
  if (!(await page.locator('.sheet').count())) {
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.waitForTimeout(150)
  }
  ok((await page.getByRole('dialog').count()) === 1, 'cheats are in the game menu')
}

await openCheats()
await page.getByRole('button', { name: 'Shuffle the face-down cards' }).click()
await page.waitForSelector('.board[data-ready]')
const afterShuffle = JSON.parse(await page.evaluate(() => localStorage.getItem('siomporas-solitaire.game.v1')))
const hiddenAfter = afterShuffle.piles.flatMap((p) => p.cards.filter((c) => !c.faceUp).map((c) => c.id)).join()
ok(hiddenAfter !== hiddenBefore, 'shuffle changed the face-down cards')
ok([...hiddenAfter].sort().join() === [...hiddenBefore].sort().join(), 'shuffle kept the same face-down cards')
ok(afterShuffle.cheats === 1, 'the cheat is recorded on the game')

await openCheats()
const home = page.getByRole('button', { name: 'Send the safe cards home' })
ok((await home.count()) === 1, 'send home is offered when it can do something')
await home.click()
await page.waitForTimeout(150)
const afterHome = JSON.parse(await page.evaluate(() => localStorage.getItem('siomporas-solitaire.game.v1')))
const fnd = afterHome.piles.filter((p) => p.kind === 'foundation').reduce((n, p) => n + p.cards.length, 0)
ok(fnd > 0, `send home put ${fnd} card(s) on the foundations`)

await openCheats()
await page.getByRole('button', { name: 'Peek at face-down cards' }).click()
await page.waitForSelector('.board[data-ready]')
ok((await page.locator('.card.peek').count()) > 0, 'peek shows face-down cards greyed out')
await page.screenshot({ path: 'shots/cheats-peek.png' })

await page.getByRole('button', { name: 'Undo' }).click()
await page.waitForTimeout(120)
const afterUndo = JSON.parse(await page.evaluate(() => localStorage.getItem('siomporas-solitaire.game.v1')))
ok((afterUndo.cheats ?? 0) === 1, 'undo took the last cheat back out of the game')

await context.close()
await browser.close()
if (failures.length) {
  console.error(`FAILURES:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log('cheats: shuffle, home, peek and undo all work')
