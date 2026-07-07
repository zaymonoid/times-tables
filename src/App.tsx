import { useCallback, useState } from 'react'
import {
  createSession,
  hasSeenWelcome,
  loadStore,
  markWelcomeSeen,
  practiceOutlook,
  type Session,
  type SessionSummaryData,
  type Store,
} from './engine'
import Overview from './components/Overview'
import PracticeCard from './components/PracticeCard'
import SessionSummary from './components/SessionSummary'
import WelcomeModal from './components/WelcomeModal'

type Screen = 'overview' | 'practice' | 'summary'

function App() {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [screen, setScreen] = useState<Screen>('overview')
  const [session, setSession] = useState<Session | null>(null)
  const [summary, setSummary] = useState<SessionSummaryData | null>(null)
  const [showWelcome, setShowWelcome] = useState<boolean>(() => !hasSeenWelcome())

  const closeWelcome = useCallback(() => {
    markWelcomeSeen()
    setShowWelcome(false)
  }, [])

  const startPractice = useCallback(() => {
    const s = createSession(store)
    setSession(s)
    setScreen('practice')
  }, [store])

  const finishPractice = useCallback(() => {
    if (session) {
      setSummary(session.summary())
    }
    setSession(null)
    setScreen('summary')
    // Force overview to re-read confidences from the mutated store.
    setStore((prev) => ({ ...prev }))
  }, [session])

  const exitPractice = useCallback(() => {
    setSession(null)
    setScreen('overview')
    setStore((prev) => ({ ...prev }))
  }, [])

  const backToOverview = useCallback(() => {
    setSummary(null)
    setScreen('overview')
  }, [])

  return (
    <div className="paper-texture min-h-screen w-full bg-[var(--color-paper)]">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        {screen === 'overview' && (
          <Overview
            store={store}
            onPractice={startPractice}
            onStoreChange={setStore}
            onShowHelp={() => setShowWelcome(true)}
          />
        )}
        {screen === 'practice' && session && (
          <PracticeCard
            session={session}
            store={store}
            onExit={exitPractice}
            onFinish={finishPractice}
          />
        )}
        {screen === 'summary' && summary && (
          <SessionSummary
            summary={summary}
            canPracticeAgain={practiceOutlook(store).available > 0}
            onPracticeAgain={startPractice}
            onBackToOverview={backToOverview}
          />
        )}
      </div>
      {showWelcome && <WelcomeModal onClose={closeWelcome} />}
    </div>
  )
}

export default App
