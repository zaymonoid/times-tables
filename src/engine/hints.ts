import type { FactKey } from './types'

/**
 * A contiguous decomposition of one factor that drives BOTH the worked text and
 * the array-splitting visual. `factor` is the operand being broken up; `parts`
 * are the two group counts along that axis.
 *  - op 'plus':  parts sum to factor (e.g. 6 = 5 + 1) — two adjacent blocks.
 *  - op 'minus': parts are [whole, taken] with whole − taken === factor
 *    (e.g. 9 = 10 − 1) — draw `whole` groups, ghost the last `taken`.
 */
export interface Split {
  factor: number
  parts: [number, number]
  op: 'plus' | 'minus'
}

/**
 * Structured, diagram-ready form of a strategy. Each variant carries only the
 * operands; the UI (see components/strategy/cardSpec) computes every displayed
 * number from them, so — like the `text` string — a rendered card can never
 * disagree with the arithmetic it claims.
 */
export type StrategyCard =
  | { kind: 'bond-plus'; factor: number; parts: [number, number]; other: number }
  | { kind: 'bond-minus'; factor: number; whole: number; small: number; other: number }
  | { kind: 'double'; half: number; other: number }
  | { kind: 'double-double'; other: number }
  | { kind: 'square-grow'; n: number }
  | { kind: 'place-value'; other: number }
  | { kind: 'half-of-ten'; other: number }
  | { kind: 'count-by-fives'; other: number }
  | { kind: 'repeat-digit'; other: number }
  | { kind: 'generic' }

/** One way to reach a fact: a fully-worked sentence, a structured card, and an
 *  optional array-split spec. */
export interface Strategy {
  text: string
  card: StrategyCard
  split?: Split
}

export interface FactHints {
  /** The most intuitive breakdown — number-bond / anchor first. */
  primary: Strategy
  /** A second good strategy, when one exists. */
  alt?: Strategy
}

// --- Strategy constructors. Every number is COMPUTED from the operands so a
// --- hint string (and its card) can never disagree with the arithmetic. -----

/** n×n via growing the previous square: n² = (n−1)² + (n−1) + (n−1) + 1. */
function square(n: number): Strategy {
  const prev = n - 1
  return {
    text: `Grow the square: ${prev}×${prev} = ${prev * prev}, add ${prev}+${prev}+1 = ${n * n}`,
    card: { kind: 'square-grow', n },
  }
}

/** 10×o via place value. `o` is the non-ten operand. */
function placeValue(o: number): Strategy {
  return { text: `Place value: 10×${o} = ${o}0`, card: { kind: 'place-value', other: o } }
}

/** 5×o = half of 10×o. */
function halfOfTen(o: number): Strategy {
  return {
    text: `Half of ×10: 5×${o} = ${10 * o} ÷ 2 = ${5 * o}`,
    card: { kind: 'half-of-ten', other: o },
  }
}

/** 5×o by skip-counting. */
function countByFives(o: number): Strategy {
  return { text: `Count by fives up to ${5 * o}`, card: { kind: 'count-by-fives', other: o } }
}

/** 11×o for o ≤ 9: the digit doubles. */
function repeatDigit(o: number): Strategy {
  return { text: `Repeat the digit: 11×${o} = ${11 * o}`, card: { kind: 'repeat-digit', other: o } }
}

/**
 * Break factor `f` into `p + q` groups of `o` and add the partial products.
 * Covers the 5-anchored bonds (6=5+1, 7=5+2, 8=5+3, 3=2+1) and the ten-anchored
 * ones (11=10+1, 12=10+2). Second term collapses when q === 1.
 */
function bondPlus(f: number, p: number, q: number, o: number): Strategy {
  const second = q === 1 ? `${o}` : `${q}×${o}`
  return {
    text: `${f} = ${p}+${q}: ${f}×${o} = ${p}×${o} + ${second} = ${p * o} + ${q * o} = ${f * o}`,
    card: { kind: 'bond-plus', factor: f, parts: [p, q], other: o },
    split: { factor: f, parts: [p, q], op: 'plus' },
  }
}

/**
 * Reach factor `f` by taking `small` groups away from `whole` (f = whole − small).
 * The 9s live here (9 = 10 − 1); also serves near-fives like 4 = 5 − 1.
 */
function minusBond(f: number, whole: number, small: number, o: number): Strategy {
  const taken = small === 1 ? `${o}` : `${small}×${o}`
  return {
    text: `${f} = ${whole}−${small}: ${f}×${o} = ${whole}×${o} − ${taken} = ${whole * o} − ${small * o} = ${f * o}`,
    card: { kind: 'bond-minus', factor: f, whole, small, other: o },
    split: { factor: f, parts: [whole, small], op: 'minus' },
  }
}

/** Double a known half-fact: (2h)×o = double (h×o). Splits the axis into h + h. */
function double(h: number, o: number): Strategy {
  return {
    text: `Double ${h}×${o}: ${2 * h}×${o} = double ${h * o} = ${2 * h * o}`,
    card: { kind: 'double', half: h, other: o },
    split: { factor: 2 * h, parts: [h, h], op: 'plus' },
  }
}

/** 4×o by doubling twice. Splits the 4-axis into 2 + 2. */
function doubleDouble(o: number): Strategy {
  return {
    text: `Double twice: 4×${o} = ${o}×2×2 = ${2 * o}×2 = ${4 * o}`,
    card: { kind: 'double-double', other: o },
    split: { factor: 4, parts: [2, 2], op: 'plus' },
  }
}

/**
 * The curated breakdown for every one of the 55 canonical facts. Primary is the
 * most intuitive path (number-bond / anchor first); alt is a second good route.
 * Every fact carries an alt so the panel always shows two roads. Keys are
 * canonical "AxB" with A ≤ B, matching ALL_FACT_KEYS.
 */
