import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { Features } from './Features.jsx'
import { useConfig } from '../../store/configContext.js'

jest.mock('../../store/configContext.js', () => ({ useConfig: jest.fn() }))

const APP_ID = 'test-app'
const ITEMS = [
  { id: 'f1', label: 'Feature One' },
  { id: 'f2', label: 'Feature Two' }
]

beforeEach(() => {
  useConfig.mockReturnValue({ id: APP_ID })
})

// ─── Features — rendering ─────────────────────────────────────────────────────

describe('Features — rendering', () => {
  it('renders a listbox with the correct id', () => {
    const { container } = render(<Features />)
    expect(container.querySelector(`#${APP_ID}-features`)).toBeTruthy()
    expect(container.querySelector('[role="listbox"]')).toBeTruthy() // NOSONAR
  })

  it('renders no options when items is empty', () => {
    const { container } = render(<Features />)
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(0) // NOSONAR
  })

  it('renders one option per item with correct id and label', () => {
    const { container } = render(<Features items={ITEMS} />)
    const options = container.querySelectorAll('[role="option"]') // NOSONAR
    expect(options).toHaveLength(2)
    expect(options[0].getAttribute('id')).toBe(`${APP_ID}-feature-f1`)
    expect(options[0].textContent).toBe('Feature One')
    expect(options[1].getAttribute('id')).toBe(`${APP_ID}-feature-f2`)
    expect(options[1].textContent).toBe('Feature Two')
  })

  it('sets aria-selected on the active item', () => {
    const { container } = render(<Features items={ITEMS} activeFeatureId='f1' />)
    const options = container.querySelectorAll('[role="option"]') // NOSONAR
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    expect(options[1]).toHaveAttribute('aria-selected', 'false')
  })

  it('sets aria-activedescendant when activeFeatureId is provided', () => {
    const { container } = render(<Features items={ITEMS} activeFeatureId='f2' />)
    expect(container.querySelector('[role="listbox"]').getAttribute('aria-activedescendant')).toBe('f2') // NOSONAR
  })

  it('omits aria-activedescendant when activeFeatureId is absent', () => {
    const { container } = render(<Features items={ITEMS} />)
    expect(container.querySelector('[role="listbox"]').getAttribute('aria-activedescendant')).toBeNull() // NOSONAR
  })

  it('is tabIndex 0 and not aria-hidden when items are present', () => {
    const { container } = render(<Features items={ITEMS} />)
    const ul = container.querySelector('[role="listbox"]') // NOSONAR
    expect(ul.getAttribute('tabIndex')).toBe('0')
    expect(ul.getAttribute('aria-hidden')).toBeNull()
  })

  it('is tabIndex -1 and aria-hidden when items is empty', () => {
    const { container } = render(<Features />)
    const ul = container.querySelector('[role="listbox"]') // NOSONAR
    expect(ul.getAttribute('tabIndex')).toBe('-1')
    expect(ul.getAttribute('aria-hidden')).toBe('true')
  })
})

// ─── Features — interactions ──────────────────────────────────────────────────

describe('Features — interactions', () => {
  it('calls onFocus when the listbox receives focus', () => {
    const onFocus = jest.fn()
    const { container } = render(<Features onFocus={onFocus} />)
    fireEvent.focus(container.querySelector('[role="listbox"]')) // NOSONAR
    expect(onFocus).toHaveBeenCalled()
  })
})
