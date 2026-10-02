import React from 'react'
import { render } from '@testing-library/react'
import { SlotRenderer } from './SlotRenderer.jsx'
import { getSlotItems } from './slotAggregator'
import { useApp } from '../store/appContext'
import { useConfig } from '../store/configContext'
import { useEvaluateProp } from '../hooks/useEvaluateProp'
import { useApplicationModeFilter } from '../hooks/useApplicationModeFilter.js'

jest.mock('./slotAggregator', () => ({
  getSlotItems: jest.fn()
}))
jest.mock('../store/appContext', () => ({
  useApp: jest.fn()
}))
jest.mock('../store/configContext', () => ({
  useConfig: jest.fn()
}))
jest.mock('../hooks/useEvaluateProp', () => ({
  useEvaluateProp: jest.fn()
}))
jest.mock('../hooks/useApplicationModeFilter.js', () => ({
  useApplicationModeFilter: jest.fn()
}))

describe('SlotRenderer', () => {
  const mockAppConfig = { id: 'testId' }
  const mockAppState = {
    breakpoint: 'desktop',
    mode: 'view',
    openPanels: {},
    dispatch: jest.fn(),
    disabledButtons: new Set()
  }
  const mockEvaluateProp = jest.fn(x => x)
  const mockIsHiddenByApplicationMode = jest.fn(() => false)

  beforeEach(() => {
    jest.clearAllMocks()
    useConfig.mockReturnValue(mockAppConfig)
    useApp.mockReturnValue(mockAppState)
    useEvaluateProp.mockReturnValue(mockEvaluateProp)
    useApplicationModeFilter.mockReturnValue(mockIsHiddenByApplicationMode)
  })

  it('renders nothing if no slot items', () => {
    getSlotItems.mockReturnValue([])
    const { container } = render(<SlotRenderer slot='header' />)
    expect(container.firstChild).toBeNull()
  })

  it('wraps slot items in <Actions> for actions slot', () => {
    const items = [{ element: <div key='1'>Item1</div> }]
    getSlotItems.mockReturnValue(items)

    const { getByText } = render(<SlotRenderer slot='actions' />)
    expect(getByText('Item1')).toBeInTheDocument()
  })

  it('renders slot item elements for non-actions slot', () => {
    const items = [
      { element: <div key='1'>Item1</div> },
      { element: <span key='2'>Item2</span> }
    ]
    getSlotItems.mockReturnValue(items)

    const { getByText } = render(<SlotRenderer slot='header' />)
    expect(getByText('Item1')).toBeInTheDocument()
    expect(getByText('Item2')).toBeInTheDocument()
  })

  it('calls getSlotItems with correct arguments including evaluateProp and the application mode filter', () => {
    getSlotItems.mockReturnValue([])
    render(<SlotRenderer slot='sidebar' />)
    expect(getSlotItems).toHaveBeenCalledWith({
      slot: 'sidebar',
      appState: mockAppState,
      appConfig: mockAppConfig,
      evaluateProp: mockEvaluateProp,
      isHiddenByApplicationMode: mockIsHiddenByApplicationMode
    })
  })
})
