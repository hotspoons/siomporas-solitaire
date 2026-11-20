#!/usr/bin/env node
// Reports real layout numbers for each variant and orientation: card size, tap
// target height, horizontal/vertical overflow. Development aid, not CI.
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://127.0.0.1:4173/'
const browser = await chromium.launch()

async function measure(variant, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: variant, exact: true }).click()
  await page.getByRole('button', { name: 'New game' }).click()
  await page.waitForSelector('.board[data-ready]')
  const m = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.card')].filter((c) => c.getBoundingClientRect().width > 0)
    const widths = cards.map((c) => Math.round(c.getBoundingClientRect().width))
    const heights = cards.map((c) => Math.round(c.getBoundingClientRect().height))
    const board = document.querySelector('.board')
    const btn = document.querySelector('.controls .ctl')
    const br = board.getBoundingClientRect()
    return {
      cardW: Math.min(...widths),
      cardMaxW: Math.max(...widths),
      cardH: Math.min(...heights),
      tapBtnH: Math.round(btn.getBoundingClientRect().height),
      boardClientW: board.clientWidth,
      boardScrollW: board.scrollWidth,
      boardClientH: board.clientHeight,
      boardScrollH: board.scrollHeight,
      docScrollW: document.documentElement.scrollWidth,
      innerW: innerWidth,
      innerH: innerHeight,
      overflowX: board.scrollWidth - board.clientWidth,
      overflowY: board.scrollHeight - board.clientHeight,
      topRowVisible: br.width > 0,
    }
  })
  await page.screenshot({ path: `shots/${variant}-${width}x${height}.png` })
  await page.close()
  return m
}

const rows = []
for (const variant of ['Klondike', 'Spider', 'FreeCell']) {
  for (const [w, h] of [[360, 640], [412, 915], [800, 360], [915, 412]]) {
    rows.push({ variant, size: `${w}x${h}`, ...(await measure(variant, w, h)) })
  }
}
console.table(rows)
await browser.close()
