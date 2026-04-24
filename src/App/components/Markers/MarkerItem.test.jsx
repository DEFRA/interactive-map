import { render } from '@testing-library/react'
import MarkerItem from './MarkerItem.jsx'

describe('MarkerItem', () => {
  it('renders an li with role option and the given id', () => {
    const { container } = render(<MarkerItem id='test-id' isSelected={false}><span /></MarkerItem>)
    const li = container.querySelector('li')
    expect(li.getAttribute('id')).toBe('test-id')
    expect(li.getAttribute('role')).toBe('option')
  })

  it('sets aria-selected to true when isSelected is true', () => {
    const { container } = render(<MarkerItem id='x' isSelected><span /></MarkerItem>)
    expect(container.querySelector('li').getAttribute('aria-selected')).toBe('true')
  })

  it('sets aria-selected to false when isSelected is false', () => {
    const { container } = render(<MarkerItem id='x' isSelected={false}><span /></MarkerItem>)
    expect(container.querySelector('li').getAttribute('aria-selected')).toBe('false')
  })

  it('renders children inside the li', () => {
    const { getByText } = render(<MarkerItem id='x' isSelected={false}><span>hello</span></MarkerItem>)
    expect(getByText('hello')).toBeTruthy()
  })
})
