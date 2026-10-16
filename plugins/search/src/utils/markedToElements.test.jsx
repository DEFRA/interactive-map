import { render } from '@testing-library/react'
import { markedToElements } from './markedToElements'

const renderMarked = (marked) => render(<span>{markedToElements(marked)}</span>).container.firstChild

describe('markedToElements', () => {
  test('renders <mark> tags as mark elements', () => {
    const label = renderMarked('<mark>NY 701 924</mark> (Grid reference)')
    expect(label.innerHTML).toBe('<mark>NY 701 924</mark> (Grid reference)')
  })

  test('matches mark tags case-insensitively', () => {
    const label = renderMarked('a <MARK>b</MARK> c')
    expect(label.querySelector('mark').textContent).toBe('b')
  })

  test('renders other markup as text', () => {
    const label = renderMarked('<img src=x onerror="alert(1)"> London')
    expect(label.querySelector('img')).toBeNull()
    expect(label.textContent).toBe('<img src=x onerror="alert(1)"> London')
  })

  test('renders markup inside a mark as text', () => {
    const label = renderMarked('<mark><img src=x onerror="alert(1)"></mark>')
    expect(label.querySelector('img')).toBeNull()
    expect(label.querySelector('mark').textContent).toBe('<img src=x onerror="alert(1)">')
  })

  test('renders mark tags with attributes as text', () => {
    const label = renderMarked('<mark onmouseover="alert(1)">London</mark>')
    expect(label.querySelector('mark')).toBeNull()
    expect(label.textContent).toBe('<mark onmouseover="alert(1)">London')
  })

  test('marks the rest of the text when a mark is not closed', () => {
    const label = renderMarked('a <mark>b')
    expect(label.innerHTML).toBe('a <mark>b</mark>')
  })

  test('renders entities as literal text', () => {
    const label = renderMarked('Bob &amp; Sons')
    expect(label.textContent).toBe('Bob &amp; Sons')
  })

  test('returns no children when marked is missing or empty', () => {
    expect(markedToElements()).toEqual([])
    expect(markedToElements('')).toEqual([])
  })
})
