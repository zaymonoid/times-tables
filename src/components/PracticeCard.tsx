import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  answerOf,
  paceOf,
  saveStore,
  type Session,
  type SessionItem,
  type Store,
} from '../engine'
import QuestionView from './practice/QuestionView'
import Interstitial from './practice/Interstitial'

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

  // The strategy is revealed after a miss, and also after a very slow correct
  // answer (which was derived, not recalled) — both pause on the hint.
  const hintShown = feedback === 'wrong' || feedback === 'correct-slow'
  const isCorrect = feedback === 'correct' || feedback === 'correct-slow'
  // Which view fills the shared container.
  const phase = hintShown ? 'interstitial' : 'question'

  // Formatted once here so the presentational children stay string-driven.
  const speedText = lastResult
    ? `${(lastResult.ms / 1000).toFixed(1)}s · ${speedLabel(lastResult)}`
    : null

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
        {/* Shared orange a×b banner, above whichever view is active. */}
        <div className="bg-[var(--color-orange-500)] px-6 py-6 text-center">
          <p className="text-5xl font-black tracking-tight text-white drop-shadow-sm sm:text-6xl">
            {a} × {b}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 px-6 py-6">
          {phase === 'question' ? (
            <QuestionView
              a={a}
              b={b}
              isCorrect={feedback === 'correct'}
              input={input}
              onInputChange={setInput}
              inputRef={inputRef}
              answer={correctAnswer}
              speedText={speedText}
            />
          ) : (
            <Interstitial
              variant={feedback === 'wrong' ? 'wrong' : 'slow'}
              factKey={item.key}
              answer={correctAnswer ?? answerOf(item.key)}
              speedText={speedText}
            />
          )}
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
