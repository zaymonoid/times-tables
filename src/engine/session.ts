import {
  MIN_FACTOR,
  MAX_FACTOR,
  type Store,
  type Session,
  type SessionItem,
  type AnswerResult,
  type SessionSummaryData,
  type FactKey,
  type Attempt,
} from './types'
import { keyFor, factorsOf, answerOf, ALL_FACT_KEYS } from './facts'
import { gradeAttempt, reviewFact, retrievability } from './scheduler'
import { confidenceFor } from './confidence'

// Reviews are never capped and never floored: a session contains exactly the
// facts that are actually due (below target retention) plus a chunk of new
// facts. If nothing is due and nothing is new, there is nothing to practice —
// FSRS decides when a fact returns, and we don't manufacture busywork by
// re-drilling cards the learner already knows. New facts flow in continuously
// in chunks of settings.newPerSession as long as the learner keeps going — the
// UI offers a "finished for now" exit rather than the engine cutting short.
const DUE_THRESHOLD = 0.9
const RECENT_CAP = 10
const DAY_MS = 86_400_000
// A fact missed this many times in one session stops being re-queued: FSRS has
// already logged the lapse on the first attempt and will carry it to the next
// session, so further same-session repeats only balloon the queue.
const MAX_RELEARN_MISSES = 3

/**
 * Deterministic pedagogical ordering of all 55 facts. Families are ranked
 * easy-anchors-first (×10, ×5, squares, ×11, ×4, ×3, ×6, ×12, ×8, ×9), but
 * introduction is INTERLEAVED round-robin across them — one ×10, one ×5, one
 * square, one ×11, … — so a session's new facts span varied families instead
 * of a monotonous block of e.g. all ×10s (7-facts are pulled in as second
 * factors of these families; all 55 keys are covered).
 */
export const PEDAGOGICAL_ORDER: FactKey[] = (() => {
  const steps: (number | 'squares')[] = [10, 5, 'squares', 11, 4, 3, 6, 12, 8, 9]
  const families: FactKey[][] = steps.map((step) => {
    const family: FactKey[] = []
    if (step === 'squares') {
      for (let n = MIN_FACTOR; n <= MAX_FACTOR; n++) family.push(keyFor(n, n))
    } else {
      for (let x = MIN_FACTOR; x <= MAX_FACTOR; x++) family.push(keyFor(step, x))
    }
    return family
  })

  const order: FactKey[] = []
  const seen = new Set<FactKey>()
  const add = (k: FactKey) => {
    if (!seen.has(k)) {
      seen.add(k)
      order.push(k)
    }
  }
  const longest = Math.max(...families.map((f) => f.length))
  for (let i = 0; i < longest; i++) {
    for (const family of families) {
      if (i < family.length) add(family[i])
    }
  }
  for (const k of ALL_FACT_KEYS) add(k) // safety net
  return order
})()

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1))
}

/**
 * Recency-biased mean: each step back in time discounts a sample's weight by
 * MS_DECAY. Reported speed reflects where the learner ENDED UP (~ the last
 * half-dozen answers dominate), not a flat average dragged up by the cold
 * start of the session.
 */
const MS_DECAY = 0.85

function forwardWeightedMean(samples: number[]): number {
  let sum = 0
  let weightSum = 0
  let w = 1
  for (let i = samples.length - 1; i >= 0; i--) {
    sum += samples[i] * w
    weightSum += w
    w *= MS_DECAY
  }
  return weightSum > 0 ? sum / weightSum : 0
}

/** In-place Fisher–Yates shuffle. */
function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

/** Do two facts share a common factor (e.g. 3×10 and 4×10 both have 10)? */
function sharesFactor(a: FactKey, b: FactKey): boolean {
  const [a1, a2] = factorsOf(a)
  const [b1, b2] = factorsOf(b)
  return a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2
}

/**
 * Light, best-effort de-clumping: a single forward pass that tries to break up
 * immediately-adjacent items sharing a factor (which invite "counting on" from
 * the previous answer). For each clash we swap in the nearest later item that
 * doesn't clash with the previous one. Single pass, no rescans — never loops
 * and never drops or duplicates items.
 */
