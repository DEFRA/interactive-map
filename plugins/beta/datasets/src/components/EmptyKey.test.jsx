import { render, screen } from '@testing-library/react'
import { EmptyKey } from './EmptyKey'

describe('EmptyKey', () => {
  const text = 'No features available'

  it('renders the wrapper div with the correct class', async () => {
    const { container } = render(<EmptyKey text={text} />)
    expect(container.querySelector('.im-c-datasets-key')).toBeTruthy()
  })

  it('renders the empty message paragraph with the correct class', async () => {
    const { container } = render(<EmptyKey text={text} />)
    expect(container.querySelector('.im-c-datasets-key__empty-message')).toBeTruthy()
  })

  it('renders the provided text', async () => {
    render(<EmptyKey text={text} />)
    expect(screen.getByText(text)).toBeTruthy()
  })
})
