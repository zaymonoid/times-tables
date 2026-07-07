import { Fragment, useMemo, useState } from 'react'
import {
  MAX_FACTOR,
  MIN_FACTOR,
  allConfidences,
  answerOf,
  keyFor,
  loadStore,
  practiceOutlook,
  resetStore,
  summarizeConfidences,
  type ConfidenceBucket,
  type Store,
} from '../engine'

const BUCKET_CLASS: Record<ConfidenceBucket, string> = {
  untrained:
    'border-2 border-dashed border-[var(--color-bucket-untrained-text)] bg-[var(--color-bucket-untrained)] text-[var(--color-bucket-untrained-text)]',
  building: 'bg-[var(--color-bucket-building)] text-[var(--color-bucket-building-text)]',
  learning: 'bg-[var(--color-bucket-learning)] text-[var(--color-bucket-learning-text)]',
  solid: 'bg-[var(--color-bucket-solid)] text-[var(--color-bucket-solid-text)]',
  automatic: 'bg-[var(--color-bucket-automatic)] text-[var(--color-bucket-automatic-text)]',
}

const BUCKET_LABEL: Record<ConfidenceBucket, string> = {
  untrained: 'Untrained',
  building: 'Building',
  learning: 'Learning',
  solid: 'Solid',
  automatic: 'Automatic',
}

const FACTORS: number[] = []
for (let n = MIN_FACTOR; n <= MAX_FACTOR; n++) FACTORS.push(n)

function formatNext(at: Date): string {
  const mins = Math.ceil((at.getTime() - Date.now()) / 60000)
  if (mins <= 1) return 'any moment now'
  if (mins < 60) return `in about ${mins} minutes`
  const hours = Math.round(mins / 60)
  if (hours < 24) {
    const tomorrow = at.getDate() !== new Date().getDate()
    return tomorrow ? 'tomorrow' : `in about ${hours} hour${hours === 1 ? '' : 's'}`
  }
  const days = Math.round(hours / 24)
  return days <= 1 ? 'tomorrow' : `in ${days} days`
}

