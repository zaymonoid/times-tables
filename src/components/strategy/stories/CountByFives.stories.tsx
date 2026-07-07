import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Strategy } from '../../../engine'
import StrategyCardView from '../StrategyCardView'

type Args = { other: number }

const meta = {
  title: 'Strategies/Skip count',
  render: ({ other }: Args) => {
    const strategy: Strategy = { text: '', card: { kind: 'count-by-fives', other } }
    return <StrategyCardView strategy={strategy} />
  },
  argTypes: {
    other: { control: { type: 'range', min: 2, max: 12, step: 1 } },
  },
  args: { other: 7 },
} satisfies Meta<Args>

export default meta
export const Default: StoryObj<typeof meta> = {}
