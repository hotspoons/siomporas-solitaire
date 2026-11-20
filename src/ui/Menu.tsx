import type { Variant } from '../engine/types.ts'
import { VARIANTS, variantLabel } from '../engine/game.ts'

export interface Prefs {
  variant: Variant
  difficulty: number
  draw: number
}

interface Props {
  prefs: Prefs
  hasSaved: boolean
  canInstall: boolean
  standalone: boolean
  onPrefs: (p: Prefs) => void
  onNew: () => void
  onResume: () => void
  onInstall: () => void
}

export function Menu({ prefs, hasSaved, canInstall, standalone, onPrefs, onNew, onResume, onInstall }: Props) {
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

      <button type="button" class="btn primary big" onClick={onNew}>
        New game
      </button>
      {hasSaved && (
        <button type="button" class="btn big" onClick={onResume}>
          Continue last game
        </button>
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
