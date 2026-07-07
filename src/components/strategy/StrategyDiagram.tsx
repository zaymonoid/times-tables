import type { CardFamily, Diagram } from './cardSpec'
import { squareRun } from './cardSpec'

/** Raw CSS-var colours for a family, for use in SVG and inline styles. */
function palette(family: CardFamily) {
  return {
    fill: `var(--color-${family}-100)`,
    fillStrong: `var(--color-${family}-200)`,
    stroke: `var(--color-${family}-400)`,
    ink: `var(--color-${family}-700)`,
  }
}

/** Number-bond tree: a factor splitting into two children (add or take away). */
function BondTree({
  root,
  left,
  right,
  op,
  family,
}: {
  root: number
  left: number
  right: number
  op: 'plus' | 'minus'
  family: CardFamily
}) {
  const c = palette(family)
  const minus = op === 'minus'
  // Colours go through `style` (not bare SVG attributes) so the CSS custom
  // properties resolve reliably across browsers.
  const node = (cx: number, cy: number, r: number, value: number, ghost = false) => (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        strokeWidth={2}
        strokeDasharray={ghost ? '4 3' : undefined}
        style={{ fill: ghost ? 'transparent' : c.fill, stroke: c.stroke }}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={20}
        fontWeight={800}
        style={{ fill: c.ink }}
      >
        {value}
      </text>
    </g>
  )
  return (
    <svg viewBox="0 0 200 120" className="w-full max-w-[220px]" role="img" aria-hidden>
      {/* Connectors run centre-to-centre; the circles paint over the ends. */}
      <line x1={100} y1={28} x2={48} y2={90} strokeWidth={2.5} style={{ stroke: c.stroke }} />
      <line x1={100} y1={28} x2={152} y2={90} strokeWidth={2.5} style={{ stroke: c.stroke }} />
      {node(100, 28, 21, root)}
      {node(48, 90, 19, left)}
      {node(152, 90, 19, right, minus)}
      {minus && (
        <text
          x={100}
          y={92}
          textAnchor="middle"
          fontSize={18}
          fontWeight={800}
          style={{ fill: c.stroke }}
        >
          −
        </text>
      )}
    </svg>
  )
}

/** One or two rounded boxes showing a repeated known fact. */
function TwoGroupsBoxes({
  box,
  count,
  caption,
  family,
}: {
  box: string
  count: number
  caption: string
  family: CardFamily
}) {
  const c = palette(family)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border-2 px-4 py-2 text-lg font-bold"
            style={{ background: c.fillStrong, borderColor: c.stroke, color: c.ink }}
          >
            {box}
          </div>
        ))}
      </div>
      <p className="text-xs font-semibold text-[var(--color-ink-soft)]">{caption}</p>
    </div>
  )
}

/** The n×n array grown from the (n−1)² square by an L-shaped border. */
function GrowSquareGrid({ n, family }: { n: number; family: CardFamily }) {
  const c = palette(family)
  const prev = n - 1
  const cells = Array.from({ length: n * n }, (_, i) => {
    const row = Math.floor(i / n) + 1
    const col = (i % n) + 1
    if (row === n && col === n) return 'corner'
    if (row === n || col === n) return 'add'
    return 'base'
  })
  const gridWidth = Math.min(168, n * 20)
  return (
    <div className="grid items-center gap-x-1.5 gap-y-1" style={{ gridTemplateColumns: 'auto auto' }}>
      {/* top-left: the grown square */}
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, width: `${gridWidth}px` }}
      >
        {cells.map((role, i) => (
          <div
            key={i}
            className="aspect-square rounded-[3px] border"
            style={{
              background:
                role === 'base'
                  ? c.fillStrong
                  : role === 'corner'
                    ? 'var(--color-grow-corner)'
                    : 'var(--color-grow-add)',
              borderColor:
                role === 'base'
                  ? c.stroke
                  : role === 'corner'
                    ? 'var(--color-grow-corner)'
                    : 'var(--color-orange-400)',
            }}
          />
        ))}
      </div>
      {/* top-right: right column */}
      <span className="text-xs font-bold text-[var(--color-orange-700)]">+{prev}</span>
      {/* bottom-left: bottom row, centred under the grid */}
      <span
        className="text-center text-xs font-bold text-[var(--color-orange-700)]"
        style={{ width: `${gridWidth}px` }}
      >
        +{prev}
      </span>
      {/* bottom-right: the corner cell */}
      <span className="text-xs font-bold text-[var(--color-grow-corner)]">+1</span>
    </div>
  )
}

/** A chain of values each doubling the last: v ─×2→ 2v ─×2→ 4v. */
function DoublingChain({
  values,
  caption,
  family,
}: {
  values: number[]
  caption?: string
  family: CardFamily
}) {
  const c = palette(family)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {values.map((v, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span
              className="rounded-lg border-2 px-3 py-1 text-base font-bold"
              style={{ background: c.fillStrong, borderColor: c.stroke, color: c.ink }}
            >
              {v}
            </span>
            {i < values.length - 1 && (
              <span className="text-[10px] font-bold text-[var(--color-ink-soft)]">×2 →</span>
            )}
          </span>
        ))}
      </div>
      {caption && (
        <p className="text-xs font-semibold text-[var(--color-ink-soft)]">{caption}</p>
      )}
    </div>
  )
}

