import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { Features } from './Features.jsx'
import { useConfig } from '../../store/configContext.js'

jest.mock('../../store/configContext.js', () => ({ useConfig: jest.fn() }))

const APP_ID = 'test-app'
const LISTBOX = '[role="listbox"]' // NOSONAR
const OPTION = '[role="option"]' // NOSONAR
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
    expect(container.querySelector(LISTBOX)).toBeTruthy() // NOSONAR
  })

  it('renders no options when items is empty', () => {
    const { container } = render(<Features />)
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(0) // NOSONAR
  })

  it('renders one option per item with correct id, data-id and label', () => {
    const { container } = render(<Features items={ITEMS} />)
    const options = container.querySelectorAll(OPTION)
    expect(options).toHaveLength(2)
    expect(options[0].getAttribute('id')).toBe(`${APP_ID}-feature-f1`)
    expect(options[0].dataset.id).toBe('f1')
    expect(options[0].textContent).toBe('Feature One')
    expect(options[1].getAttribute('id')).toBe(`${APP_ID}-feature-f2`)
    expect(options[1].dataset.id).toBe('f2')
    expect(options[1].textContent).toBe('Feature Two')
  })

  it('sets aria-selected on items present in selectedIds', () => {
    const { container } = render(<Features items={ITEMS} selectedIds={['f1']} />)
    const options = container.querySelectorAll(OPTION)
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    expect(options[1]).toHaveAttribute('aria-selected', 'false')
  })

  it('sets aria-selected on multiple items when selectedIds has multiple entries', () => {
    const { container } = render(<Features items={ITEMS} selectedIds={['f1', 'f2']} />)
    const options = container.querySelectorAll(OPTION)
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
  })

  it('does not set aria-selected from activeFeatureId alone', () => {
    const { container } = render(<Features items={ITEMS} activeFeatureId='f1' />)
    const options = container.querySelectorAll(OPTION)
    expect(options[0]).toHaveAttribute('aria-selected', 'false')
    expect(options[1]).toHaveAttribute('aria-selected', 'false')
  })

  it('sets aria-activedescendant to the option element id when activeFeatureId is provided', () => {
    const { container } = render(<Features items={ITEMS} activeFeatureId='f2' />)
    expect(container.querySelector(LISTBOX).getAttribute('aria-activedescendant')).toBe('test-app-feature-f2') // NOSONAR
  })

  it('omits aria-activedescendant when activeFeatureId is absent', () => {
    const { container } = render(<Features items={ITEMS} />)
    expect(container.querySelector(LISTBOX).getAttribute('aria-activedescendant')).toBeNull() // NOSONAR
  })

  it('sets aria-multiselectable when multiselectable is true', () => {
    const { container } = render(<Features items={ITEMS} multiselectable />)
    expect(container.querySelector(LISTBOX).getAttribute('aria-multiselectable')).toBe('true') // NOSONAR
  })

  it('omits aria-multiselectable when multiselectable is false', () => {
    const { container } = render(<Features items={ITEMS} />)
    expect(container.querySelector(LISTBOX).getAttribute('aria-multiselectable')).toBeNull() // NOSONAR
  })

  it('is tabIndex 0 and not aria-hidden when items are present', () => {
    const { container } = render(<Features items={ITEMS} />)
    const ul = container.querySelector(LISTBOX) // NOSONAR
    expect(ul.getAttribute('tabIndex')).toBe('0')
    expect(ul.getAttribute('aria-hidden')).toBeNull()
  })

  it('is tabIndex -1 and aria-hidden when items is empty', () => {
    const { container } = render(<Features />)
    const ul = container.querySelector(LISTBOX) // NOSONAR
    expect(ul.getAttribute('tabIndex')).toBe('-1')
    expect(ul.getAttribute('aria-hidden')).toBe('true')
  })
})

// ─── Features — interactions ──────────────────────────────────────────────────

describe('Features — interactions', () => {
  it('calls onFocus when the listbox receives focus', () => {
    const onFocus = jest.fn()
    const { container } = render(<Features onFocus={onFocus} />)
    fireEvent.focus(container.querySelector(LISTBOX)) // NOSONAR
    expect(onFocus).toHaveBeenCalled()
  })

  it('calls onBlur when the listbox loses focus', () => {
    const onBlur = jest.fn()
    const { container } = render(<Features onBlur={onBlur} />)
    fireEvent.blur(container.querySelector(LISTBOX)) // NOSONAR
    expect(onBlur).toHaveBeenCalled()
  })
})
