import { within, waitFor, expect, userEvent } from '@storybook/test'
import InteractiveMapStory from './components/InteractiveMapStory.jsx'

export default {
  title: 'InteractiveMap',
  component: InteractiveMapStory
}

export const Inline = {
  args: {
    mapConfig: { behaviour: 'inline' },
    plugins: []
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      () => expect(canvasElement.querySelector('canvas')).not.toBeNull(),
      { timeout: 15000 }
    )
  }
}

export const ButtonFirst = {
  args: {
    mapConfig: { behaviour: 'buttonFirst', containerHeight: '500px' },
    plugins: []
  },
  play: async ({ canvasElement }) => {
    const button = await within(canvasElement).findByRole('button', {}, { timeout: 5000 })
    await userEvent.click(button)

    await waitFor(
      () => expect(canvasElement.querySelector('canvas')).not.toBeNull(),
      { timeout: 15000 }
    )
  }
}
