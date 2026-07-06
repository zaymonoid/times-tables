import { describe, it, expect } from 'vitest'
import { ALL_FACT_KEYS, factorsOf, answerOf } from './facts'
import { hintsFor, type Strategy } from './hints'

/** Does `text` contain `n` as a standalone number (not part of a longer run)? */
function hasNumber(text: string, n: number): boolean {
  return new RegExp(`(?<!\\d)${n}(?!\\d)`).test(text)
}

describe('hints', () => {
  it('every canonical fact has a primary strategy', () => {
    for (const key of ALL_FACT_KEYS) {
      const { primary } = hintsFor(key)
      expect(primary, key).toBeTruthy()
      expect(primary.text.length, key).toBeGreaterThan(0)
    }
  })

  it('every strategy states the correct product', () => {
    for (const key of ALL_FACT_KEYS) {
      const product = answerOf(key)
      const { primary, alt } = hintsFor(key)
      for (const s of [primary, alt].filter(Boolean) as Strategy[]) {
        expect(hasNumber(s.text, product), `${key}: "${s.text}"`).toBe(true)
      }
    }
  })

  it('splits reference an actual factor and add up to the product', () => {
    for (const key of ALL_FACT_KEYS) {
      const [x, y] = factorsOf(key)
      const product = answerOf(key)
      const { primary, alt } = hintsFor(key)
      for (const s of [primary, alt].filter(Boolean) as Strategy[]) {
        if (!s.split) continue
        const { factor, parts, op } = s.split
        // The decomposed factor is really one of this fact's operands.
        expect(factor === x || factor === y, `${key} factor ${factor}`).toBe(true)
        const other = product / factor
        expect(Number.isInteger(other), key).toBe(true)
        expect(parts[0], key).toBeGreaterThanOrEqual(1)
        expect(parts[1], key).toBeGreaterThanOrEqual(1)
        if (op === 'plus') {
          expect(parts[0] + parts[1], `${key} parts`).toBe(factor)
          expect(parts[0] * other + parts[1] * other, key).toBe(product)
        } else {
          expect(parts[0] - parts[1], `${key} parts`).toBe(factor)
          expect(parts[0] * other - parts[1] * other, key).toBe(product)
        }
      }
    }
  })
})
