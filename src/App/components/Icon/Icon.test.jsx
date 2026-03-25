// src/App/components/Icon/Icon.test.jsx
import React from 'react'
import { render } from '@testing-library/react'
import { Icon } from './Icon'
import { getIconRegistry } from '../../registry/iconRegistry.js'

jest.mock('../../registry/iconRegistry.js', () => ({
  getIconRegistry: jest.fn()
}))

describe('Icon component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders an svg element with default attributes', () => {
    getIconRegistry.mockReturnValue({ close: '<path d="M0 0 L10 10"/>' })
    const { container } = render(<Icon id='close' />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '24')
    expect(svg).toHaveAttribute('height', '24')
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    expect(svg).toHaveAttribute('fill', 'none')
    expect(svg).toHaveAttribute('stroke', 'currentColor')
    expect(svg).toHaveAttribute('stroke-width', '2')
    expect(svg).toHaveAttribute('stroke-linecap', 'round')
    expect(svg).toHaveAttribute('stroke-linejoin', 'round')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
  })

  it('renders the SVG from the registry when id is provided', () => {
    getIconRegistry.mockReturnValue({ close: '<path d="M0 0 L10 10"/>' })
    const { container } = render(<Icon id='close' />)
    expect(container.querySelector('svg').innerHTML)
      .toContain('<path d="M0 0 L10 10"')
  })

  it('falls back to svgContent if id not found in registry', () => {
    getIconRegistry.mockReturnValue({})
    const fallbackSVG = '<circle cx="5" cy="5" r="5"/>'
    const { container } = render(<Icon id='unknown' svgContent={fallbackSVG} />)
    expect(container.querySelector('svg').innerHTML)
      .toContain('<circle cx="5" cy="5" r="5"')
  })

  it('renders svgContent directly if no id provided', () => {
    const fallbackSVG = '<rect x="0" y="0" width="10" height="10"/>'
    getIconRegistry.mockReturnValue({})
    const { container } = render(<Icon svgContent={fallbackSVG} />)
    expect(container.querySelector('svg').innerHTML)
      .toContain('<rect x="0" y="0" width="10" height="10"')
  })

  it('uses registry icon if both id and svgContent provided', () => {
    getIconRegistry.mockReturnValue({ check: '<path d="M1 1 L5 5"/>' })
    const fallbackSVG = '<circle cx="5" cy="5" r="5"/>'
    const { container } = render(<Icon id='check' svgContent={fallbackSVG} />)
    expect(container.querySelector('svg').innerHTML)
      .toContain('<path d="M1 1 L5 5"')
  })

  it('uses chevron icon when isMenu is true', () => {
    getIconRegistry.mockReturnValue({
      chevron: '<path d="M2 2 L8 8"/>',
      close: '<path d="M0 0 L10 10"/>'
    })
    const { container } = render(<Icon id='close' isMenu />)
    expect(container.querySelector('svg').innerHTML).toContain('<path d="M2 2 L8 8"')
  })

  it('ignores id and svgContent when isMenu is true', () => {
    getIconRegistry.mockReturnValue({
      chevron: '<path d="M2 2 L8 8"/>'
    })
    const fallbackSVG = '<circle cx="5" cy="5" r="5"/>'
    const { container } = render(
      <Icon id='close' svgContent={fallbackSVG} isMenu />
    )
    expect(container.querySelector('svg').innerHTML).toContain('<path d="M2 2 L8 8"')
  })

  it('adds narrow class when isMenu is true', () => {
    getIconRegistry.mockReturnValue({
      chevron: '<path d="M2 2 L8 8"/>'
    })
    const { container } = render(<Icon isMenu />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('im-c-icon--narrow')
  })

  it('renders nothing if isMenu is true and chevron is missing', () => {
    getIconRegistry.mockReturnValue({})
    const { container } = render(<Icon isMenu />)
    expect(container.querySelector('svg').innerHTML).toBe('')
  })
})
