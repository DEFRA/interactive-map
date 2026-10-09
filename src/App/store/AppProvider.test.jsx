import React from 'react'
import { render, act } from '@testing-library/react'
import { AppProvider, AppContext } from './AppProvider.jsx'
import { createMockRegistries } from '../../test-utils.js'
import * as mediaHook from '../hooks/useMediaQueryDispatch.js'
import * as detectInterface from '../../utils/detectInterfaceType.js'
import * as appReducerModule from './appReducer.js'

jest.mock('../hooks/useMediaQueryDispatch.js')
jest.mock('../../utils/detectInterfaceType.js')

describe('AppProvider', () => {
  let mockOptions
  let mockBreakpointDetector

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }))
    })
  })

  beforeEach(() => {
    const registries = createMockRegistries({
      panelConfig: { panel1: {} },
      buttonConfig: { save: { label: 'Save' } }
    })

    const mockEventBus = {
      on: jest.fn(),
      off: jest.fn()
    }

    mockBreakpointDetector = {
      subscribe: jest.fn(() => jest.fn()),
      getBreakpoint: jest.fn(() => 'desktop'),
      destroy: jest.fn()
    }

    mockOptions = {
      ...registries,
      eventBus: mockEventBus,
      breakpointDetector: mockBreakpointDetector
    }

    mediaHook.useMediaQueryDispatch.mockImplementation(() => {})
    detectInterface.subscribeToInterfaceChanges.mockImplementation(() => jest.fn())
  })

  test('renders children and calls config hooks', () => {
    const { getByText } = render(
      <AppProvider options={mockOptions}>
        <div>ChildContent</div>
      </AppProvider>
    )
    expect(getByText('ChildContent')).toBeInTheDocument()
    expect(mockOptions.panelRegistry.getPanelConfig).toHaveBeenCalled()
    expect(mockOptions.buttonRegistry.getButtonConfig).toHaveBeenCalled()
    expect(mediaHook.useMediaQueryDispatch).toHaveBeenCalled()
  })

  test('handles breakpoint and interface callbacks', () => {
    let breakpointCb, interfaceCb
    mockBreakpointDetector.subscribe.mockImplementation(cb => { breakpointCb = cb; return jest.fn() })
    detectInterface.subscribeToInterfaceChanges.mockImplementation(cb => { interfaceCb = cb; return jest.fn() })

    render(<AppProvider options={mockOptions}><div>Child</div></AppProvider>)

    act(() => {
      breakpointCb('sm')
      interfaceCb('mobile')
    })

    expect(mockBreakpointDetector.subscribe).toHaveBeenCalledWith(expect.any(Function))
    expect(detectInterface.subscribeToInterfaceChanges).toHaveBeenCalledWith(expect.any(Function))
  })

  test('provides state, dispatch, and layoutRefs via context', () => {
    let contextValue
    render(
      <AppProvider options={mockOptions}>
        <AppContext.Consumer>
          {value => { contextValue = value; return null }}
        </AppContext.Consumer>
      </AppProvider>
    )

    expect(contextValue).toHaveProperty('dispatch')
    expect(contextValue).toHaveProperty('applicationModeEntries')
    expect(contextValue).toHaveProperty('openPanels')
    expect(contextValue.layoutRefs).toHaveProperty('mainRef')
    expect(contextValue.layoutRefs).toHaveProperty('bottomRef')
  })

  test('dispatch fallback uses options.panelRegistry.getPanelConfig() when state.panelConfig missing', () => {
    const getPanelConfigMock = jest.fn(() => ({ panel1: {} }))

    // Mock initialState to return state without panelConfig but with panelRegistry
    jest.spyOn(appReducerModule, 'initialState').mockImplementation(() => ({
      openPanels: {},
      previousOpenPanels: {},
      interfaceType: 'default',
      isFullscreen: false,
      applicationModeEntries: [],
      panelRegistry: { getPanelConfig: getPanelConfigMock } // <-- provide it here!
    }))

    const mockEventBus = { on: jest.fn(), off: jest.fn() }
    const mockBreakpointDetector = { subscribe: jest.fn(() => jest.fn()) }
    let interfaceChangeCallback
    detectInterface.subscribeToInterfaceChanges.mockImplementation((callback) => { interfaceChangeCallback = callback; return jest.fn() })
    const mockOptions = {
      ...createMockRegistries({ panelConfig: undefined }),
      eventBus: mockEventBus,
      breakpointDetector: mockBreakpointDetector
    }

    render(
      <AppProvider options={mockOptions}>
        <div>Child</div>
      </AppProvider>
    )

    // Trigger a dispatch (an interface type change) to hit the dispatch wrapper
    const optionsGetPanelConfig = jest.spyOn(mockOptions.panelRegistry, 'getPanelConfig')
    act(() => interfaceChangeCallback('touch'))

    expect(optionsGetPanelConfig).toHaveBeenCalled()
  })
})
