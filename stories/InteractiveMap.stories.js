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

// Shows the open-map button. Click it manually to load the map.
// The test-runner uses ButtonFirstFlow to test the full click → map sequence.
export const ButtonFirst = {
  args: {
    mapConfig: { behaviour: 'buttonFirst', containerHeight: '500px' },
    plugins: []
  },
  play: async ({ canvasElement }) => {
    // Verify the button renders — do not auto-click so the story shows the button state.
    await within(canvasElement).findByRole('button', {}, { timeout: 5000 })
  }
}

// Same as ButtonFirst but the play function clicks through to the map.
// Use this story in the test-runner to exercise the full buttonFirst flow.
export const ButtonFirstFlow = {
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
