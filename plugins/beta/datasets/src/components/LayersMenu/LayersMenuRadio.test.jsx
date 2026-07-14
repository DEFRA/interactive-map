import { render, screen, act } from '@testing-library/react'
import { isVisibleWhen } from '../../registry/isVisibleWhen.js'
import { LayersMenuRadio } from './LayersMenuRadio'

jest.mock('../../registry/isVisibleWhen.js', () => ({
  isVisibleWhen: jest.fn()
}))

const onChange = jest.fn()
const baseItem = { id: 'radio-1', label: 'Option One' }

beforeEach(() => {
  isVisibleWhen.mockReturnValue(true)
  onChange.mockReset()
})

describe('LayersMenuRadio', () => {
  describe('visibility', () => {
    it('renders when visibleWhen is not set', () => {
      const { container } = render(
        <LayersMenuRadio menuGroupItem={baseItem} name='group' checked={false} onChange={onChange} />
      )
      expect(container.querySelector('input[type="radio"]')).toBeTruthy()
    })

    it('does not call isVisibleWhen when visibleWhen is not set', () => {
      render(<LayersMenuRadio menuGroupItem={baseItem} name='group' checked={false} onChange={onChange} />)
      expect(isVisibleWhen).not.toHaveBeenCalled()
    })

    it('calls isVisibleWhen with the visibleWhen value', () => {
      const visibleWhen = { menu: ['someValue'] }
      render(<LayersMenuRadio menuGroupItem={{ ...baseItem, visibleWhen }} name='group' checked={false} onChange={onChange} />)
      expect(isVisibleWhen).toHaveBeenCalledWith(visibleWhen)
    })

    it('returns null when isVisibleWhen resolves to false', () => {
      isVisibleWhen.mockReturnValue(false)
      const { container } = render(
        <LayersMenuRadio menuGroupItem={{ ...baseItem, visibleWhen: {} }} name='group' checked={false} onChange={onChange} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders when isVisibleWhen resolves to true', () => {
      isVisibleWhen.mockReturnValue(true)
      const { container } = render(
        <LayersMenuRadio menuGroupItem={{ ...baseItem, visibleWhen: {} }} name='group' checked={false} onChange={onChange} />
      )
      expect(container.querySelector('input[type="radio"]')).toBeTruthy()
    })
  })

  describe('rendered output', () => {
    it('renders the item label text', () => {
      render(<LayersMenuRadio menuGroupItem={baseItem} name='group' checked={false} onChange={onChange} />)
      expect(screen.getByText('Option One')).toBeTruthy()
    })

    it('sets the name attribute on the input', () => {
      const { container } = render(
        <LayersMenuRadio menuGroupItem={baseItem} name='my-radio-group' checked={false} onChange={onChange} />
      )
      expect(container.querySelector('input').name).toBe('my-radio-group')
    })

    it('sets checked to true when checked prop is true', () => {
      const { container } = render(
        <LayersMenuRadio menuGroupItem={baseItem} name='group' checked onChange={onChange} />
      )
      expect(container.querySelector('input').checked).toBe(true)
    })

    it('sets checked to false when checked prop is false', () => {
      const { container } = render(
        <LayersMenuRadio menuGroupItem={baseItem} name='group' checked={false} onChange={onChange} />
      )
      expect(container.querySelector('input').checked).toBe(false)
    })

    it('sets the input value to the item id', () => {
      const { container } = render(
        <LayersMenuRadio menuGroupItem={baseItem} name='group' checked={false} onChange={onChange} />
      )
      expect(container.querySelector('input').value).toBe('radio-1')
    })

    it('associates the label with the input via htmlFor', () => {
      const { container } = render(
        <LayersMenuRadio menuGroupItem={baseItem} name='group' checked={false} onChange={onChange} />
      )
      expect(container.querySelector('label').htmlFor).toBe('radio-1')
    })

    it('calls onChange when the radio input changes', () => {
      const { container } = render(
        <LayersMenuRadio menuGroupItem={baseItem} name='group' checked={false} onChange={onChange} />
      )
      const input = container.querySelector('input')
      const propsKey = Object.keys(input).find(k => k.startsWith('__reactProps'))
      act(() => { input[propsKey].onChange({ target: { value: 'radio-1' } }) })
      expect(onChange).toHaveBeenCalledTimes(1)
    })
  })
})
