import { isRed, rankLabel, suitGlyph } from '../engine/cards.ts'
import type { Card } from '../engine/cards.ts'

interface Props {
  card: Card
  selected?: boolean
  dimmed?: boolean
  style?: Record<string, string | number>
  onSelect?: () => void
  onPointerDown?: (e: PointerEvent) => void
}

export function CardView({ card, selected, dimmed, style, onSelect, onPointerDown }: Props) {
  if (!card.faceUp) {
    return <div class="card back" style={style} aria-hidden="true" onPointerDown={onPointerDown} />
  }
  const red = isRed(card.suit)
  return (
    <button
      type="button"
      class={`card face ${red ? 'red' : 'black'}${selected ? ' selected' : ''}${dimmed ? ' dim' : ''}`}
      style={style}
      aria-label={`${rankLabel(card.rank)} of ${card.suit}${selected ? ', selected' : ''}`}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        // Pointer taps are handled on pointerup (see Board); this is the keyboard path.
        if (e.detail === 0) onSelect?.()
      }}
    >
      <span class="corner top">
        <span class="rank">{rankLabel(card.rank)}</span>
        <span class="suit">{suitGlyph(card.suit)}</span>
      </span>
      <span class="pip">{suitGlyph(card.suit)}</span>
      <span class="corner bottom" aria-hidden="true">
        <span class="rank">{rankLabel(card.rank)}</span>
        <span class="suit">{suitGlyph(card.suit)}</span>
      </span>
    </button>
  )
}
