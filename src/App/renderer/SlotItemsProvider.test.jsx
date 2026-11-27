import React from 'react'
import { render } from '@testing-library/react'
import { SlotItemsProvider, useSlotItems } from './SlotItemsProvider.jsx'
import { getItemsBySlot } from './slotAggregator.js'
import { useApp } from '../store/appContext.js'
import { useConfig } from '../store/configContext.js'
import { useEvaluateProp } from '../hooks/useEvaluateProp.js'
import { useApplicationModeFilter } from '../hooks/useApplicationModeFilter.js'

jest.mock('./slotAggregator.js', () => ({ getItemsBySlot: jest.fn() }))
jest.mock('../store/appContext.js', () => ({ useApp: jest.fn() }))
jest.mock('../store/configContext.js', () => ({ useConfig: jest.fn() }))
jest.mock('../hooks/useEvaluateProp.js', () => ({ useEvaluateProp: jest.fn() }))
jest.mock('../hooks/useApplicationModeFilter.js', () => ({ useApplicationModeFilter: jest.fn() }))

const SlotIds = ({ slot }) => <div data-testid={slot}>{useSlotItems(slot).map(item => item.id).join(',')}</div>

describe('SlotItemsProvider', () => {
  const appConfig = { id: 'test' }
  const appState = { breakpoint: 'desktop' }
  const evaluateProp = jest.fn()
  const isHiddenByApplicationMode = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    useConfig.mockReturnValue(appConfig)
    useApp.mockReturnValue(appState)
    useEvaluateProp.mockReturnValue(evaluateProp)
    useApplicationModeFilter.mockReturnValue(isHiddenByApplicationMode)
    getItemsBySlot.mockReturnValue(new Map([['header', [{ id: 'a' }, { id: 'b' }]]]))
  })

  it('builds every slot\'s items once per render, however many slots read them', () => {
    render(
      <SlotItemsProvider>
        <SlotIds slot='header' />
        <SlotIds slot='banner' />
      </SlotItemsProvider>
    )
    expect(getItemsBySlot).toHaveBeenCalledTimes(1)
    expect(getItemsBySlot).toHaveBeenCalledWith({ appConfig, appState, evaluateProp, isHiddenByApplicationMode })
  })

  it('gives each slot its own items, and none to a slot with no items', () => {
    const { getByTestId } = render(
      <SlotItemsProvider>
        <SlotIds slot='header' />
        <SlotIds slot='banner' />
      </SlotItemsProvider>
    )
    expect(getByTestId('header')).toHaveTextContent('a,b')
    expect(getByTestId('banner')).toBeEmptyDOMElement()
  })

  it('gives no items outside a provider', () => {
    const { getByTestId } = render(<SlotIds slot='header' />)
    expect(getByTestId('header')).toBeEmptyDOMElement()
  })
})