const HINTS: Record<FactKey, FactHints> = {
  '3x3': { primary: square(3), alt: bondPlus(3, 2, 1, 3) },
  '3x4': { primary: doubleDouble(3), alt: bondPlus(3, 2, 1, 4) },
  '3x5': { primary: halfOfTen(3), alt: countByFives(3) },
  '3x6': { primary: bondPlus(6, 5, 1, 3), alt: double(3, 3) },
  '3x7': { primary: bondPlus(3, 2, 1, 7), alt: bondPlus(7, 5, 2, 3) },
  '3x8': { primary: bondPlus(3, 2, 1, 8), alt: double(4, 3) },
  '3x9': { primary: minusBond(9, 10, 1, 3), alt: bondPlus(3, 2, 1, 9) },
  '3x10': { primary: placeValue(3), alt: double(5, 3) },
  '3x11': { primary: bondPlus(11, 10, 1, 3), alt: repeatDigit(3) },
  '3x12': { primary: bondPlus(12, 10, 2, 3), alt: double(6, 3) },
  '4x4': { primary: square(4), alt: doubleDouble(4) },
  '4x5': { primary: halfOfTen(4), alt: doubleDouble(5) },
  '4x6': { primary: bondPlus(6, 5, 1, 4), alt: double(2, 6) },
  '4x7': { primary: doubleDouble(7), alt: minusBond(4, 5, 1, 7) },
  '4x8': { primary: double(4, 4), alt: minusBond(4, 5, 1, 8) },
  '4x9': { primary: minusBond(9, 10, 1, 4), alt: doubleDouble(9) },
  '4x10': { primary: placeValue(4), alt: double(5, 4) },
  '4x11': { primary: bondPlus(11, 10, 1, 4), alt: repeatDigit(4) },
  '4x12': { primary: bondPlus(12, 10, 2, 4), alt: double(6, 4) },
  '5x5': { primary: square(5), alt: halfOfTen(5) },
  '5x6': { primary: halfOfTen(6), alt: countByFives(6) },
  '5x7': { primary: halfOfTen(7), alt: countByFives(7) },
  '5x8': { primary: halfOfTen(8), alt: countByFives(8) },
  '5x9': { primary: halfOfTen(9), alt: minusBond(9, 10, 1, 5) },
  '5x10': { primary: placeValue(5), alt: double(5, 5) },
  '5x11': { primary: bondPlus(11, 10, 1, 5), alt: repeatDigit(5) },
  '5x12': { primary: bondPlus(12, 10, 2, 5), alt: halfOfTen(12) },
  '6x6': { primary: square(6), alt: bondPlus(6, 5, 1, 6) },
  '6x7': { primary: bondPlus(6, 5, 1, 7), alt: double(3, 7) },
  '6x8': { primary: bondPlus(6, 5, 1, 8), alt: double(3, 8) },
  '6x9': { primary: minusBond(9, 10, 1, 6), alt: bondPlus(6, 5, 1, 9) },
  '6x10': { primary: placeValue(6), alt: double(5, 6) },
  '6x11': { primary: bondPlus(11, 10, 1, 6), alt: repeatDigit(6) },
  '6x12': { primary: bondPlus(12, 10, 2, 6), alt: double(6, 6) },
  '7x7': { primary: square(7), alt: bondPlus(7, 5, 2, 7) },
  '7x8': { primary: bondPlus(7, 5, 2, 8), alt: double(4, 7) },
  '7x9': { primary: minusBond(9, 10, 1, 7), alt: bondPlus(7, 5, 2, 9) },
  '7x10': { primary: placeValue(7), alt: double(5, 7) },
  '7x11': { primary: bondPlus(11, 10, 1, 7), alt: repeatDigit(7) },
  '7x12': { primary: bondPlus(12, 10, 2, 7), alt: double(6, 7) },
  '8x8': { primary: square(8), alt: double(4, 8) },
  '8x9': { primary: minusBond(9, 10, 1, 8), alt: double(4, 9) },
  '8x10': { primary: placeValue(8), alt: double(5, 8) },
  '8x11': { primary: bondPlus(11, 10, 1, 8), alt: repeatDigit(8) },
  '8x12': { primary: bondPlus(12, 10, 2, 8), alt: double(6, 8) },
  '9x9': { primary: square(9), alt: minusBond(9, 10, 1, 9) },
  '9x10': { primary: placeValue(9), alt: double(5, 9) },
  '9x11': { primary: bondPlus(11, 10, 1, 9), alt: minusBond(9, 10, 1, 11) },
  '9x12': { primary: minusBond(9, 10, 1, 12), alt: bondPlus(12, 10, 2, 9) },
  '10x10': { primary: placeValue(10), alt: square(10) },
  '10x11': { primary: placeValue(11), alt: double(5, 11) },
  '10x12': { primary: placeValue(12), alt: double(5, 12) },
  '11x11': { primary: square(11), alt: bondPlus(11, 10, 1, 11) },
  '11x12': { primary: bondPlus(11, 10, 1, 12), alt: bondPlus(12, 10, 2, 11) },
  '12x12': { primary: square(12), alt: bondPlus(12, 10, 2, 12) },
}

const FALLBACK: FactHints = {
  primary: {
    text: 'Break it into smaller, friendlier pieces and add them up.',
    card: { kind: 'generic' },
  },
}

/** Curated breakdown(s) for a fact. Falls back gracefully for unknown keys. */
export function hintsFor(key: FactKey): FactHints {
  return HINTS[key] ?? FALLBACK
}
