import type { GameState } from '../engine/types.ts'
import { variantLabel } from '../engine/game.ts'

interface Props {
  state: GameState
  canUndo: boolean
  onUndo: () => void
  onMenu: () => void
  onNew: () => void
}

export function Toolbar({ state, canUndo, onUndo, onMenu, onNew }: Props) {
  return (
    <header class="toolbar">
      <button type="button" class="btn" onClick={onMenu}>
        Menu
      </button>
      <div class="title">
        <strong>{variantLabel(state.variant)}</strong>
        <span class="moves">{state.moves} moves</span>
      </div>
      <button type="button" class="btn" onClick={onUndo} disabled={!canUndo}>
        Undo
      </button>
      <button type="button" class="btn" onClick={onNew}>
        New
      </button>
    </header>
  )
}
