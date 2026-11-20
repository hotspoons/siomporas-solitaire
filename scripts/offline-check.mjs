#!/usr/bin/env node
// Does the production build open with no network after a first visit?
//   node scripts/offline-check.mjs [--url http://localhost:4173/] [--out shots]
import { chromium, devices } from 'playwright'

const args = process.argv.slice(2)
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : dflt
}
const url = opt('url', 'http://localhost:4173/')
const out = opt('out', 'shots')

const browser = await chromium.launch()
const context = await browser.newContext({ ...devices['Pixel 7'] })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error' && !/\/cdn-cgi\//.test(m.location()?.url ?? '')) errors.push(m.text())
})
page.on('requestfailed', (r) => {
  if (!/\/cdn-cgi\//.test(r.url())) errors.push(`request failed: ${r.url()} (${r.failure()?.errorText})`)
})

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForSelector('.menu', { timeout: 20000 })
await page.getByRole('button', { name: 'New game' }).click()
await page.waitForSelector('.board[data-ready]', { timeout: 20000 })

const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready
  for (let i = 0; i < 100 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 100))
  const keys = await caches.keys()
  const name = keys.find((k) => k.startsWith('workbox')) ?? keys[0] ?? ''
  const cache = await caches.open(name)
  const cached = (await cache.keys()).map((r) => new URL(r.url)).filter((u) => u.origin === location.origin)
  return { scope: reg.scope, controlled: !!navigator.serviceWorker.controller, paths: cached.map((u) => u.pathname) }
})
console.log(
  `service worker: scope ${sw.scope}, controlling ${sw.controlled}, cached ${sw.paths.length} same-origin URLs`,
)
if (!sw.controlled) errors.push('the service worker is not controlling the page')
if (!sw.paths.some((p) => p === '/' || p.endsWith('/index.html'))) errors.push('the shell is not precached')
if (!sw.paths.some((p) => /\/assets\/.*\.js$/.test(p))) errors.push('no JS bundle precached')

await page.screenshot({ path: `${out}/portrait.png` })

await context.setOffline(true)
await page.reload({ waitUntil: 'domcontentloaded' })
const menu = await page.waitForSelector('.menu', { timeout: 15000 }).then(() => true).catch(() => false)
if (!menu) errors.push('offline: the menu did not render')
const resume = page.getByRole('button', { name: 'Continue last game' })
if (await resume.count()) await resume.click()
const ready = await page.waitForSelector('.board[data-ready]', { timeout: 15000 }).then(() => true).catch(() => false)
if (!ready) errors.push('offline: the board did not render')
const cards = await page.locator('.card').count()
console.log(`offline reload: menu=${menu}, board=${ready}, ${cards} cards on screen`)
if (ready && cards < 10) errors.push('offline: board rendered but has too few cards')

await page.screenshot({ path: `${out}/offline.png` })

await page.setViewportSize({ width: 915, height: 412 })
await page.waitForTimeout(200)
await page.screenshot({ path: `${out}/landscape.png` })

await browser.close()
console.log(`wrote ${out}/portrait.png, ${out}/offline.png, ${out}/landscape.png`)
if (errors.length) {
  console.error(`ERRORS:\n  ${errors.join('\n  ')}`)
  process.exit(1)
}
console.log('OK: the app works offline')
