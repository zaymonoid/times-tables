import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  State,
  type Card,
  type Grade,
} from 'ts-fsrs'
import type { FactState } from './types'

export type AttemptGrade = 'again' | 'hard' | 'good' | 'easy'

/**
 * FSRS configured for intensive drilling: fuzz on, short-term learning steps
 * enabled with tight steps so same-day relearning stays snappy, and the
 * standard 90% target retention.
 */
const params = generatorParameters({
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['1m', '10m'],
  request_retention: 0.9,
})

const scheduler = fsrs(params)

/** A blank card for a brand-new fact. */
export function newCard(now: Date = new Date()): Card {
  return createEmptyCard(now)
}

/**
 * Absolute pace tiers for a correct answer. The whole system targets
 * automaticity, so the bar is fixed — NOT relative to the user's own typical
 * speed (a slow user grading themselves on a curve defeats the point).
 * "Instant" budgets ~2s for reading the prompt and typing 1–3 digits, with
 * the recall itself being immediate. Anything past ~3s means the answer was
 * worked out, not recalled.
 */
export type Pace = 'instant' | 'quick' | 'steady' | 'slow'

export const PACE_INSTANT_MS = 2000
export const PACE_QUICK_MS = 3000
export const PACE_STEADY_MS = 4000

export function paceOf(ms: number): Pace {
  if (ms <= PACE_INSTANT_MS) return 'instant'
  if (ms <= PACE_QUICK_MS) return 'quick'
  if (ms <= PACE_STEADY_MS) return 'steady'
  return 'slow'
}

/**
 * How much a single attempt counts as evidence of automaticity (0..1).
 * Wrong answers are zero evidence; correct answers scale by pace. Confidence
 * uses the mean of this over recent attempts, so a fact only answered slowly
 * reads as weak no matter how reliably it's answered.
 */
export function fluencyOf(attempt: { correct: boolean; ms: number }): number {
  if (!attempt.correct) return 0
  switch (paceOf(attempt.ms)) {
    case 'instant':
      return 1
    case 'quick':
      return 0.75
    case 'steady':
      return 0.45
    case 'slow':
      return 0.2
  }
}

/**
 * Map a raw attempt to an FSRS grade. Wrong answers are always `again`.
 * Correct answers grade by absolute pace: only instant recall earns `easy`;
 * quick is `good`; steady/slow — right but computed — earn `hard` so the
 * fact comes back sooner.
 */
export function gradeAttempt(correct: boolean, ms: number): AttemptGrade {
  if (!correct) return 'again'
  const pace = paceOf(ms)
  if (pace === 'instant') return 'easy'
  if (pace === 'quick') return 'good'
  return 'hard'
}

const GRADE_TO_RATING: Record<AttemptGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

/**
 * Apply an FSRS review to a fact, returning a new FactState (immutable).
 * Only the underlying `card` changes here.
 */
export function reviewFact(
  state: FactState,
  grade: AttemptGrade,
  now: Date = new Date(),
): FactState {
  const { card } = scheduler.next(state.card, now, GRADE_TO_RATING[grade])
  return { ...state, card }
}

/**
 * Probability of recall for a card at `now`. Brand-new cards have never been
 * studied, so retrievability is 0.
 */
export function retrievability(card: Card, now: Date = new Date()): number {
  if (card.state === State.New) return 0
  return scheduler.get_retrievability(card, now, false)
}
