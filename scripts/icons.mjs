#!/usr/bin/env node
// Render public/favicon.svg into the PWA icon sizes with headless Chromium.
//   node scripts/icons.mjs
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const sized = svg.replace('<svg ', '<svg width="100%" height="100%" ')

const targets = [
  [96, 'public/icon-96.png'],
  [192, 'public/icon-192.png'],
  [512, 'public/icon-512.png'],
  [180, 'public/apple-touch-icon.png'],
]

const browser = await chromium.launch()
for (const [size, file] of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${sized}</body></html>`,
  )
  await page.screenshot({ path: new URL(`../${file}`, import.meta.url).pathname, omitBackground: true })
  await page.close()
  console.log(`wrote ${file} (${size}x${size})`)
}
await browser.close()
