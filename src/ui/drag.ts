import { signal } from '@preact/signals'
import type { Card } from '../engine/cards.ts'
import type { PileRef } from '../engine/types.ts'

export interface DragState {
  from: PileRef
  count: number
  cards: Card[]
  /** pointer position, in client coordinates */
  x: number
  y: number
  /** where inside the first card the pointer grabbed it */
  ox: number
  oy: number
  /** width of the source card, so the ghost is exactly card-sized */
  cw: number
  targets: PileRef[]
}

export const dragState = signal<DragState | null>(null)

export const pileKey = (ref: PileRef): string => `${ref.kind}:${ref.index}`

let suppressUntil = 0

/** A drag ends with a pointerup that browsers also turn into a click. Ignore that click. */
export function suppressClicks(ms = 400): void {
  suppressUntil = performance.now() + ms
}

export function clicksSuppressed(): boolean {
  return performance.now() < suppressUntil
}
