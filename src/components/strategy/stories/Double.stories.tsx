import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Strategy } from '../../../engine'
import StrategyCardView from '../StrategyCardView'

type Args = { half: number; other: number }

const meta = {
  title: 'Strategies/Double a known fact',
  render: ({ half, other }: Args) => {
    const strategy: Strategy = { text: '', card: { kind: 'double', half, other } }
    return <StrategyCardView strategy={strategy} />
  },
  argTypes: {
    half: { control: { type: 'range', min: 1, max: 6, step: 1 } },
    other: { control: { type: 'range', min: 2, max: 12, step: 1 } },
  },
  args: { half: 3, other: 7 },
} satisfies Meta<Args>

export default meta
export const Default: StoryObj<typeof meta> = {}