function formatWhen(ts: number | undefined): string {
  if (!ts) return 'Never practiced'
  const diffMs = Date.now() - ts
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

interface OverviewProps {
  store: Store
  onPractice: () => void
  onStoreChange: (store: Store) => void
  onShowHelp: () => void
}

export default function Overview({ store, onPractice, onStoreChange, onShowHelp }: OverviewProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const confidences = useMemo(() => allConfidences(store), [store])
  const outlook = useMemo(() => practiceOutlook(store), [store])

  const stats = useMemo(
    () => ({
      ...summarizeConfidences(confidences),
      totalAttempts: store.stats.totalAttempts,
    }),
    [confidences, store],
  )

  const selectedFact = selected ? store.facts[selected] : undefined
  const selectedConfidence = selected ? confidences[selected] : undefined

  function handleReset() {
    if (!confirmingReset) {
      setConfirmingReset(true)
      return
    }
    resetStore()
    onStoreChange(loadStore())
    setConfirmingReset(false)
    setSelected(null)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="relative rounded-3xl bg-[var(--color-orange-500)] px-6 py-5 text-center shadow-[var(--shadow-soft)]">
        <button
          type="button"
          onClick={onShowHelp}
          aria-label="How to get the most out of TimesTables"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg font-black text-white transition-colors hover:bg-white/30"
        >
          ?
        </button>
        <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-sm sm:text-4xl">
          🧮 Times Tables
        </h1>
        <p className="mt-1 text-sm font-medium text-orange-50">
          Flashcard practice, 3 × 3 through 12 × 12
        </p>
      </header>

      <section className="rounded-3xl border-2 border-[var(--color-orange-200)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-extrabold text-[var(--color-orange-700)]">
              {stats.pct}%
            </p>
            <p className="text-xs font-semibold text-[var(--color-ink-soft)]">
              {stats.solidPlus} / {stats.total} facts solid or better
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-[var(--color-orange-700)]">
              {stats.totalAttempts}
            </p>
            <p className="text-xs font-semibold text-[var(--color-ink-soft)]">
              total attempts
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div
            className="mx-auto grid w-full max-w-xl gap-1"
            style={{
              gridTemplateColumns: `2rem repeat(${FACTORS.length}, minmax(0, 1fr))`,
            }}
          >
            <div />
            {FACTORS.map((c) => (
              <div
                key={`h-${c}`}
                className="flex items-center justify-center text-[10px] font-bold text-[var(--color-orange-700)] sm:text-xs"
              >
                {c}
              </div>
            ))}
            {FACTORS.map((row) => (
              <Fragment key={`row-${row}`}>
                <div className="flex items-center justify-center text-[10px] font-bold text-[var(--color-orange-700)] sm:text-xs">
                  {row}
                </div>
                {FACTORS.map((col) => {
                  const key = keyFor(row, col)
                  const bucket = confidences[key]?.bucket ?? 'untrained'
                  const isSelected = selected === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(key)}
                      title={`${row} × ${col} = ${row * col}`}
                      className={`aspect-square rounded-md text-[9px] font-bold transition-transform hover:scale-110 hover:ring-2 hover:ring-[var(--color-orange-500)] sm:text-[11px] ${BUCKET_CLASS[bucket]} ${
                        isSelected ? 'ring-2 ring-[var(--color-ink)]' : ''
                      }`}
                    >
                      {row * col}
                    </button>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {(Object.keys(BUCKET_LABEL) as ConfidenceBucket[]).map((bucket) => (
            <div key={bucket} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ink-soft)]">
              <span className={`inline-block h-3 w-3 rounded-sm ${BUCKET_CLASS[bucket]}`} />
              {BUCKET_LABEL[bucket]}
            </div>
          ))}
        </div>

        {selected && selectedConfidence && (
          <div className="animate-pop mt-4 rounded-2xl border-2 border-[var(--color-orange-200)] bg-[var(--color-orange-50)] p-4">
            <div className="flex items-center justify-between">
              <p className="text-lg font-extrabold text-[var(--color-orange-800)]">
                {selected.replace('x', ' × ')} = {answerOf(selected)}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${BUCKET_CLASS[selectedConfidence.bucket]}`}
              >
                {BUCKET_LABEL[selectedConfidence.bucket]}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-[var(--color-ink-soft)]">
              Score {Math.round(selectedConfidence.score * 100)}% ·{' '}
              {formatWhen(selectedFact?.recent.at(-1)?.ts)}
            </p>
            {selectedFact && selectedFact.recent.length > 0 && (
              <div className="mt-2 flex gap-1">
                {selectedFact.recent.map((attempt, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-2.5 rounded-full ${
                      attempt.correct ? 'bg-[var(--color-bucket-automatic)]' : 'bg-[var(--color-miss)]'
                    }`}
                    title={attempt.correct ? 'Correct' : 'Missed'}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="mt-auto flex flex-col items-center gap-3 pb-2">
        {outlook.available > 0 ? (
          <button
            type="button"
            onClick={onPractice}
            className="w-full max-w-xs rounded-2xl bg-[var(--color-orange-500)] px-8 py-4 text-xl font-extrabold text-white shadow-[var(--shadow-card)] transition-transform hover:scale-[1.02] hover:bg-[var(--color-orange-600)] active:translate-y-1 active:shadow-none"
          >
            Practice
          </button>
        ) : (
          <div className="w-full max-w-xs rounded-2xl border-2 border-dashed border-[var(--color-orange-300)] bg-[var(--color-orange-50)] px-8 py-4 text-center">
            <p className="text-lg font-extrabold text-[var(--color-orange-700)]">
              🎉 All caught up!
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--color-ink-soft)]">
              {outlook.nextAt
                ? `More practice ${formatNext(outlook.nextAt)}`
                : 'Nothing scheduled yet'}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={handleReset}
          onBlur={() => setConfirmingReset(false)}
          className="text-xs font-semibold text-[var(--color-ink-soft)] underline decoration-dotted hover:text-[var(--color-orange-600)]"
        >
          {confirmingReset ? 'Really reset all progress? Click again to confirm' : 'Reset progress'}
        </button>
      </div>
    </div>
  )
}
