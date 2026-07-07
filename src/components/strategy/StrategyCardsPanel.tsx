import type { FactHints } from '../../engine'
import StrategyCardView from './StrategyCardView'

interface StrategyCardsPanelProps {
  hints: FactHints
  answer: number
}

/**
 * The "Solve it two ways" panel: the two strategy cards side by side and a
 * footer confirming both routes reach the same answer. The fact itself is
 * already shown in the practice card's banner above.
 */
export default function StrategyCardsPanel({ hints, answer }: StrategyCardsPanelProps) {
  const strategies = [hints.primary, hints.alt].filter(Boolean)
  const bothWays = strategies.length > 1

  return (
    <div className="strategy-panel animate-pop flex w-full flex-col gap-3 rounded-2xl bg-[var(--color-panel)] p-3 sm:p-4">
      <div className={`grid gap-3 ${bothWays ? 'strategy-two-cols' : ''}`}>
        {strategies.map((s, i) => (
          <StrategyCardView key={i} strategy={s!} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-leaf-200)] bg-[var(--color-leaf-50)] py-2.5">
        <span className="font-semibold text-[var(--color-leaf-700)]" aria-hidden>
          ✓
        </span>
        <span className="text-sm font-semibold text-[var(--color-ink)]">
          {bothWays ? 'Both roads lead to' : 'The answer is'}
        </span>
        <span className="text-xl font-black text-[var(--color-ink)]">{answer}</span>
      </div>
    </div>
  )
}
