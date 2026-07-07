import type { FactHints } from '../../engine'
import StrategyCardView from './StrategyCardView'

interface StrategyCardsPanelProps {
  hints: FactHints
}

/**
 * The "Solve it two ways" panel: the two strategy cards side by side. The fact
 * and its answer are shown above (the practice card banner and the interstitial
 * verdict), so the panel no longer restates the answer itself.
 */
export default function StrategyCardsPanel({ hints }: StrategyCardsPanelProps) {
  const strategies = [hints.primary, hints.alt].filter(Boolean)
  const bothWays = strategies.length > 1

  return (
    <div className="strategy-panel animate-pop flex w-full flex-col gap-3 rounded-2xl bg-[var(--color-panel)] p-3 sm:p-4">
      <div className={`grid gap-3 ${bothWays ? 'strategy-two-cols' : ''}`}>
        {strategies.map((s, i) => (
          <StrategyCardView key={i} strategy={s!} />
        ))}
      </div>
    </div>
  )
}
