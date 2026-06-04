import React from 'react'
import { renderHook } from '@testing-library/react'
import { useContinueEnabledEvaluator } from './useContinueEnabledEvaluator.js'
import { PluginContext } from '../store/PluginProvider.jsx'
import * as configStore from '../store/configContext.js'
import * as appStore from '../store/appContext.js'
import * as mapStore from '../store/mapContext.js'

jest.mock('../store/configContext.js', () => ({ useConfig: jest.fn() }))
jest.mock('../store/appContext.js', () => ({ useApp: jest.fn() }))
jest.mock('../store/mapContext.js', () => ({ useMap: jest.fn() }))

const pluginStates = { interact: { selectedFeatures: ['f1', 'f2'] } }
const mockMapState = { zoom: 10, center: [0, 0] }

const wrapper = ({ children }) => (
  <PluginContext.Provider value={{ state: pluginStates, dispatch: jest.fn() }}>
    {children}
  </PluginContext.Provider>
)

let dispatch

beforeEach(() => {
  jest.clearAllMocks()
  dispatch = jest.fn()
  appStore.useApp.mockReturnValue({ dispatch })
  mapStore.useMap.mockReturnValue(mockMapState)
})

describe('useContinueEnabledEvaluator — no-op cases', () => {
  it('does nothing when continueEnabledWhen is not provided', () => {
    configStore.useConfig.mockReturnValue({ backAndContinue: { continueLabel: 'Continue' } })
    renderHook(() => useContinueEnabledEvaluator(), { wrapper })
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does nothing when backAndContinue is null', () => {
    configStore.useConfig.mockReturnValue({ backAndContinue: null })
    renderHook(() => useContinueEnabledEvaluator(), { wrapper })
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('useContinueEnabledEvaluator — dispatching', () => {
  it('dispatches enable on first render when continueEnabledWhen returns true', () => {
    configStore.useConfig.mockReturnValue({
      backAndContinue: { continueEnabledWhen: ({ pluginStates: ps }) => ps.interact.selectedFeatures.length > 1 }
    })
    renderHook(() => useContinueEnabledEvaluator(), { wrapper })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_BUTTON_DISABLED',
      payload: { id: 'journeyContinue', isDisabled: false }
    })
  })

  it('does not dispatch on first render when continueEnabledWhen returns false (already disabled)', () => {
    configStore.useConfig.mockReturnValue({
      backAndContinue: { continueEnabledWhen: () => false }
    })
    renderHook(() => useContinueEnabledEvaluator(), { wrapper })
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('dispatches disable after button was enabled', () => {
    let enabled = true
    configStore.useConfig.mockReturnValue({
      backAndContinue: { continueEnabledWhen: () => enabled }
    })
    const { rerender } = renderHook(() => useContinueEnabledEvaluator(), { wrapper })
    dispatch.mockClear()
    enabled = false
    rerender()
    expect(dispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_BUTTON_DISABLED',
      payload: { id: 'journeyContinue', isDisabled: true }
    })
  })

  it('does not dispatch again if the enabled state has not changed', () => {
    configStore.useConfig.mockReturnValue({
      backAndContinue: { continueEnabledWhen: () => true }
    })
    const { rerender } = renderHook(() => useContinueEnabledEvaluator(), { wrapper })
    dispatch.mockClear()
    rerender()
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('useContinueEnabledEvaluator — no PluginContext', () => {
  it('passes empty pluginStates when PluginContext is not provided', () => {
    const continueEnabledWhen = jest.fn(() => true)
    configStore.useConfig.mockReturnValue({ backAndContinue: { continueEnabledWhen } })
    renderHook(() => useContinueEnabledEvaluator())
    expect(continueEnabledWhen).toHaveBeenCalledWith({ pluginStates: {}, mapState: mockMapState })
  })
})

describe('useContinueEnabledEvaluator — error handling and context', () => {
  it('warns and leaves button disabled if continueEnabledWhen throws on first render', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    configStore.useConfig.mockReturnValue({
      backAndContinue: { continueEnabledWhen: () => { throw new Error('oops') } }
    })
    renderHook(() => useContinueEnabledEvaluator(), { wrapper })
    expect(console.warn).toHaveBeenCalledWith('continueEnabledWhen error:', expect.any(Error))
    expect(dispatch).not.toHaveBeenCalled()
    console.warn.mockRestore()
  })

  it('passes pluginStates and mapState to continueEnabledWhen', () => {
    const continueEnabledWhen = jest.fn(() => true)
    configStore.useConfig.mockReturnValue({ backAndContinue: { continueEnabledWhen } })
    renderHook(() => useContinueEnabledEvaluator(), { wrapper })
    expect(continueEnabledWhen).toHaveBeenCalledWith({ pluginStates, mapState: mockMapState })
  })
})
