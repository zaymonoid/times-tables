import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Strategy } from '../../../engine'
import StrategyCardView from '../StrategyCardView'

type Args = { text: string }

const meta = {
  title: 'Strategies/Think it through',
  render: ({ text }: Args) => {
    const strategy: Strategy = { text, card: { kind: 'generic' } }
    return <StrategyCardView strategy={strategy} />
  },
  argTypes: {
    text: { control: 'text' },
  },
  args: { text: 'Break it into friendly pieces.' },
} satisfies Meta<Args>

export default meta
export const Default: StoryObj<typeof meta> = {}
