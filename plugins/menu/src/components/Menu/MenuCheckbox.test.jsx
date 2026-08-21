import { render, screen, act } from '@testing-library/react'
import { MenuCheckbox } from './MenuCheckbox.jsx'

const onChange = jest.fn()
const dispatch = jest.fn()
const menuGroupItem = { id: 'dataset-1', label: 'Dataset One' }

beforeEach(() => {
  onChange.mockReset()
  dispatch.mockReset()
})

const renderCheckbox = (props = {}) =>
  render(<MenuCheckbox menuGroupItem={menuGroupItem} onChange={onChange} dispatch={dispatch} checked {...props} />)

describe('MenuCheckbox', () => {
  describe('rendered output', () => {
    it('renders a checkbox input', () => {
      const { container } = renderCheckbox()
      expect(container.querySelector('input[type="checkbox"]')).toBeTruthy()
    })

    it('renders the menuGroupItem label', () => {
      renderCheckbox()
      expect(screen.getByText('Dataset One')).toBeTruthy()
    })

    it('associates the label with the input via htmlFor', () => {
      const { container } = renderCheckbox()
      const label = container.querySelector('label')
      const input = container.querySelector('input')
      expect(label.htmlFor).toBe(input.id)
    })
  })

  describe('checked state', () => {
    it('is checked when checked prop is true', () => {
      const { container } = renderCheckbox({ checked: true })
      expect(container.querySelector('input').checked).toBe(true)
    })

    it('is unchecked when checked prop is false', () => {
      const { container } = renderCheckbox({ checked: false })
      expect(container.querySelector('input').checked).toBe(false)
    })
  })

  describe('item class', () => {
    it('does not include the --checked modifier when checked is true', () => {
      const { container } = renderCheckbox({ checked: true })
      expect(container.firstChild.className).not.toContain('im-c-menu-layers__item--checked')
    })

    it('includes the --checked modifier when checked is false', () => {
      const { container } = renderCheckbox({ checked: false })
      expect(container.firstChild.className).toContain('im-c-menu-layers__item--checked')
    })
  })

  describe('handleOnChange', () => {
    const triggerChange = (container, checked) => {
      const input = container.querySelector('input')
      const propsKey = Object.keys(input).find(k => k.startsWith('__reactProps'))
      act(() => { input[propsKey].onChange({ target: { checked, value: input.value } }) })
    }

    it('calls onChange with true when the checkbox is checked', () => {
      const { container } = renderCheckbox()
      triggerChange(container, true)
      expect(onChange).toHaveBeenCalledWith(true)
    })

    it('calls onChange with false when the checkbox is unchecked', () => {
      const { container } = renderCheckbox()
      triggerChange(container, false)
      expect(onChange).toHaveBeenCalledWith(false)
    })

    it('dispatches UPDATE_MENU_STATE with the item id and checked value', () => {
      const { container } = renderCheckbox()
      triggerChange(container, true)
      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_MENU_STATE',
        payload: { 'dataset-1': true }
      })
    })

    it('does not throw when onChange is not provided', () => {
      const { container } = renderCheckbox({ onChange: undefined })
      expect(() => triggerChange(container, true)).not.toThrow()
    })
  })
})
