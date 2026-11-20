import type { GameState } from '../engine/types.ts'
import { variantLabel } from '../engine/game.ts'

interface Props {
  state: GameState
  canUndo: boolean
  fullscreen: boolean
  canFullscreen: boolean
  onUndo: () => void
  onMenu: () => void
  onNew: () => void
  onFullscreen: () => void
}

export function Toolbar({ state, canUndo, fullscreen, canFullscreen, onUndo, onMenu, onNew, onFullscreen }: Props) {
  return (
    <header class="toolbar">
      <button type="button" class="btn" onClick={onMenu}>
        Menu
      </button>
      <div class="title">
        <strong>{variantLabel(state.variant)}</strong>
        <span class="moves">{state.moves} moves</span>
      </div>
      {canFullscreen && (
        <button
          type="button"
          class="btn icon"
          onClick={onFullscreen}
          aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
          aria-pressed={fullscreen}
          title={fullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {fullscreen ? (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M4 9V4h5M20 15v5h-5M4 15v5h5M20 9V4h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            </svg>
          )}
        </button>
      )}
      <button type="button" class="btn" onClick={onUndo} disabled={!canUndo}>
        Undo
      </button>
      <button type="button" class="btn" onClick={onNew}>
        New
      </button>
    </header>
  )
}
