import type { RefObject } from 'react'

const GRID_SIZE = 12

interface QuestionViewProps {
  a: number
  b: number
  /** True during the brief fast-correct flash (green array + ✓); false while idle. */
  isCorrect: boolean
  input: string
  onInputChange: (value: string) => void
  inputRef: RefObject<HTMLInputElement | null>
  /** The revealed answer, shown only during the fast-correct flash. */
  answer: number | null
  /** Pre-formatted speed line (seconds · pace); null while idle. */
  speedText: string | null
}

/**
 * The answering view: the 12×12 array (orange when idle, green on a fast
 * correct) plus the input + Check, and the brief fast-correct flash that the
 * parent auto-advances from. Owns its own fixed-height inner zone so idle ↔
 * fast-correct never reflows — typing never nudges the card.
 */
export default function QuestionView({
  a,
  b,
  isCorrect,
  input,
  onInputChange,
  inputRef,
  answer,
  speedText,
}: QuestionViewProps) {
  // The prompt orientation is randomized, but the array graphic always shows
  // the canonical larger-first form: more rows than columns.
  const highlightRows = Math.max(a, b)
  const highlightCols = Math.min(a, b)

  return (
    <div className="flex w-full flex-col items-center gap-4">
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

      {/* Fixed-height zone: idle (input + Check) and fast-correct (✓ + speed)
          render inside the same box so the card never resizes and never jumps. */}
      <div className="flex h-[8.5rem] w-full flex-col items-center justify-center gap-3">
        {isCorrect ? (
          <>
            <p className="animate-pop text-4xl font-black text-[var(--color-bucket-automatic)]">
              ✓ {answer ?? ''}
            </p>
            {speedText && (
              <p className="text-xs font-bold text-[var(--color-ink-soft)]">{speedText}</p>
            )}
          </>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoFocus
              value={input}
              onChange={(e) => onInputChange(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-32 rounded-2xl border-2 border-[var(--color-orange-300)] bg-white px-4 py-3 text-center text-3xl font-extrabold text-[var(--color-ink)] outline-none focus:border-[var(--color-orange-500)]"
              placeholder="?"
            />
            <button
              type="submit"
              className="w-full max-w-[200px] rounded-2xl bg-[var(--color-orange-500)] px-6 py-3 text-base font-extrabold text-white shadow-[var(--shadow-soft)] hover:bg-[var(--color-orange-600)]"
            >
              Check
            </button>
          </>
        )}
      </div>
    </div>
  )
}
