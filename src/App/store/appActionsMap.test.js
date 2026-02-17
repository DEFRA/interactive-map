import { actionsMap } from './appActionsMap.js'
import * as panelRegistryFn from '../registry/panelRegistry.js'
import * as buttonRegistryFn from '../registry/buttonRegistry.js'
import * as controlRegistryFn from '../registry/controlRegistry.js'
import * as getInitialOpenPanelsModule from '../../config/getInitialOpenPanels.js'
import * as shallowEqualModule from '../../utils/shallowEqual.js'
import * as getIsFullscreenModule from '../../utils/getIsFullscreen.js'

describe('actionsMap full coverage', () => {
  let state

  beforeEach(() => {
    const mockPanelConfig = {
      panel1: { desktop: { exclusive: true, modal: false, initiallyOpen: true }, mobile: { exclusive: true, modal: false } },
      panel2: { desktop: { exclusive: false, modal: true }, mobile: { exclusive: false, modal: true } },
      panel3: { desktop: { exclusive: false, modal: false }, mobile: { exclusive: false, modal: false } }
    }

    state = {
      mode: 'view',
      previousMode: 'edit',
      breakpoint: 'desktop',
      interfaceType: 'default',
      openPanels: { panel1: { props: {} } },
      previousOpenPanels: {},
      hasExclusiveControl: false,
      safeZoneInset: { top: 0, bottom: 0 },
      isLayoutReady: false,
      syncMapPadding: true,
      disabledButtons: new Set(['btn1']),
      hiddenButtons: new Set(['btn3']),
      pressedButtons: new Set(['btn5']),
      expandedButtons: new Set(['btn7']),
      panelConfig: mockPanelConfig,
      panelRegistry: { addPanel: jest.fn(), removePanel: jest.fn(), getPanelConfig: jest.fn(() => mockPanelConfig) },
      buttonConfig: {},
      buttonRegistry: { addButton: jest.fn() },
      controlConfig: {},
      controlRegistry: { addControl: jest.fn() }
    }

    jest.spyOn(getInitialOpenPanelsModule, 'getInitialOpenPanels').mockImplementation(() => ({ panel1: { props: {} } }))
    jest.spyOn(shallowEqualModule, 'shallowEqual').mockImplementation((a, b) => JSON.stringify(a) === JSON.stringify(b))
    jest.spyOn(getIsFullscreenModule, 'getIsFullscreen').mockReturnValue(false)

    jest.spyOn(panelRegistryFn, 'registerPanel').mockImplementation((config, payload) => ({ ...config, [payload.id]: payload.config }))
    jest.spyOn(controlRegistryFn, 'registerControl').mockImplementation((config, payload) => ({ ...config, [payload.id]: payload.config }))
    jest.spyOn(buttonRegistryFn, 'registerButton').mockImplementation((config, payload) => ({ ...config, [payload.id]: payload.config }))
    jest.spyOn(panelRegistryFn, 'addPanel').mockImplementation((config, id, cfg) => ({ ...config, [id]: cfg }))
    jest.spyOn(buttonRegistryFn, 'addButton').mockImplementation((config, id, cfg) => ({ ...config, [id]: cfg }))
    jest.spyOn(controlRegistryFn, 'addControl').mockImplementation((config, id, cfg) => ({ ...config, [id]: cfg }))
    jest.spyOn(panelRegistryFn, 'removePanel').mockImplementation((config, id) => {
      const { [id]: _, ...rest } = config
      return rest
    })
  })

  afterEach(() => jest.restoreAllMocks())

  // ---------------------- EXISTING COVERAGE ----------------------
  test('SET_MODE updates mode, previousMode, and openPanels', () => {
    const result = actionsMap.SET_MODE(state, 'edit')
    expect(result.mode).toBe('edit')
    expect(result.previousMode).toBe('view')
    expect(result.openPanels).toHaveProperty('panel1')
  })

  test('REVERT_MODE swaps mode and previousMode and updates openPanels', () => {
    const result = actionsMap.REVERT_MODE(state)
    expect(result.mode).toBe('edit')
    expect(result.previousMode).toBe('view')
    expect(result.openPanels).toHaveProperty('panel1')
  })

  test('SET_MEDIA merges payload into state', () => {
    const payload = { interfaceType: 'compact', mode: 'edit' }
    const result = actionsMap.SET_MEDIA(state, payload)
    expect(result).toMatchObject(payload)
  })

  test('SET_INTERFACE_TYPE sets interfaceType', () => {
    const result = actionsMap.SET_INTERFACE_TYPE(state, 'compact')
    expect(result.interfaceType).toBe('compact')
  })

  test('OPEN_PANEL adds a panel with props', () => {
    const result = actionsMap.OPEN_PANEL(state, { panelId: 'panel2', props: { foo: 'bar' } })
    expect(result.openPanels.panel2?.props).toEqual({ foo: 'bar' })
    expect(result.previousOpenPanels).toBe(state.openPanels)
  })

  test('OPEN_PANEL defaults props to empty object', () => {
    const result = actionsMap.OPEN_PANEL(state, { panelId: 'panel3' })
    expect(result.openPanels.panel3?.props).toEqual({})
  })

  test('CLOSE_PANEL removes a panel', () => {
    const result = actionsMap.CLOSE_PANEL(state, 'panel1')
    expect(result.openPanels.panel1).toBeUndefined()
    expect(result.previousOpenPanels).toBe(state.openPanels)
  })

  test('CLOSE_ALL_PANELS clears openPanels', () => {
    const result = actionsMap.CLOSE_ALL_PANELS(state)
    expect(result.openPanels).toEqual({})
    expect(result.previousOpenPanels).toBe(state.openPanels)
  })

  test('RESTORE_PREVIOUS_PANELS restores previousOpenPanels or {}', () => {
    let result = actionsMap.RESTORE_PREVIOUS_PANELS(state)
    expect(result.openPanels).toBe(state.previousOpenPanels)
    expect(result.previousOpenPanels).toBe(state.openPanels)

    const localState = { ...state, previousOpenPanels: undefined }
    result = actionsMap.RESTORE_PREVIOUS_PANELS(localState)
    expect(result.openPanels).toEqual({})
    expect(result.previousOpenPanels).toBe(localState.openPanels)
  })

  test('TOGGLE_HAS_EXCLUSIVE_CONTROL sets flag', () => {
    const result = actionsMap.TOGGLE_HAS_EXCLUSIVE_CONTROL(state, true)
    expect(result.hasExclusiveControl).toBe(true)
  })

  test('SET_SAFE_ZONE_INSET branch true/false', () => {
    shallowEqualModule.shallowEqual.mockReturnValueOnce(false)
    const res1 = actionsMap.SET_SAFE_ZONE_INSET(state, { safeZoneInset: { top: 10, bottom: 10 } })
    expect(res1.isLayoutReady).toBe(true)

    shallowEqualModule.shallowEqual.mockReturnValueOnce(true)
    const res2 = actionsMap.SET_SAFE_ZONE_INSET(state, { safeZoneInset: { top: 10, bottom: 10 } })
    expect(res2).toBe(state)
  })

  test('TOGGLE_BUTTON_DISABLED adds/removes button', () => {
    const r1 = actionsMap.TOGGLE_BUTTON_DISABLED(state, { id: 'btn2', isDisabled: true })
    expect(r1.disabledButtons.has('btn2')).toBe(true)
    const r2 = actionsMap.TOGGLE_BUTTON_DISABLED(state, { id: 'btn1', isDisabled: false })
    expect(r2.disabledButtons.has('btn1')).toBe(false)
  })

  test('TOGGLE_BUTTON_HIDDEN adds/removes button', () => {
    const r1 = actionsMap.TOGGLE_BUTTON_HIDDEN(state, { id: 'btn4', isHidden: true })
    expect(r1.hiddenButtons.has('btn4')).toBe(true)
    const r2 = actionsMap.TOGGLE_BUTTON_HIDDEN(state, { id: 'btn3', isHidden: false })
    expect(r2.hiddenButtons.has('btn3')).toBe(false)
  })

  test('TOGGLE_BUTTON_PRESSED adds/removes button', () => {
    const r1 = actionsMap.TOGGLE_BUTTON_PRESSED(state, { id: 'btn6', isPressed: true })
    expect(r1.pressedButtons.has('btn6')).toBe(true)
    const r2 = actionsMap.TOGGLE_BUTTON_PRESSED(state, { id: 'btn5', isPressed: false })
    expect(r2.pressedButtons.has('btn5')).toBe(false)
  })

  test('TOGGLE_BUTTON_EXPANDED adds/removes button', () => {
    const r1 = actionsMap.TOGGLE_BUTTON_EXPANDED(state, { id: 'btn8', isExpanded: true })
    expect(r1.expandedButtons.has('btn8')).toBe(true)
    const r2 = actionsMap.TOGGLE_BUTTON_EXPANDED(state, { id: 'btn7', isExpanded: false })
    expect(r2.expandedButtons.has('btn7')).toBe(false)
  })

  test('REGISTER_PANEL updates panelConfig', () => {
    const payload = { id: 'panelX', config: { desktop: { slot: 'side' } } }
    const result = actionsMap.REGISTER_PANEL(state, payload)
    expect(result.panelConfig.panelX).toBeDefined()
  })

  test('ADD_PANEL adds panelConfig and opens initiallyOpen panel', () => {
    const payload = { id: 'panelY', config: { desktop: { initiallyOpen: true } } }
    const result = actionsMap.ADD_PANEL(state, payload)
    expect(result.panelConfig.panelY).toBeDefined()
    expect(result.openPanels.panelY).toBeDefined()
  })

  test('ADD_PANEL does not open if initiallyOpen false', () => {
    const payload = { id: 'panelZ', config: { desktop: { initiallyOpen: false } } }
    const result = actionsMap.ADD_PANEL(state, payload)
    expect(result.panelConfig.panelZ).toBeDefined()
    expect(result.openPanels.panelZ).toBeUndefined()
  })

  test('REMOVE_PANEL removes panel from openPanels and calls registry', () => {
    const result = actionsMap.REMOVE_PANEL(state, 'panel1')
    expect(result.openPanels.panel1).toBeUndefined()
    expect(state.panelRegistry.removePanel).toHaveBeenCalled()
  })

  test('REGISTER_CONTROL updates controlConfig', () => {
    const payload = { id: 'ctrl1', config: { type: 'slider' } }
    const result = actionsMap.REGISTER_CONTROL(state, payload)
    expect(result.controlConfig.ctrl1).toBeDefined()
  })

  test('ADD_CONTROL adds controlConfig and calls registry', () => {
    const payload = { id: 'ctrl2', config: { type: 'slider' } }
    const result = actionsMap.ADD_CONTROL(state, payload)
    expect(result.controlConfig.ctrl2).toBeDefined()
    expect(state.controlRegistry.addControl).toHaveBeenCalled()
  })

  test('REGISTER_BUTTON updates buttonConfig', () => {
    const payload = { id: 'btnX', config: { label: 'Hello' } }
    const result = actionsMap.REGISTER_BUTTON(state, payload)
    expect(result.buttonConfig.btnX).toBeDefined()
  })

  test('ADD_BUTTON updates buttonConfig and calls registry', () => {
    const payload = { id: 'btnY', config: { label: 'Y' } }
    const result = actionsMap.ADD_BUTTON(state, payload)
    expect(result.buttonConfig.btnY).toBeDefined()
    expect(state.buttonRegistry.addButton).toHaveBeenCalled()
  })

  test('ADD_BUTTON sets hidden, disabled, pressed and expanded state when config flags are true', () => {
    const payload = {
      id: 'btnSpecial',
      config: { isHidden: true, isDisabled: true, isPressed: true, isExpanded: true }
    }
    const result = actionsMap.ADD_BUTTON(state, payload)
    expect(result.buttonConfig.btnSpecial).toBeDefined()
    expect(result.hiddenButtons.has('btnSpecial')).toBe(true)
    expect(result.disabledButtons.has('btnSpecial')).toBe(true)
    expect(result.pressedButtons.has('btnSpecial')).toBe(true)
    expect(result.expandedButtons.has('btnSpecial')).toBe(true)
  })

  // ---------------------- FALLBACK / OPTIONAL BRANCHES ----------------------
  test('SET_MODE uses panelRegistry.getPanelConfig() when panelConfig missing', () => {
    const tmp = { ...state, panelConfig: undefined }
    const result = actionsMap.SET_MODE(tmp, 'edit')
    expect(result.openPanels.panel1).toBeDefined()
  })

  test('REVERT_MODE uses panelRegistry.getPanelConfig() when panelConfig missing', () => {
    const tmp = { ...state, panelConfig: undefined }
    const result = actionsMap.REVERT_MODE(tmp)
    expect(result.openPanels.panel1).toBeDefined()
  })

  test('OPEN_PANEL uses panelRegistry.getPanelConfig() when panelConfig missing', () => {
    const tmp = { ...state, panelConfig: undefined }
    const result = actionsMap.OPEN_PANEL(tmp, { panelId: 'panel2' })
    expect(result.openPanels.panel2).toBeDefined()
  })

  test('SET_BREAKPOINT uses empty openPanels when lastPanelId missing', () => {
    const tmp = { ...state, openPanels: {} }
    const result = actionsMap.SET_BREAKPOINT(tmp, { breakpoint: 'mobile', behaviour: 'responsive', hybridWidth: null, maxMobileWidth: 640 })
    expect(result.openPanels).toEqual({})
  })

  test('SET_BREAKPOINT rebuilds openPanels with lastPanelId.props fallback', () => {
    const tmp = { ...state, openPanels: { panel3: {} } }
    const result = actionsMap.SET_BREAKPOINT(tmp, { breakpoint: 'mobile', behaviour: 'responsive', hybridWidth: null, maxMobileWidth: 640 })
    expect(result.openPanels.panel3.props).toEqual({})
  })

  test('SET_BREAKPOINT preserves isFullscreen for hybrid behaviour', () => {
    const tmp = { ...state, isFullscreen: true }
    const result = actionsMap.SET_BREAKPOINT(tmp, { breakpoint: 'mobile', behaviour: 'hybrid', hybridWidth: null, maxMobileWidth: 640 })
    expect(result.isFullscreen).toBe(true)
  })

  test('SET_BREAKPOINT calculates isFullscreen for non-hybrid behaviours', () => {
    getIsFullscreenModule.getIsFullscreen.mockReturnValue(true)
    const tmp = { ...state, isFullscreen: false }
    const result = actionsMap.SET_BREAKPOINT(tmp, { breakpoint: 'mobile', behaviour: 'buttonFirst', hybridWidth: null, maxMobileWidth: 640 })
    expect(result.isFullscreen).toBe(true)
  })

  test('SET_HYBRID_FULLSCREEN updates isFullscreen', () => {
    const tmp = { ...state, isFullscreen: false }
    const result = actionsMap.SET_HYBRID_FULLSCREEN(tmp, true)
    expect(result.isFullscreen).toBe(true)
  })

  test('RESTORE_PREVIOUS_PANELS returns {} if previousOpenPanels missing', () => {
    const tmp = { ...state, previousOpenPanels: undefined }
    const result = actionsMap.RESTORE_PREVIOUS_PANELS(tmp)
    expect(result.openPanels).toEqual({})
  })

  test('ADD_BUTTON skips registry if buttonRegistry missing', () => {
    const tmp = { ...state, buttonRegistry: undefined }
    const result = actionsMap.ADD_BUTTON(tmp, { id: 'btnY', config: {} })
    expect(result.buttonConfig.btnY).toBeDefined()
  })

  test('ADD_PANEL skips registry if panelRegistry missing', () => {
    const tmp = { ...state, panelRegistry: undefined }
    const payload = { id: 'panelY', config: { desktop: { initiallyOpen: true } } }
    const result = actionsMap.ADD_PANEL(tmp, payload)
    expect(result.panelConfig.panelY).toBeDefined()
    expect(result.openPanels.panelY).toBeDefined()
  })

  test('REMOVE_PANEL skips registry if panelRegistry missing', () => {
    const tmp = { ...state, panelRegistry: undefined }
    const result = actionsMap.REMOVE_PANEL(tmp, 'panel1')
    expect(result.openPanels.panel1).toBeUndefined()
  })

  test('ADD_CONTROL skips registry if controlRegistry missing', () => {
    const tmp = { ...state, controlRegistry: undefined }
    const payload = { id: 'ctrlX', config: { type: 'slider' } }
    const result = actionsMap.ADD_CONTROL(tmp, payload)
    expect(result.controlConfig.ctrlX).toBeDefined()
  })

  // ---------------------- buildOpenPanels FULL BRANCH COVERAGE ----------------------
  describe('buildOpenPanels via OPEN_PANEL', () => {
    test('exclusive true, modal false → skips filteredPanels', () => {
      const tmp = {
        ...state,
        panelConfig: { p1: { desktop: { exclusive: true, modal: false } } },
        openPanels: { p2: { props: {} } },
        breakpoint: 'desktop'
      }
      const res = actionsMap.OPEN_PANEL(tmp, { panelId: 'p1', props: { foo: 1 } })
      expect(res.openPanels).toEqual({ p1: { props: { foo: 1 } } })
    })

    test('exclusive false, modal false → filteredPanels included', () => {
      const tmp = {
        ...state,
        panelConfig: { p1: { desktop: { exclusive: false, modal: false } } },
        openPanels: { p2: { props: {} } },
        breakpoint: 'desktop'
      }
      const res = actionsMap.OPEN_PANEL(tmp, { panelId: 'p1', props: { foo: 2 } })
      expect(res.openPanels).toHaveProperty('p2')
      expect(res.openPanels).toHaveProperty('p1')
    })

    test('exclusive false, modal true → merges openPanels', () => {
      const tmp = {
        ...state,
        panelConfig: { p1: { desktop: { exclusive: false, modal: true } } },
        openPanels: { p2: { props: {} } },
        breakpoint: 'desktop'
      }
      const res = actionsMap.OPEN_PANEL(tmp, { panelId: 'p1', props: { foo: 3 } })
      expect(res.openPanels).toHaveProperty('p2')
      expect(res.openPanels).toHaveProperty('p1')
    })

    test('exclusive true, modal true → merges openPanels', () => {
      const tmp = {
        ...state,
        panelConfig: { p1: { desktop: { exclusive: true, modal: true } } },
        openPanels: { p2: { props: {} } },
        breakpoint: 'desktop'
      }
      const res = actionsMap.OPEN_PANEL(tmp, { panelId: 'p1', props: { foo: 4 } })
      expect(res.openPanels).toHaveProperty('p2')
      expect(res.openPanels).toHaveProperty('p1')
    })
  })
})
