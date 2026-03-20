// src/plugins/search/components/CloseButton/CloseButton.test.jsx

import { render, screen, fireEvent } from '@testing-library/react'
import { CloseButton } from './CloseButton'

describe('CloseButton', () => {
  it('renders the button and calls onClick', () => {
    const onClick = jest.fn()

    render(
      <CloseButton
        defaultExpanded={false}
        onClick={onClick}
        closeIcon={null}
      />
    )

    fireEvent.click(
      screen.getByRole('button', { name: /close search/i })
    )

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies display:none when defaultExpanded is true', () => {
    render(
      <CloseButton
        defaultExpanded
        onClick={jest.fn()}
        closeIcon={null}
      />
    )

    const button = screen.getByLabelText('Close search', {
      selector: 'button'
    })

    expect(button).toHaveStyle({ display: 'none' })
  })

  it('renders the close icon SVG when closeIcon is provided', () => {
    const svgContent = '<path d="M1 1L23 23" />'
    const { container } = render(
      <CloseButton
        defaultExpanded={false}
        onClick={jest.fn()}
        closeIcon={svgContent}
      />
    )

    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg.innerHTML).toContain('M1 1L23 23')
  })

  it('does not render an svg when closeIcon is not provided', () => {
    const { container } = render(
      <CloseButton
        defaultExpanded={false}
        onClick={jest.fn()}
        closeIcon={null}
      />
    )

    expect(container.querySelector('svg')).toBeNull()
  })
})
