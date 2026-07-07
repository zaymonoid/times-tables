// Public engine API. UI imports only from this module.
export * from './types'
export * from './facts'
export {
  loadStore,
  saveStore,
  resetStore,
  hasSeenWelcome,
  markWelcomeSeen,
} from './storage'
export {
  confidenceFor,
  allConfidences,
  summarizeConfidences,
  type ConfidenceSummary,
} from './confidence'
export { createSession, practiceOutlook, type PracticeOutlook } from './session'
export { paceOf, type Pace } from './scheduler'
export { hintsFor, type Strategy, type StrategyCard, type Split, type FactHints } from './hints'
