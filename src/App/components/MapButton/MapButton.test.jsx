import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MapButton } from './MapButton'

jest.mock('../../../utils/stringToKebab', () => ({
  stringToKebab: (str) => (str ? str.replace(/\s+/g, '-').toLowerCase() : '')
}))

jest.mock('../Tooltip/Tooltip', () => ({
  Tooltip: ({ content, children }) => (
    <div data-testid='tooltip' data-content={content}>{children}</div>
  )
}))

jest.mock('../Icon/Icon', () => ({
  Icon: ({ id, svgContent }) => (
    <svg data-testid={id || 'custom-icon'} data-svg={svgContent} aria-hidden='true' />
  )
}))

jest.mock('../../renderer/SlotRenderer', () => ({
  SlotRenderer: ({ slot }) => <div data-testid='slot' data-slot={slot} />
}))

jest.mock('../PopupMenu/PopupMenu', () => ({
  PopupMenu: ({ startPos, items }) => {
    let selectedIndex = -1
    if (startPos === 'first' && items?.length > 0) {
      selectedIndex = 0
    }
    if (startPos === 'last' && items?.length > 0) {
      selectedIndex = items.length - 1
    }
    return <div data-testid='popup-menu' data-start-pos={String(startPos)} data-selected-index={String(selectedIndex)}>{items?.map((item, i) => <div key={i} data-testid={`menu-item-${i}`}>{item.label}</div>)}</div>
  }
}))

jest.mock('../../store/configContext', () => ({ useConfig: () => ({ id: 'app' }) }))

const mockButtonRefs = { current: {} }
jest.mock('../../store/appContext', () => ({ useApp: () => ({ buttonRefs: mockButtonRefs }) }))

