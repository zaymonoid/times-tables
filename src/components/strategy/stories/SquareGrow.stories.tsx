import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Strategy } from '../../../engine'
import StrategyCardView from '../StrategyCardView'

type Args = { n: number }

const meta = {
  title: 'Strategies/Grow the square',
  render: ({ n }: Args) => {
    const strategy: Strategy = { text: '', card: { kind: 'square-grow', n } }
    return <StrategyCardView strategy={strategy} />
  },
  argTypes: {
    n: { control: { type: 'range', min: 3, max: 12, step: 1 } },
  },
  args: { n: 7 },
} satisfies Meta<Args>

export default meta
export const Default: StoryObj<typeof meta> = {}
