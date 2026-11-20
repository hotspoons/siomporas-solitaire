#!/usr/bin/env node
// Drag-and-drop check: mouse on a desktop viewport, touch on a Pixel 7.
import { chromium, devices } from 'playwright'
import { legalMoves, newGame, serialize } from '../src/engine/game.ts'

const url = process.argv[2] ?? 'http://127.0.0.1:4173/'
const variant = process.argv[3] ?? 'klondike'

const state = newGame(variant, { seed: 4242, draw: 1, difficulty: 1 })
const move = legalMoves(state).find(
  (m) => m.type === 'move' && m.from.kind === 'tableau' && m.to.kind === 'tableau',
)
if (!move || move.type !== 'move') throw new Error('no tableau move to test')

const src = state.piles.find((p) => p.kind === move.from.kind && p.index === move.from.index)
const index = src.cards.length - move.count

const failures = []
const ok = (cond, msg) => { if (!cond) failures.push(msg); else console.log('  ok:', msg) }

async function open(context) {
  const page = await context.newPage()
  page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`))
  await page.addInitScript((saved) => localStorage.setItem('siomporas-solitaire.game.v1', saved), serialize(state))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Continue last game' }).click()
  await page.waitForSelector('.board[data-ready]')
  return page
}

async function points(page) {
  const from = page.locator(`[data-pile="${move.from.kind}:${move.from.index}"] .card`).nth(index)
  const to = page.locator(`[data-pile="${move.to.kind}:${move.to.index}"]`).first()
  await from.scrollIntoViewIfNeeded()
  await to.scrollIntoViewIfNeeded()
  await from.scrollIntoViewIfNeeded()
  const a = await from.boundingBox()
  const b = await to.boundingBox()
  const vp = page.viewportSize()
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
  return {
    from: { x: clamp(a.x + a.width / 2, 8, vp.width - 8), y: clamp(a.y + a.height / 2, 8, vp.height - 8) },
    to: { x: clamp(b.x + b.width / 2, 8, vp.width - 8), y: clamp(b.y + Math.min(24, b.height / 2), 8, vp.height - 8) },
  }
}

const browser = await chromium.launch()

// --- mouse ---
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await open(context)
  const { from, to } = await points(page)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 14 })
  await page.waitForTimeout(120)
  ok((await page.locator('.drag-layer').count()) === 1, 'mouse: ghost follows the pointer')
  ok((await page.locator('.drag-src').count()) === move.count, 'mouse: source cards hidden')
  ok((await page.locator('.pile.drop-hover').count()) === 1, 'mouse: hovered target highlighted')
  ok((await page.locator('.drag-stack.can-land').count()) === 1, 'mouse: playable drag is marked')
  const breathe = await page.locator('.drag-stack').evaluate((el) => getComputedStyle(el).animationName)
  ok(breathe === 'drag-breathe', `mouse: floating playable card pulses (${breathe})`)
  const selection = await page.evaluate(() => window.getSelection()?.toString() ?? '')
  ok(selection === '', `mouse: no text selected (${JSON.stringify(selection)})`)
  await page.screenshot({ path: 'shots/drag-desktop.png' })
  await page.mouse.up()
  await page.waitForTimeout(200)
  ok((await page.locator('.drag-layer').count()) === 0, 'mouse: ghost removed after drop')
  ok((await page.locator('.moves').textContent()) !== '0 moves', 'mouse: drop played the move')
  await context.close()
}

// --- mouse: picking a playable card up by tap leaves it pulsing too ---
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await open(context)
  const box = await page.locator(`[data-pile="${move.from.kind}:${move.from.index}"] .card`).nth(index).boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(80)
  const pulsing = page.locator('.card.selected.can-land')
  ok((await pulsing.count()) === 1, 'mouse: selected playable card is marked')
  const breathe = await pulsing.evaluate((el) => getComputedStyle(el).animationName)
  ok(breathe === 'card-breathe', `mouse: selected card pulses (${breathe})`)
  await context.close()
}

// --- touch ---
{
  const phone = devices['Pixel 7']
  const viewport = variant === 'klondike' ? { width: 412, height: 915 } : { width: 915, height: 412 }
  const context = await browser.newContext({ ...phone, viewport })
  const page = await open(context)
  const cdp = await context.newCDPSession(page)
  const { from, to } = await points(page)
  const touch = (type, p) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: p ? [{ x: p.x, y: p.y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] : [],
    })
  const slide = async (a, b, steps = 12) => {
    for (let i = 1; i <= steps; i++) {
      await touch('touchMove', { x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps })
      await page.waitForTimeout(16)
    }
  }
  if (process.env.DEBUG_DRAG) console.log('  touch viewport', JSON.stringify(viewport), 'from', JSON.stringify(from), 'to', JSON.stringify(to))
  await touch('touchStart', from)
  // On a board that scrolls, a finger rests briefly before it picks a card up;
  // a quick vertical swipe is a scroll. Hold, then drag.
  await page.waitForTimeout(200)
  await slide(from, to)
  ok((await page.locator('.drag-layer').count()) === 1, 'touch: ghost follows the finger')
  await page.screenshot({ path: `shots/drag-touch-${variant}.png` })
  await touch('touchEnd')
  await page.waitForTimeout(250)
  ok((await page.locator('.drag-layer').count()) === 0, 'touch: ghost removed after release')
  ok((await page.locator('.moves').textContent()) !== '0 moves', 'touch: release played the move')

  // Full screen button: present and tappable (headless Chromium grants it).
  const fs = page.getByRole('button', { name: 'Full screen' })
  ok((await fs.count()) === 1, 'touch: full screen button is on the toolbar')
  await fs.tap()
  await page.waitForTimeout(250)
  ok(await page.evaluate(() => !!document.fullscreenElement), 'touch: full screen engaged')
  await context.close()
}

// --- touch: dragging to the edge scrolls a board that is wider than the phone ---
if (variant === 'spider') {
  const context = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 412, height: 915 } })
  const page = await open(context)
  const cdp = await context.newCDPSession(page)
  const { from } = await points(page)
  const touch = (type, p) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: p ? [{ x: p.x, y: p.y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] : [],
    })
  await touch('touchStart', from)
  await page.waitForTimeout(200)
  const edgeX = 405
  for (let i = 1; i <= 12; i++) {
    await touch('touchMove', { x: from.x + ((edgeX - from.x) * i) / 12, y: from.y })
    await page.waitForTimeout(16)
  }
  await page.waitForTimeout(700)
  const scrolled = await page.evaluate(() => document.querySelector('.board').scrollLeft)
  ok(scrolled > 0, `touch: dragging to the edge scrolls the board (scrollLeft ${scrolled})`)
  await touch('touchEnd')
  await context.close()
}

// --- touch: scrubbing the board in landscape must scroll, not rewind it ---
if (variant === 'klondike') {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    viewport: { width: 915, height: 412 },
  })
  const page = await open(context)
  const cdp = await context.newCDPSession(page)
  const board = page.locator('.board')
  const metrics = await board.evaluate((el) => ({
    max: el.scrollHeight - el.clientHeight,
    top: el.getBoundingClientRect().top,
  }))
  ok(metrics.max > 40, `landscape: board scrolls (${metrics.max}px)`)
  const before = Math.round(metrics.max / 2)
  await board.evaluate((el, top) => { el.scrollTop = top }, before)

  const card = page.locator('.board .card.face').first()
  const box = await card.boundingBox()
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
  const from = {
    x: clamp(box.x + box.width / 2, 8, 907),
    y: clamp(box.y + box.height / 2, 80, 320),
  }
  const touch = (type, p) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: p ? [{ x: p.x, y: p.y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] : [],
    })
  await touch('touchStart', from)
  for (let i = 1; i <= 10; i++) {
    await touch('touchMove', { x: from.x, y: Math.max(10, from.y - i * 10) })
    await page.waitForTimeout(16)
  }
  await page.waitForTimeout(400)
  const after = await board.evaluate((el) => el.scrollTop)
  ok(after > before, `landscape: swipe up scrolls down (${before} -> ${after})`)
  ok((await page.locator('.drag-layer').count()) === 0, 'landscape: scroll does not pick a card up')
  await page.waitForTimeout(500)
  ok(
    (await board.evaluate((el) => el.scrollTop)) === after,
    'landscape: board does not float back to the top',
  )
  await touch('touchEnd')
  await context.close()
}

await browser.close()
if (failures.length) {
  console.error(`FAILURES:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log('drag: mouse and touch both play a card')