describe('MapButton', () => {
  beforeEach(() => { mockButtonRefs.current = {} })

  const renderButton = (props = {}) => render(<MapButton buttonId='Test' iconId='icon' label='Label' {...props} />)
  const getButton = () => screen.getByRole('button')

  it.each([
    [{ buttonId: 'My Button', variant: 'primary', showLabel: true }, ['im-c-map-button', 'im-c-map-button--my-button', 'im-c-map-button--primary', 'im-c-map-button--with-label']],
    [{ iconId: null, iconSvgContent: '<circle />' }, []]
  ])('renders button variations and classes', (props, expectedClasses) => {
    renderButton(props)
    const button = getButton()
    expectedClasses.forEach(cls => expect(button).toHaveClass(cls))
    if (props.iconSvgContent) expect(screen.getByTestId('custom-icon')).toHaveAttribute('data-svg', props.iconSvgContent)
  })

  it('wraps in Tooltip when showLabel is false', () => {
    renderButton({ showLabel: false })
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-content', 'Label')
  })

  it('hides wrapper when isHidden', () => {
    const { container } = renderButton({ isHidden: true })
    expect(container.firstChild).toHaveStyle('display: none')
  })

  it.each([
    ['groupStart', 'im-c-button-wrapper--group-start'],
    ['groupMiddle', 'im-c-button-wrapper--group-middle'],
    ['groupEnd', 'im-c-button-wrapper--group-end']
  ])('applies wrapper %s class', (prop, className) => {
    const { container } = renderButton({ [prop]: true })
    expect(container.firstChild).toHaveClass(className)
  })

  it('handles panelId aria attributes', () => {
    renderButton({ panelId: 'Settings', idPrefix: 'prefix', isDisabled: true, isPanelOpen: false })
    const button = getButton()
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).not.toHaveAttribute('aria-pressed')
    expect(button).toHaveAttribute('aria-controls', 'prefix-panel-settings')
    expect(screen.getByTestId('slot')).toHaveAttribute('data-slot', 'test-button')
  })

  it.each([
    [{ isPressed: true }, 'true'],
    [{ isPressed: 'true' }, undefined]
  ])('sets aria-pressed correctly', (props, expected) => {
    renderButton(props)
    const button = getButton()
    if (expected) expect(button).toHaveAttribute('aria-pressed', expected)
    else expect(button).not.toHaveAttribute('aria-pressed')
  })

  it('sets aria-expanded when no panelId and isExpanded', () => {
    renderButton({ isExpanded: true })
    expect(getButton()).toHaveAttribute('aria-expanded', 'true')
  })

  it('handles click events', () => {
    const onClick = jest.fn()
    renderButton({ onClick })
    fireEvent.click(getButton())
    expect(onClick).toHaveBeenCalled()
  })

  it('does not fire onClick or open popup when disabled', () => {
    const onClick = jest.fn()
    renderButton({ isDisabled: true, menuItems: [{ label: 'Item' }], onClick })
    fireEvent.click(getButton())
    expect(onClick).not.toHaveBeenCalled()
    expect(screen.queryByTestId('popup-menu')).not.toBeInTheDocument()
  })

  it('stores button refs correctly', () => {
    renderButton({ buttonId: 'TestButton' })
    expect(mockButtonRefs.current.TestButton).toBe(getButton())
  })

  it('does not store ref if buttonId falsy', () => {
    render(<MapButton buttonId={null} iconId='icon' label='Label' />)
    expect(mockButtonRefs.current).toEqual({})
  })

  it('handles popup aria attributes', () => {
    renderButton({ idPrefix: 'prefix', menuItems: [{ label: 'Item' }] })
    const button = getButton()
    expect(button).toHaveAttribute('aria-controls', 'prefix-popup-test')
    expect(button).toHaveAttribute('aria-haspopup', 'true')
  })

  it('toggles popup aria-expanded and startPos', () => {
    renderButton({ menuItems: [{ label: 'Item' }] })
    const button = getButton()

    expect(button).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('popup-menu')).toHaveAttribute('data-start-pos', 'null')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it.each([
    ['ArrowDown', 'first', 0],
    ['ArrowUp', 'last', 1]
  ])('keyboard menu navigation %s', (key, expectedPos, expectedIndex) => {
    renderButton({ menuItems: [{ label: 'One' }, { label: 'Two' }] })
    fireEvent.keyUp(getButton(), { key })
    const menu = screen.getByTestId('popup-menu')
    expect(menu).toHaveAttribute('data-start-pos', expectedPos)
    expect(menu).toHaveAttribute('data-selected-index', String(expectedIndex))
  })

  it('does nothing for arrow keys when no menu', () => {
    renderButton()
    fireEvent.keyUp(getButton(), { key: 'ArrowDown' })
    expect(screen.queryByTestId('popup-menu')).not.toBeInTheDocument()
  })

  it('does nothing for unrelated keys', () => {
    renderButton({ menuItems: [{ label: 'Item' }] })
    fireEvent.keyUp(getButton(), { key: 'Enter' })
    expect(screen.queryByTestId('popup-menu')).not.toBeInTheDocument()
  })

  it.each([
    ['https://example.com', 'A'],
    [null, 'BUTTON']
  ])('renders as anchor or button', (href, tag) => {
    renderButton({ href })
    const el = getButton()
    expect(el.tagName).toBe(tag)
    if (href) {
      expect(el).toHaveAttribute('href', href)
      expect(el).toHaveAttribute('target', '_blank')
    } else expect(el).toHaveAttribute('type', 'button')
  })

  it.each([[' '], ['Spacebar']])('triggers click on anchor key %s', (key) => {
    renderButton({ href: 'https://example.com' })
    const el = getButton()
    const spy = jest.spyOn(el, 'click')
    fireEvent.keyUp(el, { key })
    expect(spy).toHaveBeenCalled()
  })

  it('does not trigger click for other keys on anchor', () => {
    renderButton({ href: 'https://example.com' })
    const el = getButton()
    const spy = jest.spyOn(el, 'click')
    fireEvent.keyUp(el, { key: 'Enter' })
    expect(spy).not.toHaveBeenCalled()
  })
})
