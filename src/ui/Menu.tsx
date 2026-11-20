import type { GameState, Variant } from '../engine/types.ts'
import { VARIANTS, variantLabel } from '../engine/game.ts'

export interface Prefs {
  variant: Variant
  difficulty: number
  draw: number
}

interface Props {
  prefs: Prefs
  current: GameState | null
  hasSaved: boolean
  canInstall: boolean
  standalone: boolean
  onPrefs: (p: Prefs) => void
  onNew: () => void
  onResume: () => void
  onInstall: () => void
  peek: boolean
  canSendHome: boolean
  onPeek: () => void
  onCheat: (kind: 'shuffle' | 'home') => void
}

export function Menu({
  prefs,
  current,
  hasSaved,
  canInstall,
  standalone,
  onPrefs,
  onNew,
  onResume,
  onInstall,
  peek,
  canSendHome,
  onPeek,
  onCheat,
}: Props) {
  return (
    <main class="menu">
      <div class="brand">
        <h1>Solitaire</h1>
        <p class="tagline">Klondike, Spider and FreeCell. No ads, no internet, nothing to install from a store.</p>
      </div>

      <section class="variant-picker" aria-label="Choose a game">
        {VARIANTS.map((v) => (
          <button
            type="button"
            class={`variant${prefs.variant === v ? ' active' : ''}`}
            aria-pressed={prefs.variant === v}
            onClick={() => onPrefs({ ...prefs, variant: v })}
          >
            {variantLabel(v)}
          </button>
        ))}
      </section>

      {prefs.variant === 'klondike' && (
        <section class="options">
          <span class="options-label">Draw</span>
          <div class="segmented">
            {[1, 3].map((n) => (
              <button
                type="button"
                class={prefs.draw === n ? 'active' : ''}
                aria-pressed={prefs.draw === n}
                onClick={() => onPrefs({ ...prefs, draw: n })}
              >
                {n} card{n > 1 ? 's' : ''}
              </button>
            ))}
          </div>
          <p class="hint-note">One card at a time is the gentler game.</p>
        </section>
      )}

      {prefs.variant === 'spider' && (
        <section class="options">
          <span class="options-label">Suits</span>
          <div class="segmented">
            {[1, 2, 4].map((n) => (
              <button
                type="button"
                class={prefs.difficulty === n ? 'active' : ''}
                aria-pressed={prefs.difficulty === n}
                onClick={() => onPrefs({ ...prefs, difficulty: n })}
              >
                {n}
              </button>
            ))}
          </div>
          <p class="hint-note">One suit is the easiest Spider.</p>
        </section>
      )}

      <div class="menu-actions">
        <button type="button" class="btn primary big" onClick={onNew}>
          New game
        </button>
        {hasSaved && current && (
          <div class="resume">
            <p class="continue-note">
              {variantLabel(current.variant)} ·{' '}
              {current.moves === 0
                ? 'not started'
                : `${current.moves} move${current.moves === 1 ? '' : 's'} in`}
              {current.cheats ? ` · ${current.cheats} cheat${current.cheats > 1 ? 's' : ''}` : ''}
            </p>
            <button type="button" class="btn big" onClick={onResume}>
              Continue last game
            </button>
          </div>
        )}
      </div>

      {current && (
        <details class="cheats">
          <summary>Cheats</summary>
          <div class="cheat-list">
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
          </div>
          <p class="hint-note">Cheats are undoable, and nobody has to know.</p>
        </details>
      )}

      <section class="install">
        {standalone ? (
          <p class="installed">Installed. It will open without internet.</p>
        ) : canInstall ? (
          <>
            <p>Install it on this phone so it opens like an app, even offline.</p>
            <button type="button" class="btn" onClick={onInstall}>
              Install on this phone
            </button>
          </>
        ) : (
          <details>
            <summary>How to put this on your home screen</summary>
            <p>
              In Chrome, tap the ⋮ menu, then <strong>Add to Home screen</strong> and choose <strong>Install</strong>.
              After that it opens without internet.
            </p>
          </details>
        )}
      </section>
    </main>
  )
}
