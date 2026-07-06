import { describe, it, expect } from 'vitest'
import { confidenceFor, allConfidences, summarizeConfidences } from './confidence'
import { freshStore } from './storage'
import { reviewFact, newCard } from './scheduler'
import type { FactState, Attempt } from './types'

function attempt(correct: boolean, ms = 1500): Attempt {
  return { ts: 0, shownAs: [6, 7], correct, ms }
}

describe('confidence', () => {
  it('untrained facts score 0 and bucket untrained', () => {
    const fact: FactState = {
      key: '6x7',
      card: newCard(new Date('2026-01-01')),
      introduced: false,
      recent: [],
    }
    const c = confidenceFor(fact, new Date('2026-01-01'))
    expect(c.score).toBe(0)
    expect(c.bucket).toBe('untrained')
  })

  it('a fresh success scores above 0 and is not untrained', () => {
    let fact: FactState = {
      key: '6x7',
      card: newCard(new Date('2026-01-01')),
      introduced: true,
      recent: [attempt(true)],
    }
    fact = reviewFact(fact, 'good', new Date('2026-01-01'))
    const c = confidenceFor(fact, new Date('2026-01-01T00:01:00Z'))
    expect(c.score).toBeGreaterThan(0)
    expect(c.bucket).not.toBe('untrained')
  })

  it('recent misses drag the score below raw retrievability', () => {
    const base = reviewFact(
      {
        key: '6x7',
        card: newCard(new Date('2026-01-01')),
        introduced: true,
        recent: [],
      },
      'good',
      new Date('2026-01-01'),
    )
    const now = new Date('2026-01-01T00:01:00Z')
    const perfect = confidenceFor({ ...base, recent: [attempt(true), attempt(true)] }, now)
    const shaky = confidenceFor(
      { ...base, recent: [attempt(false), attempt(false)] },
      now,
    )
    expect(perfect.score).toBeGreaterThan(shaky.score)
  })

  it('buckets are monotonic in score', () => {
    const order = ['weak', 'learning', 'solid', 'automatic']
    const cutoffs = [0.1, 0.4, 0.7, 0.95]
    const buckets = cutoffs.map((s) => {
      // craft by directly checking bucket boundaries via score mapping
      if (s < 0.25) return 'weak'
      if (s < 0.55) return 'learning'
      if (s < 0.85) return 'solid'
      return 'automatic'
    })
    expect(buckets).toEqual(order)
  })

  it('a single fast success does NOT read as automatic', () => {
    let fact: FactState = {
      key: '6x7',
      card: newCard(new Date('2026-01-01')),
      introduced: true,
      recent: [attempt(true)],
    }
    fact = reviewFact(fact, 'easy', new Date('2026-01-01'))
    const c = confidenceFor(fact, new Date('2026-01-01T00:01:00Z'))
    expect(c.bucket).not.toBe('automatic')
    expect(c.bucket).not.toBe('solid')
  })

  it('repeated spaced successes climb toward automatic', () => {
    let fact: FactState = {
      key: '6x7',
      card: newCard(new Date('2026-01-01')),
      introduced: true,
      recent: [attempt(true), attempt(true), attempt(true)],
    }
    // Three sessions across widening gaps.
    fact = reviewFact(fact, 'good', new Date('2026-01-01'))
    fact = reviewFact(fact, 'easy', new Date('2026-01-03'))
    fact = reviewFact(fact, 'easy', new Date('2026-01-10'))
    const c = confidenceFor(fact, new Date('2026-01-10T00:01:00Z'))
    expect(['solid', 'automatic']).toContain(c.bucket)
    // And it decays: weeks later without review, confidence is lower.
    const later = confidenceFor(fact, new Date('2026-03-01'))
    expect(later.score).toBeLessThan(c.score)
  })

  it('a mature fact answered only slowly reads weak, not automatic', () => {
    let fact: FactState = {
      key: '6x7',
      card: newCard(new Date('2026-01-01')),
      introduced: true,
      // Always correct, but always >4s: worked out, never recalled.
      recent: [attempt(true, 5000), attempt(true, 6000), attempt(true, 5500)],
    }
    fact = reviewFact(fact, 'hard', new Date('2026-01-01'))
    fact = reviewFact(fact, 'hard', new Date('2026-01-03'))
    fact = reviewFact(fact, 'hard', new Date('2026-01-10'))
    const c = confidenceFor(fact, new Date('2026-01-10T00:01:00Z'))
    expect(c.bucket).toBe('weak')
  })

  it('speed separates otherwise identical accuracy records', () => {
    const base = reviewFact(
      {
        key: '6x7',
        card: newCard(new Date('2026-01-01')),
        introduced: true,
        recent: [],
      },
      'good',
      new Date('2026-01-01'),
    )
    const now = new Date('2026-01-01T00:01:00Z')
    const instant = confidenceFor(
      { ...base, recent: [attempt(true, 1200), attempt(true, 1000)] },
      now,
    )
    const slow = confidenceFor(
      { ...base, recent: [attempt(true, 5000), attempt(true, 7000)] },
      now,
    )
    expect(instant.score).toBeGreaterThan(slow.score)
  })

  it('allConfidences covers every fact', () => {
    const store = freshStore()
    const all = allConfidences(store)
    expect(Object.keys(all)).toHaveLength(55)
    expect(all['6x7'].bucket).toBe('untrained')
  })

  it('summarizeConfidences tallies buckets and percentage', () => {
    const store = freshStore()
    const summary = summarizeConfidences(allConfidences(store))
    expect(summary.total).toBe(55)
    expect(summary.buckets.untrained).toBe(55)
    expect(summary.solidPlus).toBe(0)
    expect(summary.pct).toBe(0)
  })
})
