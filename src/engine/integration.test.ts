import { describe, it, expect, beforeEach } from 'vitest'
import { createSession } from './session'
import { loadStore, saveStore } from './storage'
import { answerOf } from './facts'
import type { SessionItem } from './types'

/**
 * Integration tests for the App ↔ engine ↔ storage seam that the UI relies on
 * but which no single engine unit test exercises end-to-end: a full session is
 * driven the way PracticeCard drives it (persist after every answer), then the
 * store is reloaded the way App does on refresh.
 */

class LocalStorageStub {
  private map = new Map<string, string>()
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null
  }
  setItem(k: string, v: string) {
    this.map.set(k, v)
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
  clear() {
    this.map.clear()
  }
}

const NOW = new Date('2026-01-01T00:00:00Z')

beforeEach(() => {
  ;(globalThis as unknown as { localStorage: Storage }).localStorage =
    new LocalStorageStub() as unknown as Storage
})

describe('full session flow with per-answer persistence', () => {
  it('brand-new user: learning continues past the first chunk; early finish persists and revives on reload', () => {
    // App boot: fresh store from empty localStorage.
    const store = loadStore(NOW)
    const session = createSession(store, NOW)

    // progress() total counts the on-screen (in-flight) card, so the first
    // chunk of 6 reads "0/6" on the first card, never undercounting by one.
    let item: SessionItem | null = session.next()
    expect(session.progress()).toEqual({ done: 0, total: 6 })

    // Answer the first chunk of 6 the way PracticeCard does (persist each).
    for (let i = 0; i < 6; i++) {
      session.answer(item!, answerOf(item!.key), 1100, NOW)
      saveStore(store)
      item = session.next()
    }

    // The session did not end at the chunk boundary — a fresh chunk of new
    // facts flowed in, and the learner ends via "finished for now" instead.
    expect(item).not.toBeNull()
    expect(session.progress().total).toBeGreaterThan(6)

    // Reload path (App refresh after finishing early): dates revived, the 6
    // answered facts persisted as introduced.
    const reloaded = loadStore(NOW)
    const introduced = Object.values(reloaded.facts).filter((f) => f.introduced)
    expect(introduced).toHaveLength(6)
    for (const f of introduced) {
      expect(f.card.due).toBeInstanceOf(Date)
      expect(f.recent.length).toBeGreaterThan(0)
    }
    expect(reloaded.stats.totalAttempts).toBe(6)
    expect(reloaded.stats.sessions).toBe(1)
  })

  it('returning user with nothing due still gets a worthwhile top-up session', () => {
    // First session for a new user: answer the first chunk of 6, then stop
    // ("finished for now"), persisted throughout.
    const store = loadStore(NOW)
    const s1 = createSession(store, NOW)
    for (let i = 0; i < 6; i++) {
      const it = s1.next()!
      s1.answer(it, answerOf(it.key), 1500, NOW)
      saveStore(store)
    }

    // Immediately start again on the same day: freshly-reviewed facts are not
    // due, and new facts flow in — still worthwhile.
    const reloaded = loadStore(NOW)
    const s2 = createSession(reloaded, NOW)
    let count = 0
    for (let i = 0; i < 8 && s2.next() !== null; i++) count++
    expect(count).toBeGreaterThanOrEqual(8)
  })

  it('mid-relearn drain: a missed fact keeps reappearing until cleared, then session ends cleanly', () => {
    const store = loadStore(NOW)
    const session = createSession(store, NOW)

    const first = session.next()!
    // Miss it, then answer everything (including relearn repeats) correctly.
    session.answer(first, answerOf(first.key) + 1, 1500, NOW)
    saveStore(store)

    let relearnServed = 0
    let cur: SessionItem | null
    while ((cur = session.next()) !== null) {
      if (cur.key === first.key && cur.relearn) relearnServed++
      session.answer(cur, answerOf(cur.key), 1500, NOW)
      saveStore(store)
    }
    // The miss must be re-served twice before the session can drain to null.
    expect(relearnServed).toBe(2)

    const summary = session.summary()
    expect(summary.missed).toContain(first.key)
    expect(session.next()).toBeNull() // stays drained
  })
})
