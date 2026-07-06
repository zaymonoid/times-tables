import { describe, it, expect } from 'vitest'
import { createSession, practiceOutlook, PEDAGOGICAL_ORDER } from './session'
import { freshStore } from './storage'
import { reviewFact, retrievability } from './scheduler'
import { answerOf, factorsOf } from './facts'
import type { Store, SessionItem, FactKey } from './types'

const NOW = new Date('2026-01-01T00:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000

/** Drain a session answering everything correctly; returns items served. */
function drainCorrect(store: Store): SessionItem[] {
  const session = createSession(store, NOW)
  const served: SessionItem[] = []
  let guard = 0
  let item: SessionItem | null
  while ((item = session.next()) !== null) {
    served.push(item)
    session.answer(item, answerOf(item.key), 1500, NOW)
    if (++guard > 1000) throw new Error('session did not drain')
  }
  return served
}

/**
 * Introduce `keys` as weak facts: reviewed in the past so retrievability has
 * decayed below the 0.9 due threshold. Each is reviewed a distinct number of
 * days ago so their retrievabilities at NOW are strictly ordered (later keys
 * are weaker), letting tests reason about weakest-first trimming.
 */
function seedWeak(store: Store, keys: FactKey[]): void {
  keys.forEach((k, i) => {
    const past = new Date(NOW.getTime() - (i + 5) * DAY_MS)
    store.facts[k] = reviewFact(store.facts[k], 'good', past)
    store.facts[k].introduced = true
  })
}

/** Keys sorted by actual retrievability at NOW, weakest (lowest R) first. */
function byRetrievability(store: Store, keys: FactKey[]): FactKey[] {
  return [...keys].sort(
    (a, b) =>
      retrievability(store.facts[a].card, NOW) -
      retrievability(store.facts[b].card, NOW),
  )
}

describe('session queue construction', () => {
  it('introduces new facts in pedagogical order, refilling chunks as the learner keeps going', () => {
    const store = freshStore(NOW)
    store.settings.newPerSession = 3
    const session = createSession(store, NOW)
    // First chunk: the first newPerSession of PEDAGOGICAL_ORDER (one ×10, one
    // ×5, one square) — presentation order is shuffled within the chunk.
    const firstChunk: FactKey[] = []
    for (let i = 0; i < 3; i++) {
      const item = session.next()!
      firstChunk.push(item.key)
      session.answer(item, answerOf(item.key), 1100, NOW)
    }
    expect([...firstChunk].sort()).toEqual(
      [...PEDAGOGICAL_ORDER.slice(0, 3)].sort(),
    )
    // The session does NOT end at the chunk boundary: learning continues with
    // the next pedagogical chunk until the learner chooses to stop.
    const next = session.next()
    expect(next).not.toBeNull()
    expect(PEDAGOGICAL_ORDER.slice(3, 6)).toContain(next!.key)
  })

  it('with refills, a fully drained session covers every fact exactly once', () => {
    const store = freshStore(NOW)
    store.settings.newPerSession = 6
    const served = drainCorrect(store)
    const keys = served.map((s) => s.key)
    expect(new Set(keys).size).toBe(PEDAGOGICAL_ORDER.length) // all 55
    expect(keys).toHaveLength(PEDAGOGICAL_ORDER.length) // no repeats
  })

  it('includes ALL due/weak facts even when many are due', () => {
    const store = freshStore(NOW)
    store.settings.newPerSession = 0
    const keys = Object.keys(store.facts).slice(0, 30)
    seedWeak(store, keys)

    const served = drainCorrect(store).filter((s) => !s.relearn)
    const servedKeys = new Set(served.map((s) => s.key))
    // Every one of the 30 due facts made it into the session (no tight cap).
    expect(servedKeys.size).toBe(30)
    for (const k of keys) expect(servedKeys.has(k)).toBe(true)
  })

  it('reviews are uncapped: every one of the 55 due facts is served', () => {
    const store = freshStore(NOW)
    store.settings.newPerSession = 0
    const allKeys = Object.keys(store.facts) // all 55 facts
    seedWeak(store, allKeys)

    const served = drainCorrect(store)
    const servedKeys = new Set(served.map((s) => s.key))
    expect(servedKeys.size).toBe(allKeys.length)
  })

  it('shuffles presentation order (not R-ascending, not pedagogical)', () => {
    const store = freshStore(NOW)
    store.settings.newPerSession = 0
    const keys = Object.keys(store.facts).slice(0, 15)
    seedWeak(store, keys)

    const rAscending = byRetrievability(store, keys)
    const pedagogical = PEDAGOGICAL_ORDER.filter((k) => keys.includes(k))

    const served = drainCorrect(store).map((s) => s.key)
    // Same multiset of facts...
    expect(new Set(served)).toEqual(new Set(keys))
    expect(served).toHaveLength(15)
    // ...but presented in neither selection ordering (statistically safe at 15).
    expect(served).not.toEqual(rAscending)
    expect(served).not.toEqual(pedagogical)
  })

  it('de-clumping preserves the item multiset for a single family', () => {
    const store = freshStore(NOW)
    store.settings.newPerSession = 0
    // The whole ×10 family: every pair shares the factor 10, so the de-clump
    // pass can never fully separate them and is exercised heavily.
    const family = Object.keys(store.facts).filter((k) =>
      factorsOf(k).includes(10),
    )
    seedWeak(store, family)

    const served = drainCorrect(store)
      .map((s) => s.key)
      .sort()
    // Nothing dropped, nothing duplicated.
    expect(served).toEqual([...family].sort())
  })

  it('tops up to a worthwhile length when few are due', () => {
    const store = freshStore(NOW)
    // Introduce and freshly review 12 facts so they are strong (not due).
    const keys = Object.keys(store.facts).slice(0, 12)
    for (const k of keys) {
      store.facts[k] = reviewFact(store.facts[k], 'good', NOW)
      store.facts[k].introduced = true
    }
    store.settings.newPerSession = 0
    const session = createSession(store, NOW)
    let count = 0
    while (session.next() !== null) count++
    expect(count).toBeGreaterThanOrEqual(8)
  })
})

describe('session answering', () => {
  it('is commutative: [7,6] orientation updates fact 6x7', () => {
    const store = freshStore(NOW)
    const item: SessionItem = { key: '6x7', shownAs: [7, 6], relearn: false }
    const session = createSession(store, NOW)
    const res = session.answer(item, 42, 1500, NOW)
    expect(res.correct).toBe(true)
    expect(store.facts['6x7'].introduced).toBe(true)
    expect(store.facts['6x7'].recent[0].shownAs).toEqual([7, 6])
  })

  it('wrong answer re-queues within 3-4 positions and needs two corrects', () => {
    const store = freshStore(NOW)
    store.settings.newPerSession = 6
    const session = createSession(store, NOW)

    const first = session.next()!
    // Answer wrong.
    session.answer(first, answerOf(first.key) + 1, 1500, NOW)

    // Find how many cards until the missed fact reappears.
    const upcoming: SessionItem[] = []
    let it: SessionItem | null
    let reappearAt = -1
    while ((it = session.next()) !== null) {
      upcoming.push(it)
      if (it.key === first.key) {
        reappearAt = upcoming.length
        break
      }
    }
    expect(reappearAt).toBeGreaterThanOrEqual(1)
    expect(reappearAt).toBeLessThanOrEqual(4)

    // From here, it must be answered correctly twice more before it stops.
    // Rebuild a clean scenario to count corrects needed.
    const store2 = freshStore(NOW)
    const session2 = createSession(store2, NOW)
    const f = session2.next()!
    session2.answer(f, answerOf(f.key) + 1, 1500, NOW) // wrong
    let corrects = 0
    let cur: SessionItem | null
    while ((cur = session2.next()) !== null) {
      const isTarget = cur.key === f.key
      session2.answer(cur, answerOf(cur.key), 1500, NOW)
      if (isTarget) corrects++
    }
    expect(corrects).toBe(2)
  })

  it('applies FSRS only once per fact per session', () => {
    const store = freshStore(NOW)
    const session = createSession(store, NOW)
    const item: SessionItem = { key: '6x7', shownAs: [6, 7], relearn: false }

    session.answer(item, 42, 1500, NOW)
    const dueAfterFirst = store.facts['6x7'].card.due.getTime()
    const repsAfterFirst = store.facts['6x7'].card.reps

    // Simulate an in-session repeat of the same fact.
    session.answer({ ...item, relearn: true }, 42, 1500, NOW)
    expect(store.facts['6x7'].card.reps).toBe(repsAfterFirst) // no new review
    expect(store.facts['6x7'].card.due.getTime()).toBe(dueAfterFirst)
    // But the attempt is still recorded.
    expect(store.facts['6x7'].recent).toHaveLength(2)
  })

  it('drains to null and reports consistent summary', () => {
    const store = freshStore(NOW)
    store.settings.newPerSession = 6
    const served = drainCorrect(store)
    const session = createSession(freshStore(NOW), NOW) // for summary shape

    // Re-run capturing summary from the same session.
    const store2 = freshStore(NOW)
    store2.settings.newPerSession = 6
    const s2 = createSession(store2, NOW)
    let it: SessionItem | null
    let seen = 0
    let missed = 0
    while ((it = s2.next()) !== null) {
      const wrong = seen === 0 // miss the very first card once
      seen++
      s2.answer(it, wrong ? answerOf(it.key) + 1 : answerOf(it.key), 1500, NOW)
      if (wrong) missed++
    }
    const sum = s2.summary()
    expect(sum.cardsSeen).toBeGreaterThan(0)
    expect(sum.correct).toBe(sum.cardsSeen - missed)
    expect(sum.accuracy).toBeCloseTo(sum.correct / sum.cardsSeen)
    expect(sum.uniqueFacts).toBeLessThanOrEqual(sum.cardsSeen)
    expect(sum.missed.length).toBeGreaterThanOrEqual(1)
    expect(served.length).toBeGreaterThan(0)
    void session
  })

  it('updates rolling medianMs and totalAttempts', () => {
    const store = freshStore(NOW)
    const session = createSession(store, NOW)
    const item = session.next()!
    session.answer(item, answerOf(item.key), 1800, NOW)
    expect(store.stats.totalAttempts).toBe(1)
    expect(store.stats.medianMs).toBe(1800) // seeded on first attempt
    const item2 = session.next()!
    session.answer(item2, answerOf(item2.key), 5000, NOW)
    expect(store.stats.totalAttempts).toBe(2)
    expect(store.stats.medianMs).toBeGreaterThan(1800) // nudged upward
  })
})

describe('slow-but-correct re-queue', () => {
  it('re-queues a slow correct answer exactly once, even if slow again', () => {
    const store = freshStore(NOW)
    store.settings.newPerSession = 4
    const session = createSession(store, NOW)
    const first = session.next()!
    const slowKey = first.key
    const served: SessionItem[] = [first]
    session.answer(first, answerOf(first.key), 5000, NOW) // correct but slow
    let it: SessionItem | null
    let guard = 0
    while ((it = session.next()) !== null) {
      served.push(it)
      // Stay slow on the target fact; instant on everything else.
      const ms = it.key === slowKey ? 5000 : 1200
      session.answer(it, answerOf(it.key), ms, NOW)
      if (++guard > 100) throw new Error('session did not drain')
    }
    const showings = served.filter((s) => s.key === slowKey)
    expect(showings).toHaveLength(2) // original + one relearn repeat, no loop
    expect(showings[1].relearn).toBe(true)
  })

  it('fast correct answers do not re-queue', () => {
    const store = freshStore(NOW)
    store.settings.newPerSession = 4
    const served = drainCorrect(store) // answers everything at 1500ms
    const keys = served.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length) // each fact shown once
  })
})

