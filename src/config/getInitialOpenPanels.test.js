// getInitialOpenPanels.test.js
import { getInitialOpenPanels } from './getInitialOpenPanels'

describe('getInitialOpenPanels', () => {
  const breakpoint = 'desktop'

  it('returns empty object when config is empty', () => {
    expect(getInitialOpenPanels({}, breakpoint)).toEqual({})
  })

  it('includes panels with open = true and no prev state', () => {
    const config = {
      PanelA: { desktop: { open: true } }
    }
    const result = getInitialOpenPanels(config, breakpoint)
    expect(result).toEqual({ PanelA: { props: {} } })
  })

  it('skips panels with open = false', () => {
    const config = {
      PanelA: { desktop: { open: false } }
    }
    const result = getInitialOpenPanels(config, breakpoint)
    expect(result).toEqual({})
  })

  it('skips panels if bpConfig is missing', () => {
    const config = {
      PanelA: {} // no desktop config
    }
    const result = getInitialOpenPanels(config, breakpoint)
    expect(result).toEqual({})
  })

  it('preserves prevOpenPanels state if exists', () => {
    const config = {
      PanelA: { desktop: { open: true } }
    }
    const prevOpenPanels = {
      PanelA: { props: { some: 'value' } }
    }
    const result = getInitialOpenPanels(config, breakpoint, prevOpenPanels)
    expect(result).toEqual(prevOpenPanels)
  })

  it('uses empty props object if no prevOpenPanels entry exists', () => {
    const config = {
      PanelA: { desktop: { open: true } },
      PanelB: { desktop: { open: true } }
    }
    const prevOpenPanels = {
      PanelA: { props: { existing: true } }
    }
    const result = getInitialOpenPanels(config, breakpoint, prevOpenPanels)
    expect(result).toEqual({
      PanelA: { props: { existing: true } }, // preserved
      PanelB: { props: {} } // new with empty props
    })
  })
})
