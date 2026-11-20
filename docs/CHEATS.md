# Cheats

A small menu for the things people actually want to do to a solitaire deal.
Open the hamburger → **Cheats**. Everything here is undoable with the normal
Undo button and is counted on the game (`cheats` in the saved state), so a win
can quietly say it was helped.

## Shipped

| Cheat | What it does |
|---|---|
| **Shuffle the face-down cards** | Keeps every face-up card and every slot where it is; shuffles only the face-down cards among the slots they already occupy. The stock, the deal and the exposed runs stay put. Works in all three games. |
| **Send the safe cards home** | Repeatedly plays any card that is already legal on a foundation, until nothing else fits. Klondike and FreeCell only — Spider foundations take a whole K..A set at once. The button only appears when the current deal has something to send. |
| **Peek at face-down cards** | Shows face-down cards greyed out with dashed edges. Display only: they cannot be played while peeking. Toggle off to hide them again. |

Implemented as pure state transforms in
[`src/engine/cheats.ts`](../src/engine/cheats.ts); the app snapshots the old
state for Undo before committing, exactly like a normal move. Covered by
`src/engine/cheats.test.ts` and `scripts/cheats-check.mjs`.

## Penciled in (in rough order)

1. **Win now** — put every remaining card on its foundation, in order; probably
   behind a confirm since it ends the deal.
2. **Free move** — the next drag ignores the tableau/foundation rules once.
3. **Draw from anywhere** — pull any visible card out of a fan without moving
   the cards on top of it.
4. **Extra redeals / endless stock** — refill the stock from the waste without
   counting a pass.
5. **Change draw 1/3 mid-game** — replay the existing stock with a different
   draw, without redealing.
6. **Unlimited undo** — already effectively true (200 snapshots); a cheat entry
   could just say so.
7. **Spider: collect any complete suit run, not just K..A.**

Rules for adding one: keep it a pure `GameState → GameState` in `cheats.ts`,
give it a test, add a button to the Cheats `<details>` block in `Menu.tsx`, and
let the existing Undo/persistence do the rest. Cheats should never be reachable
by accident from the table — they live one tap down, under the menu.
