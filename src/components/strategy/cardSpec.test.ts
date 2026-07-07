import { describe, it, expect } from 'vitest'
import { specForCard, squareRun } from './cardSpec'

describe('specForCard', () => {
  it('bond-plus 12×7 sums the partial products to the answer', () => {
    const spec = specForCard({ kind: 'bond-plus', factor: 12, parts: [10, 2], other: 7 })
    expect(spec.lines).toEqual(['10 × 7 = 70', '2 × 7 = 14'])
    expect(spec.final).toEqual({ lhs: '70 + 14 =', answer: 84 })
  })

  it('bond-minus 9×8 spells out pretend → fix → answer', () => {
    const spec = specForCard({ kind: 'bond-minus', factor: 9, whole: 10, small: 1, other: 8 })
    expect(spec.steps).toEqual([
      { label: 'pretend', tone: 'amber', main: '10 × 8 = 80', sub: 'act like the 9 is a 10 — easy' },
      { label: 'fix', tone: 'rose', main: '80 − 8', sub: 'you used one group of 8 too many' },
    ])
    expect(spec.final?.answer).toBe(72)
  })

  it('double 3×7 doubles the known fact', () => {
    const spec = specForCard({ kind: 'double', half: 3, other: 7 })
    expect(spec.lines[0]).toBe('3 × 7 = 21')
    expect(spec.final).toEqual({ lhs: '21 + 21 =', answer: 42 })
    expect(spec.footnote).toBeUndefined()
  })

  it('square-grow 7 grows the previous square by the odd number', () => {
    const spec = specForCard({ kind: 'square-grow', n: 7 })
    expect(spec.lines[0]).toBe('6 × 6 = 36')
    expect(spec.final).toEqual({ lhs: '36 + 13 =', answer: 49 })
    expect(spec.footnote).toEqual({ type: 'odd-numbers', n: 7 })
    // consecutive squares grow by consecutive odd numbers
    expect(squareRun(7)).toEqual([25, 36, 49, 64])
  })

  it('place-value 7 shifts up one place', () => {
    const spec = specForCard({ kind: 'place-value', other: 7 })
    expect(spec.final).toEqual({ lhs: '10 × 7 =', answer: 70 })
  })

  it('generic keeps the fallback prose and has no final line', () => {
    const spec = specForCard({ kind: 'generic' }, 'Break it into friendly pieces.')
    expect(spec.text).toBe('Break it into friendly pieces.')
    expect(spec.final).toBeUndefined()
  })
})