function declump(items: SessionItem[]): void {
  for (let i = 1; i < items.length; i++) {
    if (!sharesFactor(items[i - 1].key, items[i].key)) continue
    for (let j = i + 1; j < items.length; j++) {
      if (!sharesFactor(items[i - 1].key, items[j].key)) {
        const tmp = items[i]
        items[i] = items[j]
        items[j] = tmp
        break
      }
    }
  }
}

/** Random display orientation; squares only have one. */
function itemFor(key: FactKey, relearn = false): SessionItem {
  const [a, b] = factorsOf(key)
  const shownAs: [number, number] =
    a !== b && Math.random() < 0.5 ? [b, a] : [a, b]
  return { key, shownAs, relearn }
}

interface FactRun {
  attempts: number
  corrects: number
  misses: number
  fsrsApplied: boolean
  /** Corrects still owed before we stop re-queueing after a miss. */
  relearnOwed: number
  wasNewAtStart: boolean
}

class SessionImpl implements Session {
  private store: Store
  private pending: SessionItem[]
  private runs = new Map<FactKey, FactRun>()
  private done = 0
  private correctCount = 0
  private msHistory: number[] = []
  private fastCount = 0
  /** Item handed out by next() but not yet answered (the on-screen card). */
  private current: SessionItem | null = null

  constructor(store: Store, now: Date) {
    this.store = store
    this.pending = buildQueue(store, now)
    for (const item of this.pending) {
      if (!this.runs.has(item.key)) {
        this.runs.set(item.key, {
          attempts: 0,
          corrects: 0,
          misses: 0,
          fsrsApplied: false,
          relearnOwed: 0,
          wasNewAtStart: !store.facts[item.key].introduced,
        })
      }
    }
    store.stats.sessions += 1
  }

  private satisfied(key: FactKey): boolean {
    return (this.runs.get(key)?.relearnOwed ?? 0) <= 0
  }

  next(): SessionItem | null {
    let item = this.take()
    // Queue drained: keep the session going with a fresh chunk of new facts.
    // The learner decides when to stop (the UI's "finished for now"); the
    // session only truly ends when there is nothing left to learn or relearn.
    if (!item) {
      this.refillNew()
      item = this.take()
    }
    this.current = item
    return item
  }

  /** Pop the next live item, dropping satisfied relearn repeats. */
  private take(): SessionItem | null {
    while (this.pending.length > 0) {
      const item = this.pending.shift()!
      if (item.relearn && this.satisfied(item.key)) continue
      return item
    }
    return null
  }

  /** Append the next pedagogical chunk of un-introduced facts, if any. */
  private refillNew(): void {
    const chunk = this.store.settings.newPerSession
    if (chunk <= 0) return
    const fresh = PEDAGOGICAL_ORDER.filter(
      (k) => !this.store.facts[k].introduced && !this.runs.has(k),
    ).slice(0, chunk)
    if (fresh.length === 0) return
    const items = fresh.map((k) => itemFor(k))
    shuffle(items)
    declump(items)
    for (const item of items) {
      this.runs.set(item.key, {
        attempts: 0,
        corrects: 0,
        misses: 0,
        fsrsApplied: false,
        relearnOwed: 0,
        wasNewAtStart: true,
      })
    }
    this.pending.push(...items)
  }

