import { signal, computed } from '@preact/signals'
import { useEffect } from 'preact/hooks'
import { Board } from './ui/Board.tsx'
import { Menu, type Prefs } from './ui/Menu.tsx'
import { Controls } from './ui/Controls.tsx'
import { GameMenu } from './ui/GameMenu.tsx'
import {
  applyMove,
  deserialize,
  foundationMove,
  legalTargets,
  newGame,
  selectableCount,
  serialize,
} from './engine/game.ts'
import { randomSeed } from './engine/cards.ts'
import { sendHome, shuffleHidden } from './engine/cheats.ts'
import { clicksSuppressed } from './ui/drag.ts'
import type { GameState, PileRef, Variant } from './engine/types.ts'

const PREFS_KEY = 'siomporas-solitaire.prefs.v1'
const GAME_KEY = 'siomporas-solitaire.game.v1'

const DEFAULT_PREFS: Prefs = { variant: 'klondike', difficulty: 1, draw: 1 }

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    const p = JSON.parse(raw) as Partial<Prefs>
    const variant: Variant = p.variant === 'spider' || p.variant === 'freecell' ? p.variant : 'klondike'
    return {
      variant,
      difficulty: p.difficulty === 2 || p.difficulty === 4 ? p.difficulty : 1,
      draw: p.draw === 3 ? 3 : 1,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

function loadGame(): GameState | null {
  try {
    return deserialize(localStorage.getItem(GAME_KEY))
  } catch {
    return null
  }
}

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const prefs = signal<Prefs>(loadPrefs())
const game = signal<GameState | null>(loadGame())
const history = signal<GameState[]>([])
const future = signal<GameState[]>([])
const gameMenu = signal(false)
const selection = signal<{ ref: PileRef; count: number } | null>(null)
const screen = signal<'menu' | 'game'>('menu')
const canInstall = signal(false)
const standalone = signal(false)
const fullscreen = signal(false)
const peek = signal(false)
const canFullscreen = signal(false)

let deferredPrompt: InstallEvent | null = null

const targets = computed(() => {
  const g = game.value
  const s = selection.value
  if (!g || !s) return []
  return legalTargets(g, s.ref, s.count)
})

function persist(): void {
  try {
    if (game.value) localStorage.setItem(GAME_KEY, serialize(game.value))
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs.value))
  } catch {
    /* storage full or blocked: the game still plays */
  }
}

function commit(next: GameState | null): void {
  if (!next) return
  const current = game.value
  if (current) history.value = [...history.value.slice(-199), current]
  future.value = []
  game.value = next
  selection.value = null
  persist()
}

function startGame(variant: Variant, opts: { draw?: number; difficulty?: number } = {}): void {
  const seed = randomSeed()
  game.value = newGame(variant, {
    seed,
    draw: opts.draw ?? prefs.value.draw,
    difficulty: opts.difficulty ?? prefs.value.difficulty,
  })
  history.value = []
  future.value = []
  selection.value = null
  peek.value = false
  gameMenu.value = false
  screen.value = 'game'
  persist()
}

function undo(): void {
  const h = history.value.slice()
  const prev = h.pop()
  if (!prev) return
  if (game.value) future.value = [...future.value.slice(-199), game.value]
  game.value = prev
  history.value = h
  selection.value = null
  persist()
}

function redo(): void {
  const f = future.value.slice()
  const next = f.pop()
  if (!next) return
  if (game.value) history.value = [...history.value.slice(-199), game.value]
  game.value = next
  future.value = f
  selection.value = null
  persist()
}

function goHome(): void {
  selection.value = null
  gameMenu.value = false
  screen.value = 'menu'
}

function onCard(ref: PileRef, cardIndex: number): void {
  const g = game.value
  if (!g) return
  const sel = selection.value

  if (sel) {
    if (sel.ref.kind === ref.kind && sel.ref.index === ref.index) {
      const auto = foundationMove(g, ref)
      if (auto) commit(applyMove(g, auto))
      else selection.value = null
      return
    }
    const next = applyMove(g, { type: 'move', from: sel.ref, to: ref, count: sel.count })
    if (next) {
      commit(next)
      return
    }
  }

  const count = selectableCount(g, ref, cardIndex)
  selection.value = count > 0 ? { ref, count } : null
}

function onDrop(from: PileRef, to: PileRef, count: number): void {
  const g = game.value
  if (!g) return
  const next = applyMove(g, { type: 'move', from, to, count })
  if (next) commit(next)
  else selection.value = { ref: from, count }
}

