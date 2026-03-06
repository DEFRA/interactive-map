import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport'

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    layout: 'fullscreen',
    viewport: {
      viewports: {
        ...INITIAL_VIEWPORTS,
        mapMobile: {
          name: 'Map Mobile (375px)',
          styles: { width: '375px', height: '812px' }
        },
        mapDesktop: {
          name: 'Map Desktop (1280px)',
          styles: { width: '1280px', height: '800px' }
        }
      }
    }
  }
}

export default preview
