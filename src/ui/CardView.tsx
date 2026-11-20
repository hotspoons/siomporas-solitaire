import { isRed, rankLabel, suitGlyph } from '../engine/cards.ts'
import type { Card } from '../engine/cards.ts'
import { initials, memberFor } from '../theme/family.ts'

interface Props {
  card: Card
  selected?: boolean
  dimmed?: boolean
  /** Show a face-down card's face, greyed, without making it playable. */
  peek?: boolean
  style?: Record<string, string | number>
  onSelect?: () => void
  onPointerDown?: (e: PointerEvent) => void
}

export function CardView({ card, selected, dimmed, peek, style, onSelect, onPointerDown }: Props) {
  if (!card.faceUp && !peek) {
    return <div class="card back" style={style} aria-hidden="true" onPointerDown={onPointerDown} />
  }
  const red = isRed(card.suit)
  const member = card.faceUp ? memberFor(card.suit, card.rank) : null
  const label = `${rankLabel(card.rank)} of ${card.suit}${member ? `, ${member.name}` : ''}${
    card.faceUp ? (selected ? ', selected' : '') : ', face down'
  }`
  return (
    <button
      type="button"
      class={`card face ${red ? 'red' : 'black'}${selected ? ' selected' : ''}${dimmed ? ' dim' : ''}${
        card.faceUp ? '' : ' peek'
      }`}
      style={style}
      aria-label={label}
      aria-disabled={!card.faceUp || undefined}
      onPointerDown={card.faceUp ? onPointerDown : undefined}
      onClick={(e) => {
        // Pointer taps are handled on pointerup (see Board); this is the keyboard path.
        if (e.detail === 0 && card.faceUp) onSelect?.()
      }}
    >
      <span class="corner top">
        <span class="rank">{rankLabel(card.rank)}</span>
        <span class="suit">{suitGlyph(card.suit)}</span>
      </span>
      {member ? (
        <span class="member">
          {member.image ? (
            <img class="member-photo" src={member.image} alt="" draggable={false} />
          ) : (
            <span class="member-initials" aria-hidden="true">
              {initials(member.name)}
            </span>
          )}
          <span class="member-name" aria-hidden="true">
            {member.name}
          </span>
        </span>
      ) : (
        <span class="pip">{suitGlyph(card.suit)}</span>
      )}
      <span class="corner bottom" aria-hidden="true">
        <span class="rank">{rankLabel(card.rank)}</span>
        <span class="suit">{suitGlyph(card.suit)}</span>
      </span>
    </button>
  )
}