  answer(
    item: SessionItem,
    given: number,
    ms: number,
    now: Date = new Date(),
  ): AnswerResult {
    const key = item.key
    const correctAnswer = answerOf(key)
    const correct = given === correctAnswer
    const grade = gradeAttempt(correct, ms)

    let run = this.runs.get(key)
    if (!run) {
      // Robust to answers for items not seeded from the initial queue.
      run = {
        attempts: 0,
        corrects: 0,
        misses: 0,
        fsrsApplied: false,
        relearnOwed: 0,
        wasNewAtStart: !this.store.facts[key].introduced,
      }
      this.runs.set(key, run)
    }
    run.attempts += 1

    // FSRS scheduling is driven only by the FIRST attempt of a fact this
    // session. Same-day in-session relearn repeats must NOT call reviewFact
    // again — repeated same-day reviews would corrupt the card's stability.
    if (!run.fsrsApplied) {
      this.store.facts[key] = reviewFact(this.store.facts[key], grade, now)
      run.fsrsApplied = true
    }
    this.store.facts[key].introduced = true

    // Record the attempt (recent capped at 10, newest last).
    const attempt: Attempt = { ts: now.getTime(), shownAs: item.shownAs, correct, ms }
    const recent = this.store.facts[key].recent
    recent.push(attempt)
    if (recent.length > RECENT_CAP) recent.splice(0, recent.length - RECENT_CAP)

    // Stats. typicalMs is an exponential moving average of response time —
    // seeded with the first sample, then blended a fixed fraction toward each
    // new one. Unlike a step scaled by the current value, an EMA is a
    // well-defined statistic and doesn't drift upward as the value grows.
    this.store.stats.totalAttempts += 1
    const EMA_ALPHA = 0.1
    const m = this.store.stats.typicalMs
    this.store.stats.typicalMs = m > 0 ? m * (1 - EMA_ALPHA) + ms * EMA_ALPHA : ms

    // Session bookkeeping. The on-screen card is now answered (folded into
    // `done`), so it no longer counts as in-flight until next() hands out more.
    if (this.current === item) this.current = null
    this.done += 1
    this.msHistory.push(ms)
    if (grade === 'easy') this.fastCount += 1
    if (correct) {
      this.correctCount += 1
      run.corrects += 1
      if (run.relearnOwed > 0) run.relearnOwed -= 1
      // Correct but not fluent (steady/slow pace grades `hard`): re-queue once
      // for another shot at speed while the fact is warm. Only from a first
      // showing (!relearn) so a persistently slow fact can't loop forever.
      if (grade === 'hard' && !item.relearn) {
        run.relearnOwed = Math.max(run.relearnOwed, 1)
        const later = Math.min(this.pending.length, randInt(3, 5))
        this.pending.splice(later, 0, itemFor(key, true))
      }
    } else {
      run.misses += 1
      // A miss must be answered correctly twice more to clear. Re-queue once
      // 3–4 positions on and once near the end — but stop after a handful of
      // misses so a fact the learner keeps failing can't balloon the queue;
      // FSRS carries it to the next session.
      run.relearnOwed = 2
      if (run.misses <= MAX_RELEARN_MISSES) {
        const near = Math.min(this.pending.length, randInt(2, 3))
        this.pending.splice(near, 0, itemFor(key, true))
        this.pending.push(itemFor(key, true))
      }
    }

    return { correct, correctAnswer, grade }
  }

  progress(): { done: number; total: number } {
    const remaining = this.pending.filter(
      (it) => !(it.relearn && this.satisfied(it.key)),
    ).length
    // The on-screen card (handed out by next(), not yet answered) counts
    // toward the total so the bar never reads 100% while a card is still up.
    const inFlight = this.current ? 1 : 0
    return { done: this.done, total: this.done + inFlight + remaining }
  }

  summary(): SessionSummaryData {
    const uniqueFacts = [...this.runs.keys()].filter(
      (k) => this.runs.get(k)!.attempts > 0,
    )
    const newFacts = uniqueFacts.filter((k) => {
      const r = this.runs.get(k)!
      return r.wasNewAtStart && r.attempts > 0
    })
    const missed = uniqueFacts.filter((k) => this.runs.get(k)!.misses > 0)

    // Weakest first: more misses first, then lower confidence.
    missed.sort((a, b) => {
      const dm = this.runs.get(b)!.misses - this.runs.get(a)!.misses
      if (dm !== 0) return dm
      return (
        confidenceFor(this.store.facts[a]).score -
        confidenceFor(this.store.facts[b]).score
      )
    })

    return {
      cardsSeen: this.done,
      uniqueFacts: uniqueFacts.length,
      correct: this.correctCount,
      accuracy: this.done > 0 ? this.correctCount / this.done : 0,
      avgMs: forwardWeightedMean(this.msHistory),
      fastCount: this.fastCount,
      fastRate: this.done > 0 ? this.fastCount / this.done : 0,
      newFacts,
      missed,
    }
  }
}

