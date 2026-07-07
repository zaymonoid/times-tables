import type { StrategyCard } from '../../engine'

/** A diagram to draw above the worked lines. Mirrors the diagram components. */
export type Diagram =
  | { type: 'bond-tree'; root: number; left: number; right: number; op: 'plus' | 'minus' }
  | { type: 'two-groups'; box: string; count: number; caption: string }
  | { type: 'grow-square'; n: number }
  | { type: 'doubling-chain'; values: number[]; caption?: string }
  | { type: 'place-value'; from: number; to: string }
  | { type: 'multiples'; values: number[] }
  | { type: 'repeat-digit'; digit: number }
  | { type: 'none' }

/** An optional pattern strip or note shown below the sum. */
export type Footnote =
  | { type: 'odd-numbers'; n: number }
  | { type: 'note'; text: string }

export type CardFamily = 'plum' | 'leaf'

/** A labelled step in the round-and-fix layout (pretend → fix → answer). */
export interface CardStep {
  label: string
  tone: 'amber' | 'rose'
  main: string
  sub?: string
}

export interface CardSpec {
  badge: { label: string; family: CardFamily }
  diagram: Diagram
  /** Worked lines shown above the divider. */
  lines: string[]
  /** Labelled steps; when present they replace the diagram/lines layout. */
  steps?: CardStep[]
  /** The final sum line; absent for the text-only generic card. */
  final?: { lhs: string; answer: number }
  footnote?: Footnote
  /** Fallback prose for the generic card. */
  text?: string
}

/** Consecutive squares centred on n: [(n-2)², (n-1)², n², (n+1)²] where valid. */
function squareRun(n: number): number[] {
  const run: number[] = []
  for (let k = n - 2; k <= n + 1; k++) {
    if (k >= 1) run.push(k * k)
  }
  return run
}

/**
 * Turn a structured strategy card into a fully-computed view-model. Every
 * number here derives from the card's operands, so the rendered card can never
 * contradict the fact it explains.
 */
export function specForCard(card: StrategyCard, fallbackText?: string): CardSpec {
  switch (card.kind) {
    case 'bond-plus': {
      const { factor, parts, other } = card
      const [p, q] = parts
      return {
        badge: { label: 'Break apart', family: 'plum' },
        diagram: { type: 'bond-tree', root: factor, left: p, right: q, op: 'plus' },
        lines: [`${p} × ${other} = ${p * other}`, `${q} × ${other} = ${q * other}`],
        final: { lhs: `${p * other} + ${q * other} =`, answer: factor * other },
      }
    }
    case 'bond-minus': {
      const { factor, whole, small, other } = card
      const over = small * other
      const groups = small === 1 ? 'one group' : `${small} groups`
      return {
        badge: { label: 'Round and fix', family: 'plum' },
        diagram: { type: 'none' },
        lines: [],
        steps: [
          {
            label: 'pretend',
            tone: 'amber',
            main: `${whole} × ${other} = ${whole * other}`,
            sub: `act like the ${factor} is a ${whole} — easy`,
          },
          {
            label: 'fix',
            tone: 'rose',
            main: `${whole * other} − ${over}`,
            sub: `you used ${groups} of ${other} too many`,
          },
        ],
        final: { lhs: '', answer: factor * other },
      }
    }
    case 'double': {
      const { half, other } = card
      const known = half * other
      return {
        badge: { label: 'Use a fact you know', family: 'leaf' },
        diagram: {
          type: 'two-groups',
          box: `${half} × ${other}`,
          count: 2,
          caption: `two groups of ${half} × ${other}`,
        },
        lines: [`${half} × ${other} = ${known}`, 'double it'],
        final: { lhs: `${known} + ${known} =`, answer: 2 * known },
      }
    }
    case 'double-double': {
      const { other } = card
      const twice = 2 * other
      const four = 4 * other
      return {
        badge: { label: 'Double, double', family: 'leaf' },
        diagram: {
          type: 'doubling-chain',
          values: [other, twice, four],
          caption: 'doubling twice = ×4',
        },
        // The chain shows the ×2 steps; the lines show what each double *is*.
        lines: [`${other} + ${other} = ${twice}`, `${twice} + ${twice} = ${four}`],
        final: { lhs: `4 × ${other} =`, answer: four },
      }
    }
    case 'square-grow': {
      const { n } = card
      const prev = n - 1
      return {
        badge: { label: 'Grow the square', family: 'leaf' },
        diagram: { type: 'grow-square', n },
        lines: [`${prev} × ${prev} = ${prev * prev}`, `grow both sides: +${prev} +${prev} +1`],
        final: { lhs: `${prev * prev} + ${2 * n - 1} =`, answer: n * n },
        footnote: { type: 'odd-numbers', n },
      }
    }
    case 'place-value': {
      const { other } = card
      return {
        badge: { label: 'Place value', family: 'plum' },
        diagram: { type: 'place-value', from: other, to: `${other}0` },
        lines: [`${other} shifts up one place`],
        final: { lhs: `10 × ${other} =`, answer: 10 * other },
      }
    }
    case 'half-of-ten': {
      const { other } = card
      return {
        badge: { label: 'Use a fact you know', family: 'leaf' },
        diagram: {
          type: 'two-groups',
          box: `10 × ${other}`,
          count: 1,
          caption: `half of 10 × ${other}`,
        },
        lines: [`10 × ${other} = ${10 * other}`, 'halve it'],
        final: { lhs: `${10 * other} ÷ 2 =`, answer: 5 * other },
      }
    }
    case 'count-by-fives': {
      const { other } = card
      const values = Array.from({ length: other }, (_, i) => 5 * (i + 1))
      return {
        badge: { label: 'Skip count', family: 'leaf' },
        diagram: { type: 'multiples', values },
        lines: [`count ${other} fives`],
        final: { lhs: `5 × ${other} =`, answer: 5 * other },
      }
    }
    case 'repeat-digit': {
      const { other } = card
      return {
        badge: { label: 'Same digit, two homes', family: 'plum' },
        diagram: { type: 'repeat-digit', digit: other },
        lines: [],
        final: { lhs: `${other * 10} + ${other} =`, answer: 11 * other },
        footnote: {
          type: 'note',
          text: 'Works for 11 × 1 up to 11 × 9. Past that, the digits crowd — break apart instead: 11 × 12 = 120 + 12.',
        },
      }
    }
    case 'generic':
      return {
        badge: { label: 'Think it through', family: 'plum' },
        diagram: { type: 'none' },
        lines: [],
        text: fallbackText,
      }
  }
}

export { squareRun }
