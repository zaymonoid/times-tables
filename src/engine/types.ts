import type { Card } from 'ts-fsrs'

/** Canonical fact key: "AxB" with A <= B, both in 3..12. e.g. "6x7" */
export type FactKey = string

export const MIN_FACTOR = 3
export const MAX_FACTOR = 12

/** One answered card. */
export interface Attempt {
  ts: number
  /** The orientation the fact was shown in, e.g. [7, 6] for fact "6x7". */
  shownAs: [number, number]
  correct: boolean
  /** Response time in milliseconds. */
  ms: number
}

export interface FactState {
  key: FactKey
  /** ts-fsrs Card. Dates are serialized as ISO strings in localStorage. */
  card: Card
  /** Has this fact ever been shown to the user? */
  introduced: boolean
  /** Most recent attempts, capped at 10 (newest last). */
  recent: Attempt[]
}

export interface Store {
  version: 1
  facts: Record<FactKey, FactState>
  settings: { newPerSession: number }
  stats: { sessions: number; totalAttempts: number; medianMs: number }
}

export type ConfidenceBucket =
  | 'untrained'
  | 'building'
  | 'learning'
  | 'solid'
  | 'automatic'

export interface FactConfidence {
  key: FactKey
  /** 0..1 blended retrievability × recent accuracy; 0 when untrained. */
  score: number
  bucket: ConfidenceBucket
}

/** A single card to show during practice. */
export interface SessionItem {
  key: FactKey
  /** Randomized orientation to display. */
  shownAs: [number, number]
  /** True if this is an in-session relearn repeat of a missed fact. */
  relearn: boolean
}

/** Result of answering a session item. */
export interface AnswerResult {
  correct: boolean
  correctAnswer: number
  /** Grade implied by correctness + response time. */
  grade: 'again' | 'hard' | 'good' | 'easy'
}

export interface SessionSummaryData {
  cardsSeen: number
  uniqueFacts: number
  correct: number
  accuracy: number
  /**
   * Forward-weighted mean response time in ms: recent answers count more
   * (geometric decay per step back), so it reflects end-of-session pace.
   */
  avgMs: number
  /** Answers fast enough to count as instant recall (graded easy). */
  fastCount: number
  /** fastCount / cardsSeen (0 when nothing was seen). */
  fastRate: number
  /** Facts newly introduced this session. */
  newFacts: FactKey[]
  /** Facts missed at least once this session, weakest first. */
  missed: FactKey[]
}

/**
 * A practice session. Mutates the underlying Store (persisted by caller/
 * storage layer). Implementations live in src/engine/session.ts.
 */
export interface Session {
  /**
   * Next card to show. When the queue drains, new facts flow in continuously
   * (in chunks of settings.newPerSession) — null only when nothing is left to
   * learn or relearn. The learner ends open-ended sessions via the UI.
   */
  next(): SessionItem | null
  /** Submit the user's answer for the item returned by next(). */
  answer(item: SessionItem, given: number, ms: number, now?: Date): AnswerResult
  /** Progress: cards answered / estimated total (grows on misses/refills). */
  progress(): { done: number; total: number }
  summary(): SessionSummaryData
}
