import React from 'react'
import { mapButtons, getMatchingButtons, renderButton } from './mapButtons.js'
import { getPanelConfig } from '../registry/panelRegistry.js'

jest.mock('../registry/buttonRegistry.js')
jest.mock('../registry/panelRegistry.js')
jest.mock('../components/MapButton/MapButton.jsx', () => ({
  MapButton: (props) => <button data-testid='map-button' {...props} />
}))
jest.mock('./slots.js', () => ({
  allowedSlots: { button: ['header', 'sidebar'] }
}))

describe('mapButtons module', () => {
  const baseBtn = {
    iconId: 'i1',
    label: 'Btn',
    desktop: { slot: 'header', order: 1, showLabel: true },
    includeModes: ['view']
  }

  let appState

  const appConfig = { id: 'test' }

  const evaluateProp = jest.fn((prop) => typeof prop === 'function' ? prop({ appState, appConfig }) : prop)

  beforeEach(() => {
    jest.clearAllMocks()
    appState = {
      breakpoint: 'desktop',
      mode: 'view',
      isFullscreen: true,
      openPanels: {},
      dispatch: jest.fn(),
      disabledButtons: new Set(),
      hiddenButtons: new Set(),
      pressedButtons: new Set(),
      expandedButtons: new Set(),
      buttonConfig: {},
      panelConfig: {}
    }
    appState.buttonConfig = ({})
    getPanelConfig.mockReturnValue({})
  })

  // -------------------------
  // getMatchingButtons tests
  // -------------------------
  describe('getMatchingButtons', () => {
    const testFilter = (config, expected) => {
      expect(getMatchingButtons({ buttonConfig: config, slot: 'header', appState, evaluateProp }).length).toBe(expected)
    }

    it('returns empty array when buttonConfig is null', () => testFilter(null, 0))
    it('filters out buttons not in the correct slot', () => testFilter({ b1: { ...baseBtn, desktop: { slot: 'sidebar' } } }, 0))
    it('filters out buttons excluded by includeModes', () => testFilter({ b1: { ...baseBtn, includeModes: ['edit'] } }, 0))
    it('filters out buttons excluded by excludeModes', () => testFilter({ b1: { ...baseBtn, excludeModes: ['view'] } }, 0))
    it('returns all valid matching buttons', () => testFilter({ b1: baseBtn, b2: baseBtn }, 2))

    it('excludes buttons dynamically via excludeWhen', () => {
      const fn = jest.fn(() => true)
      const config = { b1: { ...baseBtn, desktop: { slot: 'header' }, excludeWhen: fn, pluginId: 'p1' } }
      getMatchingButtons({ buttonConfig: config, slot: 'header', appState, evaluateProp })
      expect(evaluateProp).toHaveBeenCalledWith(fn, 'p1')
    })

    it('filters out buttons with inline:false when not in fullscreen', () => {
      const config = { b1: { ...baseBtn, inline: false } }
      const state = { ...appState, isFullscreen: false }
      expect(getMatchingButtons({ buttonConfig: config, slot: 'header', appState: state, evaluateProp }).length).toBe(0)
    })

    it('includes buttons with inline:false when in fullscreen', () => {
      const config = { b1: { ...baseBtn, inline: false } }
      const state = { ...appState, isFullscreen: true }
      expect(getMatchingButtons({ buttonConfig: config, slot: 'header', appState: state, evaluateProp }).length).toBe(1)
    })

    it('includes buttons without inline property regardless of fullscreen state', () => {
      const config = { b1: baseBtn }
      const state = { ...appState, isFullscreen: false }
      expect(getMatchingButtons({ buttonConfig: config, slot: 'header', appState: state, evaluateProp }).length).toBe(1)
    })

    it('filters out buttons with isMenuItem:true', () => {
      const config = { b1: { ...baseBtn, isMenuItem: true } }
      expect(getMatchingButtons({ buttonConfig: config, slot: 'header', appState, evaluateProp }).length).toBe(0)
    })

    it('does not filter out buttons without isMenuItem', () => {
      const config = { b1: baseBtn, b2: { ...baseBtn, isMenuItem: false } }
      expect(getMatchingButtons({ buttonConfig: config, slot: 'header', appState, evaluateProp }).length).toBe(2)
    })
  })

  // -------------------------
  // renderButton tests
  // -------------------------
  describe('renderButton', () => {
    const render = (config, state = appState, flags = {}) =>
      renderButton({ btn: ['id', config], appState: state, appConfig, evaluateProp, groupStart: false, groupMiddle: false, groupEnd: false, ...flags })

    it('renders a MapButton with correct basic props', () => {
      const result = render(baseBtn)
      expect(result.props).toMatchObject({ buttonId: 'id', iconId: 'i1', label: 'Btn', showLabel: true })
    })

    it('applies group flags correctly', () => {
      const result = render(baseBtn, appState, { groupStart: true, groupEnd: true })
      expect(result.props).toMatchObject({ groupStart: true, groupEnd: true })
    })

    it('evaluates dynamic label, iconId, and href via evaluateProp', () => {
      const label = jest.fn(() => 'DynamicLabel')
      const iconId = jest.fn(() => 'DynamicIcon')
      const href = jest.fn(() => '/dynamic')
      render({ ...baseBtn, label, iconId, href, pluginId: 'p1' })
      expect(evaluateProp).toHaveBeenCalledWith(label, 'p1')
      expect(evaluateProp).toHaveBeenCalledWith(iconId, 'p1')
      expect(evaluateProp).toHaveBeenCalledWith(href, 'p1')
    })

    it('calls the custom onClick handler when clicked', () => {
      const onClick = jest.fn()
      const btn = { ...baseBtn, onClick, pluginId: 'p1' }
      render(btn).props.onClick({})
      expect(onClick).toHaveBeenCalledWith({}, expect.any(Object))
    })

    it('opens and closes panel on button click to cover all branches', () => {
      const btn = { ...baseBtn, panelId: 'p1' }
      const mockButtonEl = document.createElement('button')
      const mockEvent = { currentTarget: mockButtonEl }

      // OPEN_PANEL branch
      render(btn).props.onClick(mockEvent)
      expect(appState.dispatch).toHaveBeenCalledWith({
        type: 'OPEN_PANEL',
        payload: { panelId: 'p1', props: { triggeringElement: mockButtonEl } }
      })

      // CLOSE_PANEL branch
      render(btn, { ...appState, openPanels: { p1: true } }).props.onClick(mockEvent)
      expect(appState.dispatch).toHaveBeenCalledWith({
        type: 'CLOSE_PANEL',
        payload: 'p1'
      })
    })

    it('renders correct state flags for disabled, hidden, pressed and expanded buttons', () => {
      const state = {
        ...appState,
        disabledButtons: new Set(['id']),
        hiddenButtons: new Set(['id']),
        pressedButtons: new Set(['id']),
        expandedButtons: new Set(['id'])
      }
      const result = render({ ...baseBtn, pressedWhen: jest.fn(), expandedWhen: jest.fn() }, state)
      expect(result.props).toMatchObject({ isDisabled: true, isHidden: true, isPressed: true, isExpanded: true })
    })

    it('uses empty object fallback for missing breakpoint config', () => {
      const result = render(baseBtn, { ...appState, breakpoint: 'mobile' })
      expect(result.props.showLabel).toBeUndefined()
    })

    it('does nothing when clicked if button has no panelId and no onClick', () => {
      const btn = { ...baseBtn } // ❗ no panelId, no onClick
      const handler = render(btn).props.onClick

      handler({})

      // dispatch should NOT be called because panelId is missing
      expect(appState.dispatch).not.toHaveBeenCalled()
    })
  })

  // -------------------------
  // mapButtons tests
  // -------------------------
  describe('mapButtons', () => {
    const map = () => mapButtons({ slot: 'header', appState, appConfig, evaluateProp })

    it('returns empty array when buttonConfig is empty', () => {
      expect(map()).toEqual([])
    })

    it('returns a flat list of buttons with type and order', () => {
      appState.buttonConfig = ({ b1: baseBtn })
      const result = map()
      expect(result[0]).toMatchObject({ id: 'b1', type: 'button', order: 1 })
    })

    it('sets groupStart, groupMiddle, and groupEnd flags correctly for multiple buttons', () => {
      appState.buttonConfig = ({
        b1: { ...baseBtn, group: 'g1' },
        b2: { ...baseBtn, desktop: { slot: 'header', order: 2 }, group: 'g1' },
        b3: { ...baseBtn, desktop: { slot: 'header', order: 3 }, group: 'g1' }
      })
      const result = map()
      expect(result[0].element.props).toMatchObject({ groupStart: true })
      expect(result[1].element.props.groupMiddle).toBe(true)
      expect(result[2].element.props).toMatchObject({ groupEnd: true })
    })

    it('ignores singleton groups when calculating group flags', () => {
      appState.buttonConfig = ({ b1: { ...baseBtn, group: 'g1' } })
      expect(map()[0].element.props).toMatchObject({ groupStart: false, groupEnd: false })
    })

    it('falls back to order 0 when order is not specified in breakpoint config', () => {
      appState.buttonConfig = ({ b1: { ...baseBtn, desktop: { slot: 'header' } } })
      expect(map()[0].order).toBe(0)
    })

    it('excludes menu items from slot rendering even when they have a matching slot', () => {
      appState.buttonConfig = ({
        parent: baseBtn,
        child: { ...baseBtn, isMenuItem: true }
      })
      const result = map()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('parent')
    })
  })
})
