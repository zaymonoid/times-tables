import { describe, it, expect } from 'vitest'
import { State } from 'ts-fsrs'
import {
  fluencyOf,
  gradeAttempt,
  paceOf,
  reviewFact,
  retrievability,
  newCard,
} from './scheduler'
import type { FactState } from './types'

function mkFact(): FactState {
  return { key: '6x7', card: newCard(new Date('2026-01-01')), introduced: false, recent: [] }
}

describe('paceOf', () => {
  it('tiers by absolute response time', () => {
    expect(paceOf(900)).toBe('instant')
    expect(paceOf(1500)).toBe('instant')
    expect(paceOf(2000)).toBe('quick')
    expect(paceOf(2500)).toBe('quick')
    expect(paceOf(3500)).toBe('steady')
    expect(paceOf(4000)).toBe('steady')
    expect(paceOf(4200)).toBe('slow')
    expect(paceOf(6000)).toBe('slow')
  })
})

describe('fluencyOf', () => {
  it('wrong answers are zero evidence regardless of speed', () => {
    expect(fluencyOf({ correct: false, ms: 800 })).toBe(0)
    expect(fluencyOf({ correct: false, ms: 9000 })).toBe(0)
  })

  it('correct answers scale by pace', () => {
    expect(fluencyOf({ correct: true, ms: 1200 })).toBe(1) // instant
    expect(fluencyOf({ correct: true, ms: 2000 })).toBe(0.75) // quick
    expect(fluencyOf({ correct: true, ms: 3500 })).toBe(0.45) // steady
    expect(fluencyOf({ correct: true, ms: 5000 })).toBe(0.2) // slow
  })
})

describe('gradeAttempt', () => {
  it('wrong is always again', () => {
    expect(gradeAttempt(false, 100)).toBe('again')
    expect(gradeAttempt(false, 5000)).toBe('again')
  })

  it('only instant recall earns easy', () => {
    expect(gradeAttempt(true, 1200)).toBe('easy')
    expect(gradeAttempt(true, 2000)).toBe('good')
  })

  it('correct but computed grades hard', () => {
    expect(gradeAttempt(true, 3500)).toBe('hard') // steady
    expect(gradeAttempt(true, 8000)).toBe('hard') // slow
  })
})

describe('reviewFact', () => {
  it('advances due and is immutable', () => {
    const fact = mkFact()
    const now = new Date('2026-01-01T00:00:00Z')
    const next = reviewFact(fact, 'good', now)
    expect(next).not.toBe(fact)
    expect(fact.card.state).toBe(State.New) // original untouched
    expect(next.card.due.getTime()).toBeGreaterThan(now.getTime())
    expect(next.card.reps).toBe(1)
  })

  it('again on a learned card increases lapses', () => {
    let fact = mkFact()
    // Learn it up over several days.
    fact = reviewFact(fact, 'good', new Date('2026-01-01'))
    fact = reviewFact(fact, 'good', new Date('2026-01-02'))
    fact = reviewFact(fact, 'good', new Date('2026-01-10'))
    const beforeLapses = fact.card.lapses
    const lapsed = reviewFact(fact, 'again', new Date('2026-01-20'))
    expect(lapsed.card.lapses).toBe(beforeLapses + 1)
  })
})

describe('retrievability', () => {
  it('is 0 for brand-new cards', () => {
    expect(retrievability(mkFact().card, new Date('2026-01-01'))).toBe(0)
  })

  it('is a probability in (0,1] just after review and decays over time', () => {
    const fact = reviewFact(mkFact(), 'good', new Date('2026-01-01'))
    const soon = retrievability(fact.card, new Date('2026-01-01T00:05:00Z'))
    const later = retrievability(fact.card, new Date('2026-02-01'))
    expect(soon).toBeGreaterThan(0)
    expect(soon).toBeLessThanOrEqual(1)
    expect(later).toBeLessThan(soon)
  })
})
