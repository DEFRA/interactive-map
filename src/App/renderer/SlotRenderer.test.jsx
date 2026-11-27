import React from 'react'
import { render } from '@testing-library/react'
import { SlotRenderer } from './SlotRenderer.jsx'
import { useSlotItems } from './SlotItemsProvider.jsx'

jest.mock('./SlotItemsProvider.jsx', () => ({
  useSlotItems: jest.fn()
}))
// Actions reads the open panels from app state
jest.mock('../store/appContext', () => ({
  useApp: () => ({ breakpoint: 'desktop', openPanels: {}, panelConfig: {} })
}))

describe('SlotRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing if no slot items', () => {
    useSlotItems.mockReturnValue([])
    const { container } = render(<SlotRenderer slot='header' />)
    expect(container.firstChild).toBeNull()
  })

  it('wraps slot items in <Actions> for actions slot', () => {
    const items = [{ element: <div key='1'>Item1</div> }]
    useSlotItems.mockReturnValue(items)

    const { getByText } = render(<SlotRenderer slot='actions' />)
    expect(getByText('Item1')).toBeInTheDocument()
  })

  it('renders slot item elements for non-actions slot', () => {
    const items = [
      { element: <div key='1'>Item1</div> },
      { element: <span key='2'>Item2</span> }
    ]
    useSlotItems.mockReturnValue(items)

    const { getByText } = render(<SlotRenderer slot='header' />)
    expect(getByText('Item1')).toBeInTheDocument()
    expect(getByText('Item2')).toBeInTheDocument()
  })

  it('looks up the items for its own slot', () => {
    useSlotItems.mockReturnValue([])
    render(<SlotRenderer slot='sidebar' />)
    expect(useSlotItems).toHaveBeenCalledWith('sidebar')
  })
})
