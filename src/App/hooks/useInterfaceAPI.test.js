import { renderHook, act } from '@testing-library/react'
import { useInterfaceAPI } from './useInterfaceAPI.js'
import { useApp } from '../store/appContext.js'
import { useService } from '../store/serviceContext.js'

jest.mock('../store/appContext.js')
jest.mock('../store/serviceContext.js')

const makeEventBus = () => {
  const handlers = {}
  return {
    on: jest.fn((event, handler) => { handlers[event] = handler }),
    off: jest.fn(),
    emit: (event, payload) => handlers[event]?.(payload),
    _handlers: handlers
  }
}

describe('useInterfaceAPI', () => {
  let mockDispatch, mockEventBus, mockState

  beforeEach(() => {
    mockDispatch = jest.fn()
    mockEventBus = makeEventBus()
    mockState = {
      hiddenButtons: new Set(),
      disabledButtons: new Set(),
      pressedButtons: new Set(),
      expandedButtons: new Set()
    }

    useApp.mockReturnValue({ dispatch: mockDispatch, ...mockState })
    useService.mockReturnValue({ eventBus: mockEventBus })
  })

  it('dispatches ADD_BUTTON on app:addbutton', () => {
    renderHook(() => useInterfaceAPI())
    act(() => mockEventBus.emit('app:addbutton', { id: 'btn1', config: { label: 'Test' } }))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'ADD_BUTTON', payload: { id: 'btn1', config: { label: 'Test' } } })
  })

  it('also dispatches ADD_BUTTON for each menuItem', () => {
    renderHook(() => useInterfaceAPI())
    act(() => mockEventBus.emit('app:addbutton', {
      id: 'btn1',
      config: {
        label: 'Parent',
        menuItems: [
          { id: 'item1', label: 'Item 1' },
          { id: 'item2', label: 'Item 2' }
        ]
      }
    }))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'ADD_BUTTON', payload: { id: 'btn1', config: expect.objectContaining({ label: 'Parent' }) } })
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'ADD_BUTTON', payload: { id: 'item1', config: { id: 'item1', label: 'Item 1', isMenuItem: true } } })
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'ADD_BUTTON', payload: { id: 'item2', config: { id: 'item2', label: 'Item 2', isMenuItem: true } } })
  })

  it('dispatches TOGGLE_APP_VISIBLE true on app:opened', () => {
    renderHook(() => useInterfaceAPI())
    act(() => mockEventBus.emit('app:opened'))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_APP_VISIBLE', payload: true })
  })

  it('dispatches TOGGLE_APP_VISIBLE false on app:closed', () => {
    renderHook(() => useInterfaceAPI())
    act(() => mockEventBus.emit('app:closed'))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_APP_VISIBLE', payload: false })
  })

  it('dispatches ADD_PANEL on app:addpanel', () => {
    renderHook(() => useInterfaceAPI())
    act(() => mockEventBus.emit('app:addpanel', { id: 'panel1', config: { title: 'My Panel' } }))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'ADD_PANEL', payload: { id: 'panel1', config: { title: 'My Panel' } } })
  })

  it('dispatches REMOVE_PANEL on app:removepanel', () => {
    renderHook(() => useInterfaceAPI())
    act(() => mockEventBus.emit('app:removepanel', 'panel1'))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'REMOVE_PANEL', payload: 'panel1' })
  })

  it('dispatches OPEN_PANEL on app:showpanel', () => {
    renderHook(() => useInterfaceAPI())
    act(() => mockEventBus.emit('app:showpanel', 'panel1'))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_PANEL', payload: { panelId: 'panel1' } })
  })

  it('dispatches CLOSE_PANEL on app:hidepanel', () => {
    renderHook(() => useInterfaceAPI())
    act(() => mockEventBus.emit('app:hidepanel', 'panel1'))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLOSE_PANEL', payload: 'panel1' })
  })

  it('dispatches ADD_CONTROL on app:addcontrol', () => {
    renderHook(() => useInterfaceAPI())
    act(() => mockEventBus.emit('app:addcontrol', { id: 'ctrl1', config: { position: 'top-left' } }))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'ADD_CONTROL', payload: { id: 'ctrl1', config: { position: 'top-left' } } })
  })

  describe('handleToggleButtonState', () => {
    it.each([
      ['hidden', 'TOGGLE_BUTTON_HIDDEN', 'isHidden'],
      ['disabled', 'TOGGLE_BUTTON_DISABLED', 'isDisabled'],
      ['pressed', 'TOGGLE_BUTTON_PRESSED', 'isPressed'],
      ['expanded', 'TOGGLE_BUTTON_EXPANDED', 'isExpanded']
    ])('sets %s to explicit boolean value when provided', (prop, actionType, payloadKey) => {
      renderHook(() => useInterfaceAPI())
      act(() => mockEventBus.emit('app:togglebuttonstate', { id: 'btn1', prop, value: true }))
      expect(mockDispatch).toHaveBeenCalledWith({ type: actionType, payload: { id: 'btn1', [payloadKey]: true } })

      mockDispatch.mockClear()
      act(() => mockEventBus.emit('app:togglebuttonstate', { id: 'btn1', prop, value: false }))
      expect(mockDispatch).toHaveBeenCalledWith({ type: actionType, payload: { id: 'btn1', [payloadKey]: false } })
    })

    it.each([
      ['hidden', 'TOGGLE_BUTTON_HIDDEN', 'isHidden', 'hiddenButtons'],
      ['disabled', 'TOGGLE_BUTTON_DISABLED', 'isDisabled', 'disabledButtons'],
      ['pressed', 'TOGGLE_BUTTON_PRESSED', 'isPressed', 'pressedButtons'],
      ['expanded', 'TOGGLE_BUTTON_EXPANDED', 'isExpanded', 'expandedButtons']
    ])('toggles %s when no boolean value provided', (prop, actionType, payloadKey, stateKey) => {
      renderHook(() => useInterfaceAPI())

      // Not in set → toggles to true
      act(() => mockEventBus.emit('app:togglebuttonstate', { id: 'btn1', prop }))
      expect(mockDispatch).toHaveBeenCalledWith({ type: actionType, payload: { id: 'btn1', [payloadKey]: true } })

      // Already in set → toggles to false
      mockDispatch.mockClear()
      mockState[stateKey].add('btn1')
      act(() => mockEventBus.emit('app:togglebuttonstate', { id: 'btn1', prop }))
      expect(mockDispatch).toHaveBeenCalledWith({ type: actionType, payload: { id: 'btn1', [payloadKey]: false } })
    })

    it('does nothing for unknown prop', () => {
      renderHook(() => useInterfaceAPI())
      act(() => mockEventBus.emit('app:togglebuttonstate', { id: 'btn1', prop: 'unknown', value: true }))
      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  it('removes all event listeners on unmount', () => {
    const { unmount } = renderHook(() => useInterfaceAPI())
    unmount()
    expect(mockEventBus.off).toHaveBeenCalledWith('app:opened', expect.any(Function))
    expect(mockEventBus.off).toHaveBeenCalledWith('app:closed', expect.any(Function))
    expect(mockEventBus.off).toHaveBeenCalledWith('app:addbutton', expect.any(Function))
    expect(mockEventBus.off).toHaveBeenCalledWith('app:togglebuttonstate', expect.any(Function))
    expect(mockEventBus.off).toHaveBeenCalledWith('app:addpanel', expect.any(Function))
    expect(mockEventBus.off).toHaveBeenCalledWith('app:removepanel', expect.any(Function))
    expect(mockEventBus.off).toHaveBeenCalledWith('app:showpanel', expect.any(Function))
    expect(mockEventBus.off).toHaveBeenCalledWith('app:hidepanel', expect.any(Function))
    expect(mockEventBus.off).toHaveBeenCalledWith('app:addcontrol', expect.any(Function))
  })
})
