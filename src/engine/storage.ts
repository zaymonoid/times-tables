import type { Card } from 'ts-fsrs'
import type { FactState, Store } from './types'
import { ALL_FACT_KEYS } from './facts'
import { newCard } from './scheduler'

const STORAGE_KEY = 'ttt.v1'
const WELCOME_KEY = 'ttt.welcomed'

function getStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

function freshFactState(key: string, now: Date): FactState {
  return {
    key,
    card: newCard(now),
    introduced: false,
    recent: [],
  }
}

/** A brand-new store with every fact seeded but unintroduced. */
export function freshStore(now: Date = new Date()): Store {
  const facts: Store['facts'] = {}
  for (const key of ALL_FACT_KEYS) {
    facts[key] = freshFactState(key, now)
  }
  return {
    version: 1,
    facts,
    settings: { newPerSession: 6 },
    stats: { sessions: 0, totalAttempts: 0, typicalMs: 0 },
  }
}

/** Revive Card date fields (serialized as ISO strings) back into Dates. */
function reviveCard(raw: unknown, now: Date): Card {
  const base = newCard(now)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  const card = { ...base, ...r } as Card
  if (typeof r.due === 'string') card.due = new Date(r.due)
  if (typeof r.last_review === 'string') {
    card.last_review = new Date(r.last_review)
  } else if (r.last_review == null) {
    delete card.last_review
  }
  return card
}

function reviveFact(key: string, raw: unknown, now: Date): FactState {
  if (!raw || typeof raw !== 'object') return freshFactState(key, now)
  const r = raw as Record<string, unknown>
  return {
    key,
    card: reviveCard(r.card, now),
    introduced: r.introduced === true,
    recent: Array.isArray(r.recent) ? (r.recent as FactState['recent']) : [],
  }
}

/**
 * Load the store from localStorage, reviving Dates, backfilling any missing
 * facts, and validating the version. Missing/corrupt data yields a fresh store.
 */
export function loadStore(now: Date = new Date()): Store {
  const storage = getStorage()
  const raw = storage?.getItem(STORAGE_KEY)
  if (!raw) return freshStore(now)

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return freshStore(now)
  }

  if (!parsed || typeof parsed !== 'object') return freshStore(now)
  const p = parsed as Record<string, unknown>
  if (p.version !== 1) return freshStore(now)

  const rawFacts = (p.facts ?? {}) as Record<string, unknown>
  const facts: Store['facts'] = {}
  for (const key of ALL_FACT_KEYS) {
    facts[key] = reviveFact(key, rawFacts[key], now)
  }

  const settings = (p.settings ?? {}) as Record<string, unknown>
  const stats = (p.stats ?? {}) as Record<string, unknown>

  return {
    version: 1,
    facts,
    settings: {
      newPerSession:
        typeof settings.newPerSession === 'number'
          ? settings.newPerSession
          : 6,
    },
    stats: {
      sessions: typeof stats.sessions === 'number' ? stats.sessions : 0,
      totalAttempts:
        typeof stats.totalAttempts === 'number' ? stats.totalAttempts : 0,
      typicalMs: typeof stats.typicalMs === 'number' ? stats.typicalMs : 0,
    },
  }
}

/** Persist the store. Dates serialize to ISO strings automatically. */
export function saveStore(store: Store): void {
  const storage = getStorage()
  storage?.setItem(STORAGE_KEY, JSON.stringify(store))
}

/** Clear persisted state and return a fresh store. */
export function resetStore(now: Date = new Date()): Store {
  const storage = getStorage()
  storage?.removeItem(STORAGE_KEY)
  return freshStore(now)
}

/**
 * Whether the welcome/help card has been dismissed before. Stored under a
 * separate key from the versioned Store so a progress reset doesn't replay
 * onboarding.
 */
export function hasSeenWelcome(): boolean {
  return getStorage()?.getItem(WELCOME_KEY) === '1'
}

/** Remember that the welcome/help card has been dismissed. */
export function markWelcomeSeen(): void {
  getStorage()?.setItem(WELCOME_KEY, '1')
}
