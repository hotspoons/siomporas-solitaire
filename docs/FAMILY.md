# Family faces

The plan: the court cards (and, if wanted, every card of a suit) carry pictures
of family members, so mom's solitaire is played with her people rather than
anonymous kings and queens.

## How it works today

All of it lives in [`src/theme/family.ts`](../src/theme/family.ts). `FAMILY` is
empty, so nothing changes on the table yet. Filling it in is the whole switch:

```ts
import type { SuitFamily } from './family.ts'

export const FAMILY: Partial<Record<Suit, SuitFamily>> = {
  hearts: {
    suit: { name: 'Grandma Rose', image: '/family/grandma-rose.png' },
    // optional: one person per court rank
    j: { name: 'Nico', image: '/family/nico.png' },
    q: { name: 'Grandma Rose', image: '/family/grandma-rose.png' },
    k: { name: 'Grandpa Joe', image: '/family/grandpa-joe.png' },
  },
  diamonds: { suit: { name: 'Grandpa Joe', image: '/family/grandpa-joe.png' } },
  clubs: { suit: { name: 'Aunt May', image: '/family/aunt-may.png' } },
  spades: { suit: { name: 'Uncle Ray', image: '/family/uncle-ray.png' } },
}
```

- `suit` is the person the suit belongs to (used on J/Q/K unless overridden).
- `j` / `q` / `k` override one court card.
- `faces: 'all'` puts that person on every card of the suit, not only the court
  cards. Leaving it out keeps the classic pips on the number cards.
- No `image`? The person's initials are drawn instead, so the layout can be tried
  before the art exists.

The name is read aloud with the card: *"Queen of hearts, Grandma Rose."*

## Artwork spec

- One picture per person is enough; it is reused on every card that person
  appears on.
- Put files in `public/family/` and reference them as `/family/<file>`.
- Square portraits work best: they are cropped into a circle at 78% of the card
  width. 400×400 or 512×512, PNG or WebP, transparent or plain background.
- Portrait-shaped photos also work; they're centre-cropped.
- Keep each file under ~200 KB. The build precaches everything in `public/`
  (`png`, `svg`, `woff2` are in the Workbox glob; add `webp` there if we use it),
  so the pictures work offline like the rest of the app.

## Decisions to make when the art arrives

1. Who is on which suit — four people, one per suit.
2. Whether the J/Q/K of a suit are three different people or all the suit's
   person.
3. Names as they should be spoken (e.g. "Grandma Rose", not "Rose").
4. `faces: 'all'` or court cards only. Court-only is calmer; all cards is more
   personal and makes suits instantly recognisable across the table.
5. Whether to keep a "classic cards" switch in the menu once the family faces
   are on. (Easy to add: a persisted pref, one branch in `CardView`.)
