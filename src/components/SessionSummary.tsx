import { answerOf, type SessionSummaryData } from '../engine'

interface SessionSummaryProps {
  summary: SessionSummaryData
  canPracticeAgain: boolean
  onPracticeAgain: () => void
  onBackToOverview: () => void
}

export default function SessionSummary({
  summary,
  canPracticeAgain,
  onPracticeAgain,
  onBackToOverview,
}: SessionSummaryProps) {
  const accuracyPct = Math.round(summary.accuracy * 100)
  const fastPct = Math.round(summary.fastRate * 100)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border-4 border-[var(--color-orange-300)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
        <div className="bg-[var(--color-orange-500)] px-6 py-6 text-center">
          <p className="text-2xl font-black text-white sm:text-3xl">Session complete!</p>
          <p className="mt-1 text-sm font-semibold text-orange-50">
            {accuracyPct}% accuracy · {fastPct}% instant recall
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3 px-6 py-5 text-center">
          <div>
            <p className="text-2xl font-extrabold text-[var(--color-orange-700)]">
              {summary.cardsSeen}
            </p>
            <p className="text-[11px] font-semibold text-[var(--color-ink-soft)]">cards seen</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[var(--color-orange-700)]">
              {summary.uniqueFacts}
            </p>
            <p className="text-[11px] font-semibold text-[var(--color-ink-soft)]">unique facts</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[var(--color-orange-700)]">
              {summary.newFacts.length}
            </p>
            <p className="text-[11px] font-semibold text-[var(--color-ink-soft)]">new facts</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[var(--color-orange-700)]">
              {(summary.avgMs / 1000).toFixed(1)}s
            </p>
            <p className="text-[11px] font-semibold text-[var(--color-ink-soft)]">avg speed</p>
          </div>
        </div>

        {summary.missed.length > 0 && (
          <div className="border-t-2 border-dashed border-[var(--color-orange-200)] px-6 py-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-ink-soft)]">
              Facts to keep practicing
            </p>
            <div className="flex flex-wrap gap-2">
              {summary.missed.map((key) => (
                <span
                  key={key}
                  className="rounded-full bg-[color-mix(in_srgb,var(--color-bucket-weak)_15%,white)] px-3 py-1 text-xs font-bold text-[var(--color-bucket-weak)]"
                >
                  {key.replace('x', ' × ')} = {answerOf(key)}
                </span>
              ))}
            </div>
          </div>
        )}

        {summary.newFacts.length > 0 && (
          <div className="border-t-2 border-dashed border-[var(--color-orange-200)] px-6 py-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-ink-soft)]">
              New facts introduced
            </p>
            <div className="flex flex-wrap gap-2">
              {summary.newFacts.map((key) => (
                <span
                  key={key}
                  className="rounded-full bg-[var(--color-orange-100)] px-3 py-1 text-xs font-bold text-[var(--color-orange-700)]"
                >
                  {key.replace('x', ' × ')} = {answerOf(key)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
        {canPracticeAgain && (
          <button
            type="button"
            onClick={onPracticeAgain}
            className="flex-1 rounded-2xl bg-[var(--color-orange-500)] px-6 py-4 text-lg font-extrabold text-white shadow-[var(--shadow-card)] transition-transform hover:scale-[1.02] hover:bg-[var(--color-orange-600)] active:translate-y-1 active:shadow-none"
          >
            Practice again
          </button>
        )}
        <button
          type="button"
          onClick={onBackToOverview}
          className="flex-1 rounded-2xl border-2 border-[var(--color-orange-300)] bg-[var(--color-card)] px-6 py-4 text-lg font-extrabold text-[var(--color-orange-700)] shadow-[var(--shadow-soft)] hover:bg-[var(--color-orange-50)]"
        >
          Back to overview
        </button>
      </div>
    </div>
  )
}
