import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Strategy } from '../../../engine'
import StrategyCardView from '../StrategyCardView'

type Args = { whole: number; small: number; other: number }

const meta = {
  title: 'Strategies/Round and fix',
  render: ({ whole, small, other }: Args) => {
    const strategy: Strategy = {
      text: '',
      card: { kind: 'bond-minus', factor: whole - small, whole, small, other },
    }
    return <StrategyCardView strategy={strategy} />
  },
  argTypes: {
    whole: { control: { type: 'range', min: 2, max: 12, step: 1 } },
    small: { control: { type: 'range', min: 1, max: 4, step: 1 } },
    other: { control: { type: 'range', min: 2, max: 12, step: 1 } },
  },
  args: { whole: 10, small: 1, other: 8 },
} satisfies Meta<Args>

export default meta
export const Default: StoryObj<typeof meta> = {}
