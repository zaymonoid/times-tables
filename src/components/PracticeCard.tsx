import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  answerOf,
  hintsFor,
  paceOf,
  saveStore,
  type Session,
  type SessionItem,
  type Store,
} from '../engine'
import StrategyCardsPanel from './strategy/StrategyCardsPanel'

const GRID_SIZE = 12

// Correct answers slower than this were clearly worked out, not recalled — so
// we pause on them (like a miss) to re-show the strategy instead of advancing.
const SLOW_ANSWER_MS = 10_000

interface PracticeCardProps {
  session: Session
  store: Store
  onExit: () => void
  onFinish: () => void
}

type Feedback = 'idle' | 'correct' | 'correct-slow' | 'wrong'

interface LastResult {
  ms: number
  grade: 'again' | 'hard' | 'good' | 'easy'
}

function speedLabel(res: LastResult): string {
  if (res.grade === 'again') return "it'll come back this session"
  switch (paceOf(res.ms)) {
    case 'instant':
      return 'instant ⚡'
    case 'quick':
      return 'quick'
    case 'steady':
      return 'steady — push for instant'
    case 'slow':
      return 'slow — keep drilling'
  }
}

export default function PracticeCard({ session, store, onExit, onFinish }: PracticeCardProps) {
  const [item, setItem] = useState<SessionItem | null>(null)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<Feedback>('idle')
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null)
  const [lastResult, setLastResult] = useState<LastResult | null>(null)
  const [progress, setProgress] = useState(() => session.progress())
  const shownAtRef = useRef(performance.now())
  const startedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function loadNext() {
    const next = session.next()
    setProgress(session.progress())
    if (!next) {
      onFinish()
      return
    }
    setItem(next)
    setInput('')
    setFeedback('idle')
    setCorrectAnswer(null)
    setLastResult(null)
    shownAtRef.current = performance.now()
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    loadNext()
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [item])

  useEffect(
    () => () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    },
    [],
  )

  function doSubmit() {
    if (!item) return

    if (feedback === 'wrong' || feedback === 'correct-slow') {
      loadNext()
      return
    }
    if (feedback === 'correct') return

    const given = Number(input)
    if (input.trim() === '' || Number.isNaN(given)) return

    const ms = performance.now() - shownAtRef.current
    const res = session.answer(item, given, ms)
    saveStore(store)

    setCorrectAnswer(res.correctAnswer)
    setLastResult({ ms, grade: res.grade })
    if (res.correct) {
      // A very slow correct answer pauses on the hint (like a miss) rather than
      // auto-advancing, so the learner re-reads the strategy they had to derive.
      if (ms > SLOW_ANSWER_MS) {
        setFeedback('correct-slow')
      } else {
        setFeedback('correct')
        advanceTimerRef.current = setTimeout(
          () => loadNext(),
          res.grade === 'easy' ? 500 : 900,
        )
      }
    } else {
      setFeedback('wrong')
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    doSubmit()
  }

  // The input unmounts on a wrong (or slow-correct) answer, so catch Enter at
  // the window level to let the keyboard drive "Continue" too.
  useEffect(() => {
    if (feedback !== 'wrong' && feedback !== 'correct-slow') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        loadNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [feedback])

  if (!item) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-lg font-semibold text-[var(--color-ink-soft)]">Loading…</p>
      </div>
    )
  }

  const [a, b] = item.shownAs
  // The prompt orientation is randomized, but the array graphic always shows
  // the canonical larger-first form: more rows than columns.
  const highlightRows = Math.max(a, b)
  const highlightCols = Math.min(a, b)

  // The strategy is revealed after a miss, and also after a very slow correct
  // answer (which was derived, not recalled) — both pause on the hint.
  const hintShown = feedback === 'wrong' || feedback === 'correct-slow'
  const isCorrect = feedback === 'correct' || feedback === 'correct-slow'

  // The card widens to fit the two strategy cards only when the hint is shown;
  // idle ↔ fast-correct never changes width, so typing never reflows.
  const widthClass = hintShown ? 'max-w-2xl' : 'max-w-md'

  const cardBorder = isCorrect
    ? 'border-[var(--color-bucket-automatic)]'
    : feedback === 'wrong'
      ? 'border-[var(--color-miss)]'
      : 'border-[var(--color-orange-300)]'

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className={`flex w-full items-center justify-between transition-all ${widthClass}`}>
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit to overview"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-card)] text-lg font-bold text-[var(--color-ink-soft)] shadow-[var(--shadow-soft)] hover:text-[var(--color-orange-600)]"
        >
          ×
        </button>
        <div className="flex items-center gap-2">
          {item.relearn && (
            <span className="rounded-full bg-[var(--color-bucket-learning)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-bucket-learning-text)]">
              Relearn
            </span>
          )}
          <div className="flex items-center gap-1">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--color-orange-100)]">
              <div
                className="h-full bg-[var(--color-orange-500)] transition-all"
                style={{
                  width: `${Math.min(100, (progress.done / Math.max(1, progress.total)) * 100)}%`,
                }}
              />
            </div>
            <span className="text-xs font-semibold text-[var(--color-ink-soft)]">
              {progress.done}/{progress.total}
            </span>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`w-full overflow-hidden rounded-3xl border-4 bg-[var(--color-card)] shadow-[var(--shadow-card)] transition-all ${widthClass} ${cardBorder} ${
          feedback === 'wrong' ? 'animate-shake' : ''
        }`}
      >
        <div className="bg-[var(--color-orange-500)] px-6 py-6 text-center">
          <p className="text-5xl font-black tracking-tight text-white drop-shadow-sm sm:text-6xl">
            {a} × {b}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 px-6 py-6">
          {/* On a miss / slow-correct the array gives way to the two-strategy
              panel; otherwise we show the plain array for the current fact. */}
          {hintShown ? (
            <StrategyCardsPanel
              hints={hintsFor(item.key)}
              answer={correctAnswer ?? answerOf(item.key)}
            />
          ) : (
            <div
              className="grid aspect-square w-full max-w-[220px] gap-[2px]"
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                const row = Math.floor(i / GRID_SIZE) + 1
                const col = (i % GRID_SIZE) + 1
                const inRect = row <= highlightRows && col <= highlightCols
                const rectClasses = isCorrect
                  ? 'border border-[var(--color-bucket-automatic)] bg-[var(--color-bucket-automatic)]/25'
                  : 'border border-[var(--color-orange-300)] bg-white'
                const cellClasses = inRect ? rectClasses : 'bg-[var(--color-orange-100)]'

                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-[2px] transition-colors duration-300 ${cellClasses}`}
                  />
                )
              })}
            </div>
          )}

          {/* Fixed-height zone: every feedback state renders inside the same
              box so the card never resizes and the page never jumps. */}
          <div className="flex h-[8.5rem] w-full flex-col items-center justify-center gap-3">
          {feedback === 'wrong' && correctAnswer !== null && (
            <p className="animate-pop text-4xl font-black text-[var(--color-miss)]">
              {correctAnswer}
            </p>
          )}
          {isCorrect && (
            <p className="animate-pop text-4xl font-black text-[var(--color-bucket-automatic)]">
              ✓ {correctAnswer ?? ''}
            </p>
          )}
          {feedback !== 'idle' && lastResult && (
            <p className="text-xs font-bold text-[var(--color-ink-soft)]">
              {(lastResult.ms / 1000).toFixed(1)}s · {speedLabel(lastResult)}
            </p>
          )}

          {feedback === 'idle' && (
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-32 rounded-2xl border-2 border-[var(--color-orange-300)] bg-white px-4 py-3 text-center text-3xl font-extrabold text-[var(--color-ink)] outline-none focus:border-[var(--color-orange-500)]"
              placeholder="?"
            />
          )}

          {feedback === 'idle' && (
            <button
              type="submit"
              className="w-full max-w-[200px] rounded-2xl bg-[var(--color-orange-500)] px-6 py-3 text-base font-extrabold text-white shadow-[var(--shadow-soft)] hover:bg-[var(--color-orange-600)]"
            >
              Check
            </button>
          )}
          {hintShown && (
            <button
              type="submit"
              className="w-full max-w-[200px] rounded-2xl bg-[var(--color-orange-500)] px-6 py-3 text-base font-extrabold text-white shadow-[var(--shadow-soft)] hover:bg-[var(--color-orange-600)]"
            >
              Continue
            </button>
          )}
          </div>
        </div>

        {/* Fixed two-line height so the card never resizes between states. */}
        <div className="flex h-[4.75rem] flex-col items-center justify-center gap-1 bg-[var(--color-orange-100)] px-6 py-2 text-center">
          <p className="text-xs font-semibold text-[var(--color-orange-800)] sm:text-sm">
            {hintShown
              ? 'Read both roads, then Continue'
              : feedback === 'idle'
                ? 'Speed counts — answer as fast as you can ⚡'
                : ' '}
          </p>
        </div>
      </form>

      <button
        type="button"
        onClick={onFinish}
        className="text-sm font-bold text-[var(--color-ink-soft)] underline decoration-2 underline-offset-4 hover:text-[var(--color-ink)]"
      >
        Finished for now
      </button>
    </div>
  )
}
