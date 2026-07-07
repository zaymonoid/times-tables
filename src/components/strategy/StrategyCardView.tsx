import type { Strategy } from '../../engine'
import { specForCard, type CardFamily } from './cardSpec'
import StrategyDiagram, { OddNumbers } from './StrategyDiagram'

/** Card surface / border classes per family. */
const SURFACE: Record<CardFamily, string> = {
  plum: 'bg-[var(--color-plum-50)] border-[var(--color-plum-200)]',
  leaf: 'bg-[var(--color-leaf-50)] border-[var(--color-leaf-200)]',
}
const BADGE: Record<CardFamily, string> = {
  plum: 'bg-[var(--color-plum-100)] text-[var(--color-plum-700)]',
  leaf: 'bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]',
}
const STEP_PILL: Record<'amber' | 'rose', string> = {
  amber: 'bg-[var(--color-orange-100)] text-[var(--color-orange-800)]',
  rose: 'bg-[var(--color-rose-100)] text-[var(--color-rose-700)]',
}

export default function StrategyCardView({ strategy }: { strategy: Strategy }) {
  const spec = specForCard(strategy.card, strategy.text)
  const { family } = spec.badge

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border-2 p-4 text-center ${SURFACE[family]}`}
    >
      <div className="flex justify-center">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${BADGE[family]}`}
        >
          {spec.badge.label}
        </span>
      </div>

      {spec.steps ? (
        // Round-and-fix: a labelled pretend → fix → answer walkthrough. The
        // number-bond tree makes no sense for subtraction, so we spell it out.
        <div className="flex flex-col gap-3 px-1 text-left">
          {spec.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span
                className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${STEP_PILL[step.tone]}`}
              >
                {step.label}
              </span>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[var(--color-ink)]">{step.main}</span>
                {step.sub && (
                  <span className="text-xs font-medium text-[var(--color-ink-soft)]">
                    {step.sub}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="h-px w-full bg-[var(--color-paper-dark)]" />
          <div className="flex items-center gap-3">
            <span className="shrink-0 rounded-full bg-[var(--color-leaf-100)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-leaf-700)]">
              answer
            </span>
            <span className="text-2xl font-black text-[var(--color-ink)]">
              {spec.final?.answer}
            </span>
          </div>
        </div>
      ) : (
        <>
          {spec.diagram.type !== 'none' && (
            <div className="flex min-h-[104px] items-center justify-center">
              <StrategyDiagram diagram={spec.diagram} family={family} />
            </div>
          )}

          {spec.text && (
            <p className="px-2 text-sm font-semibold text-[var(--color-ink)]">{spec.text}</p>
          )}

          {spec.lines.length > 0 && (
            <div className="flex flex-col gap-1">
              {spec.lines.map((line, i) => (
                <p key={i} className="text-sm font-semibold text-[var(--color-ink)]">
                  {line}
                </p>
              ))}
            </div>
          )}

          {spec.final && (
            <>
              <div className="mx-auto h-px w-4/5 bg-[var(--color-paper-dark)]" />
              <p className="text-base font-semibold text-[var(--color-ink)]">
                {spec.final.lhs}{' '}
                <span className="text-lg font-black">{spec.final.answer}</span>
              </p>
            </>
          )}

          {spec.footnote?.type === 'odd-numbers' && (
            <div className="mt-1 rounded-xl bg-[var(--color-leaf-100)]/60 px-2 py-2">
              <OddNumbers n={spec.footnote.n} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
