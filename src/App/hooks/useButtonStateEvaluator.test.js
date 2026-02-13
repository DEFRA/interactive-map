import { renderHook } from '@testing-library/react'
import { useButtonStateEvaluator } from './useButtonStateEvaluator'
import { useApp } from '../store/appContext.js'
import { useConfig } from '../store/configContext.js'
import { registeredPlugins } from '../registry/pluginRegistry.js'
import { useContext } from 'react'

jest.mock('../store/appContext.js')
jest.mock('../store/configContext.js')
jest.mock('react', () => ({ ...jest.requireActual('react'), useContext: jest.fn() }))
jest.mock('../registry/pluginRegistry.js', () => ({ registeredPlugins: [] }))

describe('useButtonStateEvaluator', () => {
  let mockAppState, mockDispatch, mockPluginRegistry

  beforeEach(() => {
    jest.clearAllMocks()
    mockDispatch = jest.fn()
    mockPluginRegistry = { registeredPlugins: [] }
    mockAppState = {
      disabledButtons: new Set(),
      hiddenButtons: new Set(),
      pressedButtons: new Set(),
      dispatch: mockDispatch
    }
    useApp.mockReturnValue(mockAppState)
    useConfig.mockReturnValue({ pluginRegistry: mockPluginRegistry })
    useContext.mockReturnValue({}) // PluginContext
    registeredPlugins.length = 0
    jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => console.warn.mockRestore())

  it('returns early when appState or pluginContext is missing', () => {
    useApp.mockReturnValue(null)
    useContext.mockReturnValue({})
    renderHook(() => useButtonStateEvaluator(() => true))
    expect(mockDispatch).not.toHaveBeenCalled()

    useApp.mockReturnValue(mockAppState)
    useContext.mockReturnValue(null)
    renderHook(() => useButtonStateEvaluator(() => true))
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('handles plugins with missing manifest or buttons', () => {
    registeredPlugins.push({ id: 'p1' }, { id: 'p2', manifest: {} })
    renderHook(() => useButtonStateEvaluator(() => true))
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('toggles button disabled state based on enableWhen', () => {
    mockPluginRegistry.registeredPlugins = [{
      id: 'p1',
      manifest: { buttons: [{ id: 'btn1', enableWhen: () => false }] }
    }]

    renderHook(() => useButtonStateEvaluator((fn) => fn()))
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_BUTTON_DISABLED',
      payload: { id: 'btn1', isDisabled: true }
    })
  })

  it('toggles button hidden state based on hiddenWhen', () => {
    mockPluginRegistry.registeredPlugins = [{
      id: 'p1',
      manifest: { buttons: [{ id: 'btn1', hiddenWhen: () => true }] }
    }]

    renderHook(() => useButtonStateEvaluator((fn) => fn()))
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_BUTTON_HIDDEN',
      payload: { id: 'btn1', isHidden: true }
    })
  })

  it('toggles button pressed state based on pressedWhen', () => {
    mockPluginRegistry.registeredPlugins = [{
      id: 'p1',
      manifest: { buttons: [{ id: 'btn1', pressedWhen: () => true }] }
    }]

    renderHook(() => useButtonStateEvaluator((fn) => fn()))
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_BUTTON_PRESSED',
      payload: { id: 'btn1', isPressed: true }
    })
  })

  it('does not dispatch if state already matches', () => {
    mockAppState.disabledButtons.add('btn1')
    mockAppState.hiddenButtons.add('btn2')
    mockAppState.pressedButtons.add('btn3')

    mockPluginRegistry.registeredPlugins = [
      { id: 'p1', manifest: { buttons: [{ id: 'btn1', enableWhen: () => false }] } },
      { id: 'p2', manifest: { buttons: [{ id: 'btn2', hiddenWhen: () => true }] } },
      { id: 'p3', manifest: { buttons: [{ id: 'btn3', pressedWhen: () => true }] } }
    ]

    renderHook(() => useButtonStateEvaluator((fn) => fn()))
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('passes pluginId to evaluateProp and catches errors', () => {
    const failingFn = () => { throw new Error('fail') }
    mockPluginRegistry.registeredPlugins = [{
      id: 'p1',
      manifest: {
        buttons: [
          { id: 'btn1', enableWhen: failingFn },
          { id: 'btn2', hiddenWhen: failingFn },
          { id: 'btn3', pressedWhen: failingFn }
        ]
      }
    }]

    renderHook(() => useButtonStateEvaluator((fn, pluginId) => fn(pluginId)))
    expect(console.warn).toHaveBeenCalledTimes(3)
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('provides empty plugin state if context missing', () => {
    useContext.mockReturnValue({ state: {} })
    const enableWhen = jest.fn()
    mockPluginRegistry.registeredPlugins = [{ id: 'p1', manifest: { buttons: [{ id: 'btn1', enableWhen }] } }]

    renderHook(() => useButtonStateEvaluator((fn) => fn({ pluginState: {} })))
    expect(enableWhen).toHaveBeenCalled()
  })

  it('covers fallback to empty array when manifest or buttons is missing', () => {
    // Branch 1: Plugin exists but manifest is missing
    // Branch 2: Manifest exists but buttons is missing
    mockPluginRegistry.registeredPlugins = [
      { id: 'p1' },
      { id: 'p2', manifest: {} },
      { id: 'p3', manifest: { buttons: null } }
    ]

    renderHook(() => useButtonStateEvaluator((fn) => fn()))

    // If the fallback (|| []) works, the code continues to the next plugin
    // without throwing a "cannot read property forEach of undefined" error.
    expect(mockDispatch).not.toHaveBeenCalled()
  })
})
