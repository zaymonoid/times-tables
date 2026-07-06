import { describe, it, expect } from 'vitest'
import { keyFor, factorsOf, answerOf, ALL_FACT_KEYS } from './facts'

describe('facts', () => {
  it('has 55 unique keys', () => {
    expect(ALL_FACT_KEYS).toHaveLength(55)
    expect(new Set(ALL_FACT_KEYS).size).toBe(55)
  })

  it('keyFor is orientation-independent and canonical', () => {
    expect(keyFor(7, 6)).toBe('6x7')
    expect(keyFor(6, 7)).toBe('6x7')
    expect(keyFor(9, 9)).toBe('9x9')
  })

  it('factorsOf round-trips', () => {
    expect(factorsOf('6x7')).toEqual([6, 7])
    expect(factorsOf('12x12')).toEqual([12, 12])
  })

  it('answerOf multiplies', () => {
    expect(answerOf('6x7')).toBe(42)
    expect(answerOf('12x12')).toBe(144)
  })

  it('all keys are in range 3..12', () => {
    for (const k of ALL_FACT_KEYS) {
      const [a, b] = factorsOf(k)
      expect(a).toBeGreaterThanOrEqual(3)
      expect(b).toBeLessThanOrEqual(12)
      expect(a).toBeLessThanOrEqual(b)
    }
  })
})
