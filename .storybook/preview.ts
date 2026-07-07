import type { Preview } from '@storybook/react-vite'
import '../src/index.css' // Tailwind + the @theme static CSS vars the diagrams read as raw var(...)

const preview: Preview = {
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'paper',
      values: [
        { name: 'paper', value: 'var(--color-paper)' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
}

export default preview