function onPile(ref: PileRef): void {
  // A drag ends with a pointerup that the browser also reports as a click.
  if (clicksSuppressed()) return
  const g = game.value
  const sel = selection.value
  if (!g || !sel) return
  const next = applyMove(g, { type: 'move', from: sel.ref, to: ref, count: sel.count })
  if (next) commit(next)
}

function cheat(kind: 'shuffle' | 'home'): void {
  const g = game.value
  if (!g) return
  const next = kind === 'shuffle' ? shuffleHidden(g) : sendHome(g)
  if (!next) return
  next.cheats = (next.cheats ?? 0) + 1
  commit(next)
  screen.value = 'game'
}

function onStock(): void {
  const g = game.value
  if (!g) return
  const stock = g.piles.find((p) => p.kind === 'stock')
  if (!stock) return
  if (g.variant === 'spider') commit(applyMove(g, { type: 'deal' }))
  else if (stock.cards.length > 0) commit(applyMove(g, { type: 'draw' }))
  else commit(applyMove(g, { type: 'recycle' }))
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

export function App() {
  useEffect(() => {
    standalone.value = isStandalone()
    canFullscreen.value = typeof document !== 'undefined' && document.fullscreenEnabled === true
    const onFullscreenChange = () => {
      fullscreen.value = !!document.fullscreenElement
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    const onPrompt = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e as InstallEvent
      canInstall.value = true
    }
    const onInstalled = () => {
      canInstall.value = false
      standalone.value = true
      deferredPrompt = null
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    } catch {
      /* the browser refused (no gesture, policy); the page still plays */
    }
  }

  const install = async () => {
    const ev = deferredPrompt
    if (!ev) return
    await ev.prompt()
    await ev.userChoice
    deferredPrompt = null
    canInstall.value = false
  }

  const current = game.value
  const g = current && screen.value === 'game' ? current : null

  return (
    <div
      class="app"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {g ? (
        <>
          <Controls
            canUndo={history.value.length > 0}
            fullscreen={fullscreen.value}
            canFullscreen={canFullscreen.value && !standalone.value}
            onFullscreen={toggleFullscreen}
            onUndo={undo}
            onMenu={() => {
              selection.value = null
              gameMenu.value = true
            }}
          />
          <Board
            state={g}
            selection={selection.value}
            targets={targets.value}
            onCard={onCard}
            onPile={onPile}
            onDrop={onDrop}
            onStock={onStock}
            peek={peek.value}
          />
          <GameMenu
            open={gameMenu.value && !g.won}
            canUndo={history.value.length > 0}
            canRedo={future.value.length > 0}
            fullscreen={fullscreen.value}
            canFullscreen={canFullscreen.value && !standalone.value}
            peek={peek.value}
            canSendHome={sendHome(g) !== null}
            onClose={() => {
              gameMenu.value = false
            }}
            onUndo={undo}
            onRedo={redo}
            onFullscreen={toggleFullscreen}
            onCheat={(kind) => {
              cheat(kind)
              gameMenu.value = false
            }}
            onPeek={() => {
              peek.value = !peek.value
              gameMenu.value = false
            }}
            onNew={() => {
              startGame(g.variant, { draw: g.draw, difficulty: g.difficulty })
            }}
            onHome={goHome}
          />
          {g.won && (
            <div class="win" role="dialog" aria-modal="true" aria-label="You won">
              <div class="win-panel">
                <h2>You won!</h2>
                <p>{g.moves} moves.</p>
                <button
                  type="button"
                  class="btn primary big"
                  onClick={() => startGame(g.variant, { draw: g.draw, difficulty: g.difficulty })}
                >
                  Play again
                </button>
                <button
                  type="button"
                  class="btn big"
                  onClick={() => {
                    screen.value = 'menu'
                  }}
                >
                  Menu
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Menu
          prefs={prefs.value}
          current={current}
          hasSaved={!!current}
          canInstall={canInstall.value}
          standalone={standalone.value}
          onPrefs={(p) => {
            prefs.value = p
            persist()
          }}
          onNew={() => startGame(prefs.value.variant)}
          onResume={() => {
            screen.value = 'game'
            selection.value = null
          }}
          onInstall={install}
          peek={peek.value}
          canSendHome={!!current && screen.value === 'menu' && sendHome(current) !== null}
          onPeek={() => {
            peek.value = !peek.value
            if (peek.value) screen.value = 'game'
          }}
          onCheat={cheat}
        />
      )}
    </div>
  )
}
