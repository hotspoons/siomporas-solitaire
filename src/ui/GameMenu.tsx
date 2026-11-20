import { useEffect, useState } from 'preact/hooks'

interface Props {
  open: boolean
  canUndo: boolean
  canRedo: boolean
  fullscreen: boolean
  canFullscreen: boolean
  peek: boolean
  canSendHome: boolean
  onClose: () => void
  onUndo: () => void
  onRedo: () => void
  onFullscreen: () => void
  onCheat: (kind: 'shuffle' | 'home') => void
  onPeek: () => void
  onNew: () => void
  onHome: () => void
}

/**
 * The in-game menu: a sheet over the table, not a trip back to the home
 * screen. The game never leaves the screen unless the player confirms it.
 */
export function GameMenu({
  open,
  canUndo,
  canRedo,
  fullscreen,
  canFullscreen,
  peek,
  canSendHome,
  onClose,
  onUndo,
  onRedo,
  onFullscreen,
  onCheat,
  onPeek,
  onNew,
  onHome,
}: Props) {
  const [confirm, setConfirm] = useState<'home' | 'new' | null>(null)

  useEffect(() => {
    if (open) setConfirm(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div
        class="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-menu-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="sheet-head">
          <h2 id="game-menu-title">
            {confirm === 'home' ? 'Back to the home screen?' : confirm === 'new' ? 'Start a new game?' : 'Menu'}
          </h2>
          <button type="button" class="sheet-close" aria-label="Close menu" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        {confirm === 'home' ? (
          <div class="sheet-confirm">
            <p>
              Your game is saved. <strong>Continue last game</strong> on the home screen brings it right back.
            </p>
            <button type="button" class="btn primary big" onClick={onClose}>
              Keep playing
            </button>
            <button type="button" class="btn big" onClick={onHome}>
              Go to home screen
            </button>
          </div>
        ) : confirm === 'new' ? (
          <div class="sheet-confirm">
            <p>This deal will be replaced. There is no way back to it once the new game starts.</p>
            <button type="button" class="btn primary big" onClick={onClose}>
              Keep this game
            </button>
            <button type="button" class="btn big" onClick={onNew}>
              Start a new game
            </button>
          </div>
        ) : (
          <>
            <div class="sheet-row">
              <button type="button" class="btn" disabled={!canUndo} onClick={onUndo}>
                Undo
              </button>
              <button type="button" class="btn" disabled={!canRedo} onClick={onRedo}>
                Redo
              </button>
            </div>

            {canFullscreen && (
              <button type="button" class="btn big" onClick={onFullscreen}>
                {fullscreen ? 'Exit full screen' : 'Full screen'}
              </button>
            )}

            <section class="sheet-group" aria-label="Cheats">
              <span class="options-label">Cheats</span>
              <button type="button" class="btn" onClick={() => onCheat('shuffle')}>
                Shuffle the face-down cards
              </button>
              {canSendHome && (
                <button type="button" class="btn" onClick={() => onCheat('home')}>
                  Send the safe cards home
                </button>
              )}
              <button type="button" class="btn" aria-pressed={peek} onClick={onPeek}>
                {peek ? 'Peeking at face-down cards' : 'Peek at face-down cards'}
              </button>
              <p class="hint-note">Cheats are undoable, and nobody has to know.</p>
            </section>

            <button type="button" class="btn big" onClick={() => setConfirm('new')}>
              New game
            </button>
            <button type="button" class="sheet-home" onClick={() => setConfirm('home')}>
              Home screen
            </button>
          </>
        )}
      </div>
    </div>
  )
}