/** "Squares grow by odd numbers": 25 +11 36 +13 49 +15 64, current square bold. */
function OddNumbers({ n }: { n: number }) {
  const run = squareRun(n)
  const target = n * n
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">
        squares grow by odd numbers
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1 text-sm">
        {run.map((sq, i) => (
          <span key={sq} className="flex items-center gap-1">
            <span
              className={
                sq === target
                  ? 'font-black text-[var(--color-leaf-700)]'
                  : 'font-semibold text-[var(--color-ink-soft)]'
              }
            >
              {sq}
            </span>
            {i < run.length - 1 && (
              <span className="text-xs font-bold text-[var(--color-orange-600)]">
                +{run[i + 1] - sq}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

/** A run of multiples of five, ending on the target. */
function MultiplesStrip({ values, family }: { values: number[]; family: CardFamily }) {
  const c = palette(family)
  const last = values[values.length - 1]
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {values.map((v) => (
        <span
          key={v}
          className="rounded-md px-2 py-1 text-sm font-bold"
          style={{
            background: v === last ? c.fillStrong : 'transparent',
            color: v === last ? c.ink : 'var(--color-ink-soft)',
          }}
        >
          {v}
        </span>
      ))}
    </div>
  )
}

/** Place-value shift: a single digit gains a zero when multiplied by ten. */
function PlaceValueShift({ from, to, family }: { from: number; to: string; family: CardFamily }) {
  const c = palette(family)
  const box = (content: string, strong: boolean) => (
    <div
      className="rounded-xl border-2 px-4 py-2 text-lg font-bold"
      style={{
        background: strong ? c.fillStrong : c.fill,
        borderColor: c.stroke,
        color: c.ink,
      }}
    >
      {content}
    </div>
  )
  return (
    <div className="flex items-center gap-2">
      {box(`${from}`, false)}
      <span className="text-xs font-bold text-[var(--color-ink-soft)]">×10 →</span>
      {box(to, true)}
    </div>
  )
}

/**
 * Same digit, two homes: 11 = 10 + 1, so the digit lands in both the tens and
 * the ones place. Tens column is plum, ones column is leaf, ignoring `family`.
 */
function RepeatDigitBoxes({ digit }: { digit: number; family: CardFamily }) {
  const column = (
    fam: CardFamily,
    pill: string,
    place: string,
    sub: string,
  ) => {
    const c = palette(fam)
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
          style={{ background: c.fill, color: c.ink }}
        >
          {pill}
        </span>
        <span className="text-sm font-bold leading-none" style={{ color: c.stroke }}>
          ↓
        </span>
        <div
          className="rounded-xl border-2 px-4 py-2 text-lg font-bold"
          style={{ background: c.fillStrong, borderColor: c.stroke, color: c.ink }}
        >
          {digit}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-ink-soft)]">
          {place}
        </span>
        <span className="text-xs font-semibold text-[var(--color-ink-soft)]">{sub}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-start justify-center gap-6">
        {column('plum', `10 × ${digit}`, 'tens', `${digit} tens = ${digit * 10}`)}
        {column('leaf', `1 × ${digit}`, 'ones', `${digit} ones = ${digit}`)}
      </div>
      <p className="max-w-[220px] text-sm font-semibold text-[var(--color-ink)]">
        11 is <strong className="font-black">a ten and a one</strong> so the{' '}
        <strong className="font-black">{digit}</strong> lands in{' '}
        <strong className="font-black">both places</strong>.
      </p>
    </div>
  )
}

export default function StrategyDiagram({
  diagram,
  family,
}: {
  diagram: Diagram
  family: CardFamily
}) {
  switch (diagram.type) {
    case 'bond-tree':
      return (
        <BondTree
          root={diagram.root}
          left={diagram.left}
          right={diagram.right}
          op={diagram.op}
          family={family}
        />
      )
    case 'two-groups':
      return (
        <TwoGroupsBoxes
          box={diagram.box}
          count={diagram.count}
          caption={diagram.caption}
          family={family}
        />
      )
    case 'grow-square':
      return <GrowSquareGrid n={diagram.n} family={family} />
    case 'doubling-chain':
      return <DoublingChain values={diagram.values} caption={diagram.caption} family={family} />
    case 'place-value':
      return <PlaceValueShift from={diagram.from} to={diagram.to} family={family} />
    case 'multiples':
      return <MultiplesStrip values={diagram.values} family={family} />
    case 'repeat-digit':
      return <RepeatDigitBoxes digit={diagram.digit} family={family} />
    case 'none':
      return null
  }
}

export { OddNumbers, DoublingChain }
