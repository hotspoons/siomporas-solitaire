# Siomporas Solitaire

Klondike, Spider and FreeCell that you install once on a phone and then play with no
internet, no ads, no accounts, and nothing else to install. Built for a phone, in the
hand, in either orientation.

Live at **[solitaire.siomporas.com](https://solitaire.siomporas.com)**.

## The three games

| Game | What it is |
|---|---|
| **Klondike** | The classic seven-column solitaire. Draw one card at a time (or three), unlimited redeals. |
| **Spider** | Ten columns, two decks, five deals. Choose one suit (easiest), two, or four. |
| **FreeCell** | All cards face up, four free cells, eight columns. No luck after the deal. |

Every game is seeded: the seed travels with the saved state, so a game you close is
the game you reopen.

## Playing on a phone

- **Drag a card (or a run) onto another pile.** Legal destinations light up under
  your finger and the board scrolls when you drag to an edge. Release on a pile to
  play it.
- **Or tap, tap.** Tap a card to pick it up, tap a pile to put it down. Better for
  shaky hands and always available. Tap the same card twice to send it straight to
  a foundation when it can go.
- **Full screen** is the button in the top bar (the four corners). In landscape it
  gives the table the whole screen; the same button brings the browser chrome back.
- Nothing on the page selects, highlights, or long-press-menus: dragging a card is
  always a card drag, never a text selection, a page refresh, or a back gesture.
- **Undo** is always in the top bar. It goes back as far as you like.
- **Menu → New game** starts fresh; **Continue last game** resumes the deal you left,
  even after the phone restarts.
- **Install on this phone** (in the menu) puts it on the home screen. After the first
  visit it opens with no signal; the whole app is cached on the device.

### Installing

1. Open the site in Chrome on the phone.
2. Menu → **Install on this phone** (or Chrome's ⋮ → **Add to Home screen** → **Install**).
3. Open it once from the home screen. From then on it works in airplane mode.

The cards are sized for older eyes and fingers: minimum 44 px tap targets, large
corner indices, a high-contrast deck. Nothing on the screen is timed, and nothing is
ever downloaded while you play.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production bundle into dist/
npm run preview    # serve dist/ on :4173
npm test           # rules engine tests (node --test, no extra runner)
npm run smoke      # with preview running: click through all three games
npm run drag       # with preview running: mouse drag + touch drag, all three games
npm run offline    # with preview running: proves the build opens with no network
npm run icons      # regenerate the PWA icons from public/favicon.svg
```

Cards size themselves from the window: phone-sized in the hand, up to 160 px on a
desktop monitor, with the deal centred on the felt rather than pinned to the
top-left corner.

The rules engine in `src/engine/` is pure TypeScript with no DOM: cards, moves,
legality, undo, serialisation. `src/ui/` is the board; `src/app.tsx` holds the small
amount of state (the game, the undo stack, the selection) and persists it to
`localStorage` after every move.

## Deploy

The app is a Cloudflare Worker with static assets — no Worker code, just `dist/` —
configured in [`wrangler.jsonc`](wrangler.jsonc) on the custom domain
`solitaire.siomporas.com`. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
typechecks, tests, builds and deploys on every push to `main` (and by hand from the
Actions tab).

The repository needs two secrets (Settings → Secrets and variables → Actions):

| Secret | What |
|---|---|
| `CLOUDFLARE_API_TOKEN` | **Account → Workers Scripts: Edit**, **Account → Account Settings: Read**; on zone `siomporas.com`: **Zone: Read**, **DNS: Edit**, **Workers Routes: Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → account id in the right column |

On the first deploy wrangler creates the DNS record and certificate for
`solitaire.siomporas.com`; the zone must already be in that account. By hand:
`npx wrangler login` once, then `npm run deploy`.

## Licence

Apache-2.0.
