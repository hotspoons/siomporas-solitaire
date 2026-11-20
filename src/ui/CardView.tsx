import { isRed, rankLabel, suitGlyph } from '../engine/cards.ts'
import type { Card } from '../engine/cards.ts'

interface Props {
  card: Card
  selected?: boolean
  dimmed?: boolean
  style?: Record<string, string | number>
  onSelect?: () => void
  onAuto?: () => void
}

export function CardView({ card, selected, dimmed, style, onSelect, onAuto }: Props) {
  if (!card.faceUp) {
    return <div class="card back" style={style} aria-hidden="true" />
  }
  const red = isRed(card.suit)
  return (
    <button
      type="button"
      class={`card face ${red ? 'red' : 'black'}${selected ? ' selected' : ''}${dimmed ? ' dim' : ''}`}
      style={style}
      aria-label={`${rankLabel(card.rank)} of ${card.suit}${selected ? ', selected' : ''}`}
      onClick={onSelect}
      onDblClick={onAuto}
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
