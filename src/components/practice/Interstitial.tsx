import { hintsFor, type FactKey } from '../../engine'
import StrategyCardsPanel from '../strategy/StrategyCardsPanel'

interface InterstitialProps {
  /** 'wrong' → missed the fact; 'slow' → right answer but derived, not recalled. */
  variant: 'wrong' | 'slow'
  factKey: FactKey
  answer: number
  /** Pre-formatted speed line (seconds · pace); null if unavailable. */
  speedText: string | null
}

/**
 * The feedback view shown after a miss or a slow-correct answer: the verdict up
 * top so the learner reads *why* they paused, then the two-strategy panel, then
 * a small speed line and Continue. Wrong vs slow read differently on purpose.
 */
export default function Interstitial({ variant, factKey, answer, speedText }: InterstitialProps) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      {/* Verdict at the top — the first thing read, distinguishing miss vs slow. */}
      {variant === 'wrong' ? (
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-bold text-[var(--color-miss)]">That&rsquo;s not quite right</p>
          <p className="animate-pop text-4xl font-black text-[var(--color-miss)]">{answer}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-bold text-[var(--color-ink-soft)]">
            Right answer — but slow. Try one of these strategies next time
          </p>
          <p className="animate-pop text-4xl font-black text-[var(--color-bucket-automatic)]">
            ✓ {answer}
          </p>
        </div>
      )}

      <StrategyCardsPanel hints={hintsFor(factKey)} />

      <div className="flex w-full flex-col items-center gap-3">
        {speedText && (
          <p className="text-xs font-bold text-[var(--color-ink-soft)]">{speedText}</p>
        )}
        <button
          type="submit"
          className="w-full max-w-[200px] rounded-2xl bg-[var(--color-orange-500)] px-6 py-3 text-base font-extrabold text-white shadow-[var(--shadow-soft)] hover:bg-[var(--color-orange-600)]"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
