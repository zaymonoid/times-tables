import { MIN_FACTOR, MAX_FACTOR, type FactKey } from './types'

/** Canonical key for an unordered pair: min first. */
export function keyFor(a: number, b: number): FactKey {
  return a <= b ? `${a}x${b}` : `${b}x${a}`
}

/** Parse a canonical key back into [small, large]. */
export function factorsOf(key: FactKey): [number, number] {
  const [a, b] = key.split('x').map(Number)
  return [a, b]
}

/** All 55 canonical facts, 3x3 .. 12x12, unordered pairs. */
export const ALL_FACT_KEYS: FactKey[] = (() => {
  const keys: FactKey[] = []
  for (let a = MIN_FACTOR; a <= MAX_FACTOR; a++) {
    for (let b = a; b <= MAX_FACTOR; b++) {
      keys.push(keyFor(a, b))
    }
  }
  return keys
})()

export function answerOf(key: FactKey): number {
  const [a, b] = factorsOf(key)
  return a * b
}