/** Which facts a session started at `now` would contain (selection only). */
function selectQueueKeys(store: Store, now: Date): FactKey[] {
  // Due/weak: every introduced fact whose retrievability has decayed below the
  // target. For review-state cards this coincides with FSRS's own due date
  // (due IS the R = request_retention crossing); using retrievability keeps
  // selection consistent for learning-step cards, whose due dates are
  // step-timed rather than retention-timed, and immune to due-date fuzz.
  // Reviews are never capped, and buildQueue shuffles for presentation, so no
  // priority sort is needed here — the filter is the whole selection.
  const dueWeak = ALL_FACT_KEYS.filter(
    (k) =>
      store.facts[k].introduced &&
      retrievability(store.facts[k].card, now) < DUE_THRESHOLD,
  )

  // New facts in pedagogical order, up to the per-session budget. This is the
  // only source of forward progress — and the reason a session is rarely empty
  // while there is anything left to learn.
  const newFacts = PEDAGOGICAL_ORDER.filter(
    (k) => !store.facts[k].introduced,
  ).slice(0, store.settings.newPerSession)

  return [...dueWeak, ...newFacts]
}

function buildQueue(store: Store, now: Date): SessionItem[] {
  // Selection's R-sort and pedagogical order drive SELECTION only. Presentation
  // order must be unpredictable: a sorted/blocked queue serves predictable runs
  // (e.g. 3×10, 4×10, 5×10) that let the learner count on from the previous
  // answer instead of recalling. Shuffle, then lightly de-clump shared factors.
  const items = selectQueueKeys(store, now).map((k) => itemFor(k))
  shuffle(items)
  declump(items)
  return items
}

export interface PracticeOutlook {
  /** Cards a session started now would open with. */
  available: number
  /** When practice next becomes available; null while available > 0. */
  nextAt: Date | null
}

/**
 * What would practicing right now look like? available === 0 only when every
 * fact is introduced and none has decayed below target retention — i.e.
 * genuinely all caught up, with FSRS holding the next review in the future.
 * nextAt is found by asking the engine's own selection: availability is
 * monotone in time (retrievability only decays, and it's the sole gate now),
 * so we probe forward (doubling) for a time that IS available, then
 * binary-search the earliest minute selectQueueKeys() turns non-empty. This
 * keeps the prediction exactly consistent with what the practice button would
 * do — FSRS due dates alone can lie (a learning-step card can be "due" while
 * its retrievability is still above the selection threshold).
 */
export function practiceOutlook(store: Store, now: Date = new Date()): PracticeOutlook {
  const available = selectQueueKeys(store, now).length
  if (available > 0) return { available, nextAt: null }

  const MINUTE = 60_000
  const cap = now.getTime() + 400 * DAY_MS
  let lo = now.getTime() // known-unavailable (checked above)
  let hi = lo + MINUTE
  let span = MINUTE
  while (selectQueueKeys(store, new Date(hi)).length === 0 && hi < cap) {
    lo = hi
    span *= 2
    hi = Math.min(cap, lo + span)
  }
  // No card recovers within the horizon (only possible with no introduced
  // facts, or stability measured in years): treat as nothing scheduled.
  if (selectQueueKeys(store, new Date(hi)).length === 0) {
    return { available: 0, nextAt: null }
  }
  while (hi - lo > MINUTE) {
    const mid = lo + Math.floor((hi - lo) / 2)
    if (selectQueueKeys(store, new Date(mid)).length > 0) hi = mid
    else lo = mid
  }
  return { available: 0, nextAt: new Date(hi) }
}

export function createSession(store: Store, now: Date = new Date()): Session {
  return new SessionImpl(store, now)
}
