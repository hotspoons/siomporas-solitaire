interface Props {
  canUndo: boolean
  fullscreen: boolean
  canFullscreen: boolean
  onMenu: () => void
  onUndo: () => void
  onFullscreen: () => void
}

/**
 * Floating controls instead of a toolbar: two small clusters in the bottom
 * corners, over the felt, so the top of the table is free for cards. The
 * full-screen button only exists in a browser tab, not in the installed app.
 */
export function Controls({ canUndo, fullscreen, canFullscreen, onMenu, onUndo, onFullscreen }: Props) {
  return (
    <div class="controls">
      <button type="button" class="ctl" onClick={onMenu} aria-label="Menu" title="Menu">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
        </svg>
      </button>
      <div class="controls-right">
        <button type="button" class="ctl wide" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
          Undo
        </button>
        {canFullscreen && (
          <button
            type="button"
            class="ctl"
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
      </div>
    </div>
  )
}
