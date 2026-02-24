// src/plugins/search/OpenButton.test.jsx

import { render, screen, fireEvent } from '@testing-library/react'
import { OpenButton } from './OpenButton'

describe('OpenButton', () => {
  const baseProps = {
    id: 'test',
    isExpanded: false,
    onClick: jest.fn(),
    buttonRef: { current: null },
    searchIcon: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the button with correct ARIA attributes and calls onClick', () => {
    render(<OpenButton {...baseProps} />)
    const button = screen.getByRole('button', { name: /open search/i })
    expect(button).toHaveAttribute('aria-controls', 'test-search-form')
    fireEvent.click(button)
    expect(baseProps.onClick).toHaveBeenCalledTimes(1)
  })

  it('applies display:none when isExpanded is true', () => {
    render(<OpenButton {...baseProps} isExpanded />)
    const button = screen.getByLabelText('Open search')
    expect(button).toHaveStyle({ display: 'none' })
  })

  it('renders the search icon SVG when searchIcon is provided', () => {
    const svgContent = '<path d="M1 1L23 23" />'
    const { container } = render(
      <OpenButton {...baseProps} searchIcon={svgContent} />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg.innerHTML).toContain('M1 1L23 23')
  })

  it('does not render an SVG when searchIcon is not provided', () => {
    const { container } = render(<OpenButton {...baseProps} />)
    expect(container.querySelector('svg')).toBeNull()
  })
})