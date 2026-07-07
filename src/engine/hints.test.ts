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

  it('every fact has an alternate strategy', () => {
    for (const key of ALL_FACT_KEYS) {
      const { alt } = hintsFor(key)
      expect(alt, key).toBeTruthy()
    }
  })

  it('every strategy card is arithmetically consistent with its fact', () => {
    for (const key of ALL_FACT_KEYS) {
      const product = answerOf(key)
      const { primary, alt } = hintsFor(key)
      for (const s of [primary, alt].filter(Boolean) as Strategy[]) {
        const c = s.card
        switch (c.kind) {
          case 'bond-plus':
            expect(c.parts[0] + c.parts[1], key).toBe(c.factor)
            expect(c.factor * c.other, key).toBe(product)
            break
          case 'bond-minus':
            expect(c.whole - c.small, key).toBe(c.factor)
            expect(c.factor * c.other, key).toBe(product)
            break
          case 'double':
            expect(2 * c.half * c.other, key).toBe(product)
            break
          case 'double-double':
            expect(4 * c.other, key).toBe(product)
            break
          case 'square-grow':
            expect(c.n * c.n, key).toBe(product)
            expect((c.n - 1) ** 2 + (2 * c.n - 1), key).toBe(product)
            break
          case 'place-value':
            expect(10 * c.other, key).toBe(product)
            break
          case 'half-of-ten':
            expect(5 * c.other, key).toBe(product)
            break
          case 'count-by-fives':
            expect(5 * c.other, key).toBe(product)
            break
          case 'repeat-digit':
            expect(11 * c.other, key).toBe(product)
            expect(c.other, key).toBeLessThanOrEqual(9)
            break
          case 'generic':
            break
        }
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
