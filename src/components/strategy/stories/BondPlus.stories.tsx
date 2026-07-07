import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Strategy } from '../../../engine'
import StrategyCardView from '../StrategyCardView'

type Args = { partA: number; partB: number; other: number }

const meta = {
  title: 'Strategies/Break apart',
  render: ({ partA, partB, other }: Args) => {
    const strategy: Strategy = {
      text: '',
      card: { kind: 'bond-plus', factor: partA + partB, parts: [partA, partB], other },
    }
    return <StrategyCardView strategy={strategy} />
  },
  argTypes: {
    partA: { control: { type: 'range', min: 1, max: 10, step: 1 } },
    partB: { control: { type: 'range', min: 1, max: 10, step: 1 } },
    other: { control: { type: 'range', min: 2, max: 12, step: 1 } },
  },
  args: { partA: 10, partB: 2, other: 7 },
} satisfies Meta<Args>

export default meta
export const Default: StoryObj<typeof meta> = {}
