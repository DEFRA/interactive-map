// src/plugins/search/components/SubmitButton/SubmitButton.test.jsx

import { render, screen } from '@testing-library/react'
import { SubmitButton } from './SubmitButton'

describe('SubmitButton', () => {
  it('renders a submit button with the correct aria-label', () => {
    render(<SubmitButton defaultExpanded />)
    const button = screen.getByRole('button', { name: 'Search' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('hides the button when defaultExpanded is false', () => {
    const { container } = render(<SubmitButton defaultExpanded={false} />)
    expect(container.querySelector('button')).toHaveStyle({ display: 'none' })
  })

  it('shows the button when defaultExpanded is true', () => {
    render(<SubmitButton defaultExpanded />)
    expect(screen.getByRole('button', { name: 'Search' })).not.toHaveStyle({ display: 'none' })
  })

  it('renders an svg when submitIcon is provided', () => {
    const { container } = render(<SubmitButton defaultExpanded submitIcon="<path d='M1 1'/>" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('does not render an svg when submitIcon is not provided', () => {
    const { container } = render(<SubmitButton defaultExpanded />)
    expect(container.querySelector('svg')).toBeNull()
  })
})