describe('practiceOutlook', () => {
  it('has practice available for a fresh store', () => {
    const store = freshStore(NOW)
    const o = practiceOutlook(store, NOW)
    expect(o.available).toBeGreaterThan(0)
    expect(o.nextAt).toBeNull()
  })

  it('reports caught-up with a nextAt when everything was just practiced', () => {
    const store = freshStore(NOW)
    for (const k of Object.keys(store.facts)) {
      store.facts[k] = reviewFact(store.facts[k], 'good', NOW)
      store.facts[k].introduced = true
      store.facts[k].recent.push({
        ts: NOW.getTime(),
        shownAs: factorsOf(k),
        correct: true,
        ms: 1100,
      })
    }
    const o = practiceOutlook(store, NOW)
    expect(o.available).toBe(0)
    expect(o.nextAt).not.toBeNull()
    // Practice reopens no later than the 30-minute top-up cooldown, and never
    // in the past.
    expect(o.nextAt!.getTime()).toBeGreaterThanOrEqual(NOW.getTime())
    expect(o.nextAt!.getTime()).toBeLessThanOrEqual(NOW.getTime() + 30 * 60 * 1000)
  })
})

describe('summary avgMs', () => {
  it('is forward weighted toward the most recent answers', () => {
    const store = freshStore(NOW)
    const session = createSession(store, NOW)
    const i1 = session.next()!
    session.answer(i1, answerOf(i1.key), 5000, NOW) // cold start
    const i2 = session.next()!
    session.answer(i2, answerOf(i2.key), 1000, NOW) // warmed up
    const sum = session.summary()
    expect(sum.avgMs).toBeLessThan(3000) // below the flat mean
    expect(sum.avgMs).toBeGreaterThan(1000)
  })
})
