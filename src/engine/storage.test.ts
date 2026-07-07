import { describe, it, expect, beforeEach } from 'vitest'
import { loadStore, saveStore, resetStore, freshStore } from './storage'
import { ALL_FACT_KEYS } from './facts'
import { reviewFact } from './scheduler'

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
  raw() {
    return this.map
  }
}

let stub: LocalStorageStub

beforeEach(() => {
  stub = new LocalStorageStub()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage =
    stub as unknown as Storage
})

describe('storage', () => {
  it('fresh store has all 55 facts, defaults, and zeroed stats', () => {
    const s = freshStore()
    expect(Object.keys(s.facts)).toHaveLength(55)
    expect(s.settings.newPerSession).toBe(6)
    expect(s.stats).toEqual({ sessions: 0, totalAttempts: 0, typicalMs: 0 })
    for (const k of ALL_FACT_KEYS) expect(s.facts[k].introduced).toBe(false)
  })

  it('round-trips and revives Card dates as Date objects', () => {
    const s = freshStore(new Date('2026-01-01'))
    s.facts['6x7'] = reviewFact(s.facts['6x7'], 'good', new Date('2026-01-01'))
    s.facts['6x7'].introduced = true
    saveStore(s)

    // Stored value is a JSON string with ISO dates.
    const rawJson = stub.getItem('ttt.v1')!
    expect(typeof rawJson).toBe('string')

    const loaded = loadStore()
    expect(loaded.facts['6x7'].card.due).toBeInstanceOf(Date)
    expect(loaded.facts['6x7'].card.last_review).toBeInstanceOf(Date)
    expect(loaded.facts['6x7'].introduced).toBe(true)
    expect(loaded.facts['6x7'].card.due.getTime()).toBe(
      s.facts['6x7'].card.due.getTime(),
    )
  })

  it('corrupt JSON yields a fresh store', () => {
    stub.setItem('ttt.v1', '{not valid json')
    const loaded = loadStore()
    expect(Object.keys(loaded.facts)).toHaveLength(55)
    expect(loaded.stats.totalAttempts).toBe(0)
  })

  it('wrong version yields a fresh store', () => {
    stub.setItem('ttt.v1', JSON.stringify({ version: 99, facts: {} }))
    expect(Object.keys(loadStore().facts)).toHaveLength(55)
  })

  it('backfills missing facts', () => {
    const s = freshStore()
    // Persist a store missing most facts.
    const partial = { ...s, facts: { '6x7': s.facts['6x7'] } }
    stub.setItem('ttt.v1', JSON.stringify(partial))
    const loaded = loadStore()
    expect(Object.keys(loaded.facts)).toHaveLength(55)
    expect(loaded.facts['3x3']).toBeDefined()
    expect(loaded.facts['3x3'].introduced).toBe(false)
  })

  it('resetStore clears persisted data', () => {
    saveStore(freshStore())
    expect(stub.getItem('ttt.v1')).not.toBeNull()
    const s = resetStore()
    expect(stub.getItem('ttt.v1')).toBeNull()
    expect(Object.keys(s.facts)).toHaveLength(55)
  })
})
