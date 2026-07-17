import { initialState, reducer } from './appReducer.js'
import { actionsMap } from './appActionsMap.js'
import * as mediaState from '../../utils/getMediaState.js'
import * as initialOpenPanels from '../../config/getInitialOpenPanels.js'
import * as fullscreenUtils from '../../utils/getIsFullscreen.js'
import { createMockRegistries } from '../../test-utils.js'

describe('initialState', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockMedia = (overrides = {}) => {
    jest.spyOn(mediaState, 'getMediaState').mockReturnValue({
      preferredColorScheme: 'dark',
      prefersReducedMotion: true,
      ...overrides
    })
  }

  const mockPanels = (value = {}) => {
    jest.spyOn(initialOpenPanels, 'getInitialOpenPanels').mockReturnValue(value)
  }

  const mockFullscreen = (value) => {
    jest.spyOn(fullscreenUtils, 'getIsFullscreen').mockReturnValue(value)
  }

  test('returns correct initial state when autoColorScheme is true', () => {
    mockMedia()
    mockPanels({ panel1: true })
    mockFullscreen(true)

    const config = {
      behaviour: 'responsive',
      initialBreakpoint: 'sm',
      initialInterfaceType: 'mobile',
      appColorScheme: 'light',
      autoColorScheme: true,
      mode: 'edit',
      ...createMockRegistries({ panelConfig: { panel1: {} } })
    }

    const result = initialState(config)

    expect(result.breakpoint).toBe('sm')
    expect(result.preferredColorScheme).toBe('dark')
    expect(result.mode).toBe('edit')
    expect(result.panelConfig).toEqual({ panel1: {} })
    expect(result.nudgeStepSize).toBe('large')
  })

  test('uses appColorScheme when autoColorScheme is false', () => {
    mockMedia({ prefersReducedMotion: false })
    mockPanels({})
    mockFullscreen(false)

    const config = {
      behaviour: 'standard',
      initialBreakpoint: 'lg',
      initialInterfaceType: 'desktop',
      appColorScheme: 'light',
      autoColorScheme: false,
      mode: null,
      ...createMockRegistries()
    }

    const result = initialState(config)

    expect(result.preferredColorScheme).toBe('light')
    expect(result.prefersReducedMotion).toBe(false)
  })

  test('pre-disables journeyContinue when backAndContinue has a continueLabel', () => {
    mockMedia()
    mockPanels({})
    mockFullscreen(false)

    const config = {
      behaviour: 'buttonFirst',
      initialBreakpoint: 'md',
      initialInterfaceType: 'desktop',
      appColorScheme: 'light',
      autoColorScheme: false,
      backAndContinue: { continueLabel: 'Continue' },
      ...createMockRegistries()
    }

    const result = initialState(config)
    expect(result.disabledButtons.has('journeyContinue')).toBe(true)
  })

  test('does not pre-disable journeyContinue when backAndContinue is null', () => {
    mockMedia()
    mockPanels({})
    mockFullscreen(false)

    const config = {
      behaviour: 'buttonFirst',
      initialBreakpoint: 'md',
      initialInterfaceType: 'desktop',
      appColorScheme: 'light',
      autoColorScheme: false,
      ...createMockRegistries()
    }

    const result = initialState(config)
    expect(result.disabledButtons.has('journeyContinue')).toBe(false)
  })

  test('defaults mode to null when missing', () => {
    mockMedia({ prefersReducedMotion: false })
    mockPanels({})
    mockFullscreen(false)

    const config = {
      behaviour: 'minimal',
      initialBreakpoint: 'md',
      initialInterfaceType: 'tablet',
      appColorScheme: 'light',
      autoColorScheme: true,
      ...createMockRegistries()
    }

    const result = initialState(config)

    expect(result.mode).toBeNull()
  })
})

describe('reducer', () => {
  test('calls mapped action handler', () => {
    const state = { value: 0 }
    const payload = 123
    const fn = jest.fn().mockReturnValue({ value: 123 })

    actionsMap.TEST_ACTION = fn

    const result = reducer(state, { type: 'TEST_ACTION', payload })

    expect(fn).toHaveBeenCalledWith(state, payload)
    expect(result).toEqual({ value: 123 })

    delete actionsMap.TEST_ACTION
  })

  test('returns original state when action not found', () => {
    const state = { test: true }
    const result = reducer(state, { type: 'NOPE' })
    expect(result).toBe(state)
  })
})
