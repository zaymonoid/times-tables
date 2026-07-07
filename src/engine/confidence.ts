import type { FactState, Store, FactConfidence, ConfidenceBucket, FactKey } from './types'
import { fluencyOf, retrievability } from './scheduler'

/**
 * Confidence is projected retention: the probability you'll still recall the
 * fact HORIZON_DAYS from now. Right after a review instantaneous R is ~1 for
 * every card, which made freshly-seen facts read as "automatic"; projecting a
 * week out means only cards with real stability score high.
 */
const HORIZON_DAYS = 7
const DAY_MS = 86_400_000

/**
 * Full confidence also requires evidence across multiple sessions. FSRS reps
 * increment once per session (in-session repeats don't re-review), and a
 * single fast answer can seed ~2 weeks of stability — enough to look
 * "automatic" from one data point. min(1, reps/3) demands 3 sessions.
 */
const MATURITY_REPS = 3

function bucketFor(score: number, trained: boolean): ConfidenceBucket {
  if (!trained) return 'untrained'
  if (score < 0.25) return 'building'
  if (score < 0.55) return 'learning'
  if (score < 0.85) return 'solid'
  return 'automatic'
}

/**
 * score = projected retention at +7d × recent-fluency weight × maturity.
 * - fluency weight = mean fluencyOf over recent attempts: wrong answers count
 *   0 and correct answers scale by pace, so a fact that's only ever answered
 *   slowly (worked out, not recalled) reads building regardless of accuracy.
 * - maturity = min(1, reps / 3), so mastery needs repeated spaced evidence.
 * Untrained facts score 0.
 */
export function confidenceFor(fact: FactState, now: Date = new Date()): FactConfidence {
  const trained = fact.introduced && fact.card.reps > 0
  if (!trained) {
    return { key: fact.key, score: 0, bucket: 'untrained' }
  }

  const horizon = new Date(now.getTime() + HORIZON_DAYS * DAY_MS)
  const r = retrievability(fact.card, horizon)

  let weight = 1
  if (fact.recent.length > 0) {
    const total = fact.recent.reduce((sum, a) => sum + fluencyOf(a), 0)
    weight = total / fact.recent.length
  }

  const maturity = Math.min(1, fact.card.reps / MATURITY_REPS)

  const score = r * weight * maturity
  return { key: fact.key, score, bucket: bucketFor(score, true) }
}

export function allConfidences(
  store: Store,
  now: Date = new Date(),
): Record<FactKey, FactConfidence> {
  const out: Record<FactKey, FactConfidence> = {}
  for (const key of Object.keys(store.facts)) {
    out[key] = confidenceFor(store.facts[key], now)
  }
  return out
}

export interface ConfidenceSummary {
  /** Fact count per bucket. */
  buckets: Record<ConfidenceBucket, number>
  /** Facts at solid or automatic. */
  solidPlus: number
  total: number
  /** solidPlus as a whole percentage of total. */
  pct: number
}

/** Aggregate an allConfidences() result — the UI should never tally buckets. */
export function summarizeConfidences(
  confidences: Record<FactKey, FactConfidence>,
): ConfidenceSummary {
  const buckets: Record<ConfidenceBucket, number> = {
    untrained: 0,
    building: 0,
    learning: 0,
    solid: 0,
    automatic: 0,
  }
  const keys = Object.keys(confidences)
  for (const key of keys) buckets[confidences[key].bucket] += 1
  const solidPlus = buckets.solid + buckets.automatic
  const total = keys.length
  return {
    buckets,
    solidPlus,
    total,
    pct: total > 0 ? Math.round((solidPlus / total) * 100) : 0,
  }
}
