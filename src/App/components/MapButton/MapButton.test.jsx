import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MapButton } from './MapButton'

jest.mock('../../../utils/stringToKebab', () => ({
  stringToKebab: (str) => str ? str.replace(/\s+/g, '-').toLowerCase() : ''
}))

jest.mock('../Tooltip/Tooltip', () => ({
  Tooltip: ({ content, children }) => <div data-testid='tooltip' data-content={content}>{children}</div>
}))

jest.mock('../Icon/Icon', () => ({
  Icon: ({ id, svgContent }) => <svg data-testid={id || 'custom-icon'} data-svg={svgContent} aria-hidden='true' />
}))

jest.mock('../../renderer/SlotRenderer', () => ({
  SlotRenderer: ({ slot }) => <div data-testid='slot' data-slot={slot} />
}))

jest.mock('../../store/configContext', () => ({
  useConfig: () => ({ id: 'app' })
}))

const mockButtonRefs = { current: {} }
jest.mock('../../store/appContext', () => ({
  useApp: () => ({ buttonRefs: mockButtonRefs })
}))

describe('MapButton', () => {
  beforeEach(() => {
    mockButtonRefs.current = {}
  })

  const renderButton = (props = {}) =>
    render(<MapButton buttonId='Test' iconId='icon' label='Label' {...props} />)

  it('renders button with classes, icon, and label', () => {
    renderButton({ buttonId: 'My Button', variant: 'primary', showLabel: true })
    const button = screen.getByRole('button', { name: 'Label' })
    expect(button).toHaveClass('im-c-map-button', 'im-c-map-button--my-button', 'im-c-map-button--primary', 'im-c-map-button--with-label')
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Label')).toBeInTheDocument()
  })

  it('renders Icon with svgContent when provided', () => {
    renderButton({ iconId: null, iconSvgContent: '<circle />' })
    expect(screen.getByTestId('custom-icon')).toHaveAttribute('data-svg', '<circle />')
  })

  it('does not render Icon when neither iconId nor iconSvgContent provided', () => {
    renderButton({ iconId: null, iconSvgContent: null })
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('custom-icon')).not.toBeInTheDocument()
  })

  it('wraps in Tooltip when showLabel is false', () => {
    renderButton({ showLabel: false })
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-content', 'Label')
  })

  it('hides wrapper when isHidden is true', () => {
    const { container } = renderButton({ isHidden: true })
    expect(container.firstChild).toHaveStyle('display: none')
  })

  it.each([
    ['groupStart', 'im-c-button-wrapper--group-start'],
    ['groupMiddle', 'im-c-button-wrapper--group-middle'],
    ['groupEnd', 'im-c-button-wrapper--group-end']
  ])('applies %s class', (prop, className) => {
    const { container } = renderButton({ [prop]: true })
    expect(container.firstChild).toHaveClass(className)
  })

  it('applies all aria attributes with panelId', () => {
    renderButton({ panelId: 'Settings', idPrefix: 'prefix', isDisabled: true, isExpanded: true, isOpen: false })
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveAttribute('aria-controls', 'prefix-panel-settings')
    expect(screen.getByTestId('slot')).toHaveAttribute('data-slot', 'test-button')
  })

  it('sets aria-pressed true when isOpen is true', () => {
    renderButton({ panelId: 'Menu', idPrefix: 'prefix', isOpen: true })
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('uses isPressed when no panelId', () => {
    renderButton({ isPressed: 'true' })
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('omits aria-expanded when undefined', () => {
    renderButton({ isExpanded: undefined })
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-expanded')
  })

  it('fires onClick handler', () => {
    const handleClick = jest.fn()
    renderButton({ onClick: handleClick })
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })

  it('stores button ref when buttonId provided', () => {
    renderButton({ buttonId: 'TestButton' })
    expect(mockButtonRefs.current.TestButton).toBe(screen.getByRole('button'))
  })

  it('does not store ref when buttonRefs.current is falsy', () => {
    mockButtonRefs.current = null
    renderButton({ buttonId: 'Test' })
    // Should not throw
  })

  it('renders as anchor with href', () => {
    renderButton({ href: 'https://example.com' })
    const link = screen.getByRole('button')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it.each([[' '], ['Spacebar']])('triggers click when %s key pressed', (key) => {
    renderButton({ href: 'https://example.com' })
    const link = screen.getByRole('button')
    const clickSpy = jest.spyOn(link, 'click')
    fireEvent.keyUp(link, { key })
    expect(clickSpy).toHaveBeenCalled()
  })

  it('prevents default when Space pressed on anchor', () => {
    renderButton({ href: 'https://example.com' })
    const event = new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true })
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault')
    screen.getByRole('button').dispatchEvent(event)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('does not trigger click for non-space keys', () => {
    renderButton({ href: 'https://example.com' })
    const clickSpy = jest.spyOn(screen.getByRole('button'), 'click')
    fireEvent.keyUp(screen.getByRole('button'), { key: 'Enter' })
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('renders as button without href', () => {
    renderButton()
    const button = screen.getByRole('button')
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
  })
})
