import { useEffect, useRef, type ReactNode } from 'react'

interface WelcomeModalProps {
  onClose: () => void
}

interface Tip {
  title: string
  body: string
  tileBg: string
  tileBorder: string
  icon: ReactNode
}

/** Shared SVG shell — 24×24, rounded strokes, colour set per-icon. */
function Icon({ color, children }: { color: string; children: ReactNode }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

const TIPS: Tip[] = [
  {
    title: "If the answer doesn't pop up, use a suggested strategy",
    body: "Break it apart, double it, round and fix. Every time you work a fact out, you're not just learning that fact — you're learning how numbers work. That skill goes way beyond times tables.",
    tileBg: '#e6f6ea',
    tileBorder: '#8ecaa0',
    icon: (
      <Icon color="#1f7d47">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
      </Icon>
    ),
  },
  {
    title: 'No counting, no guessing',
    body: "Counting up (even by 3s or 4s) got you started, but it teaches your brain nothing new — and guessing teaches it even less. If you catch yourself counting, stop and pick a strategy instead. That's the level-up move.",
    tileBg: '#fdecec',
    tileBorder: '#e58a8a',
    icon: (
      <Icon color="#c0392b">
        <circle cx={12} cy={12} r={9} />
        <path d="M5.6 5.6l12.8 12.8" />
      </Icon>
    ),
  },
  {
    title: "Don't rush",
    body: 'Let speed arise as a side effect of building your understanding. Relax and think each problem through; the more you do, the more your mind starts handling it for you.',
    tileBg: '#fdeecb',
    tileBorder: '#eab54a',
    icon: (
      <Icon color="#b56b0d">
        <path d="M12 15a3 3 0 1 0 0-6" />
        <path d="M12 15l4-4" />
        <path d="M4 18a9 9 0 1 1 16 0" />
      </Icon>
    ),
  },
  {
    title: "Don't worry about what to study",
    body: 'The system learns what you know, working your weakest facts the hardest, so your practice always goes where it counts most.',
    tileBg: '#e3f1f5',
    tileBorder: '#7fb8c9',
    icon: (
      <Icon color="#1e6b82">
        <circle cx={12} cy={12} r={9} />
        <circle cx={12} cy={12} r={5} />
        <circle cx={12} cy={12} r={1} />
      </Icon>
    ),
  },
  {
    title: "Then one day, you'll just know it",
    body: 'Work a strategy enough times and your brain shortcuts it — the answer starts showing up on its own. The strategy fades into the background, but the number sense it built stays with you forever.',
    tileBg: '#eee9fb',
    tileBorder: '#a99adf',
    icon: (
      <Icon color="#6b4ab0">
        <path d="M12 3l1.8 4.9L18.7 9.7 13.8 11.5 12 16.4 10.2 11.5 5.3 9.7 10.2 7.9z" />
        <path d="M18 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
      </Icon>
    ),
  },
]

export default function WelcomeModal({ onClose }: WelcomeModalProps) {
  const ctaRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // preventScroll: focusing must not scroll the overflowing tips list to the
    // CTA at the bottom — the card should open showing its header first.
    ctaRef.current?.focus({ preventScroll: true })
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-ink)_45%,transparent)] p-4 sm:p-6"
      onClick={(e) => {
        // Only dismiss on a genuine backdrop click. Guarding on target===
        // currentTarget also prevents the click that *opened* this modal (the
        // header "?" button) from bubbling into the freshly-mounted backdrop
        // and closing it again in the same tick.
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="animate-pop flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-[var(--color-orange-200)] bg-[var(--color-card)] font-body shadow-[var(--shadow-card)]"
      >
        {/* header (fixed) */}
        <div className="flex items-center gap-4 px-6 pt-6 sm:px-8 sm:pt-8">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-orange-400)] to-[var(--color-orange-600)] text-3xl shadow-[var(--shadow-soft)]">
            🧮
          </div>
          <div className="flex flex-col gap-1">
            <h2
              id="welcome-title"
              className="font-display text-2xl leading-tight font-semibold text-[var(--color-orange-800)] sm:text-[27px]"
            >
              How to get the most out of TimesTables
            </h2>
            <p className="text-sm font-bold text-[var(--color-orange-600)]">
              Know it, or work it out — that's the whole game.
            </p>
          </div>
        </div>

        {/* tips (scroll if the viewport is short) */}
        <div className="mt-6 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 sm:px-8">
          {TIPS.map((tip) => (
            <div
              key={tip.title}
              className="flex gap-4 rounded-[18px] border border-[var(--color-orange-100)] bg-[var(--color-orange-50)] p-4 sm:p-5"
            >
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-[var(--shadow-soft)]"
                style={{ backgroundColor: tip.tileBg, border: `1.5px solid ${tip.tileBorder}` }}
              >
                {tip.icon}
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="font-display text-lg leading-snug font-semibold text-[var(--color-orange-800)]">
                  {tip.title}
                </p>
                <p className="text-[14.5px] leading-relaxed font-semibold text-[var(--color-ink)]">
                  {tip.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* action (fixed) */}
        <div className="px-6 pt-4 pb-6 sm:px-8 sm:pb-8">
          <button
            ref={ctaRef}
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#2ba05e] to-[#1f7d47] px-4 py-4 font-display text-lg font-semibold text-white shadow-[var(--shadow-card)] transition-transform hover:scale-[1.01] active:translate-y-1 active:shadow-none"
          >
            Got it — let's go 🚀
          </button>
        </div>
      </div>
    </div>
  )
}
