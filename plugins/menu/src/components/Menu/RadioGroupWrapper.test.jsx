import { render, screen, act } from '@testing-library/react'
import { isVisibleWhen } from '../../registry/isVisibleWhen.js'
import { RadioGroupWrapper } from './RadioGroupWrapper.jsx'

jest.mock('../../registry/isVisibleWhen.js', () => ({
  isVisibleWhen: jest.fn()
}))

let capturedOnChange = null

jest.mock('./MenuRadio.jsx', () => ({
  MenuRadio: ({ menuGroupItem, checked, name, onChange }) => {
    capturedOnChange = onChange
    return (
      <div
        data-testid='layers-menu-radio'
        data-item-id={menuGroupItem.id}
        data-name={name}
        data-checked={String(checked)}
      />
    )
  }
}))

const makeProps = (menuState = {}) => ({
  menuState,
  dispatch: jest.fn()
})

const baseGroup = {
  id: 'group-1',
  label: 'My Group',
  items: [{ id: 'opt-a' }, { id: 'opt-b' }]
}

beforeEach(() => {
  isVisibleWhen.mockClear()
  isVisibleWhen.mockReturnValue(true)
  capturedOnChange = null
})

describe('RadioGroupWrapper', () => {
  describe('visibility', () => {
    it('returns null when isVisibleWhen resolves to false', () => {
      isVisibleWhen.mockReturnValue(false)
      const { container } = render(
        <RadioGroupWrapper {...makeProps()} menuGroup={{ ...baseGroup, visibleWhen: {} }} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders when visibleWhen is not set', () => {
      const { container } = render(
        <RadioGroupWrapper {...makeProps()} menuGroup={baseGroup} />
      )
      expect(container.querySelector('.govuk-form-group')).toBeTruthy()
    })

    it('does not call isVisibleWhen when visibleWhen is not set', () => {
      render(<RadioGroupWrapper {...makeProps()} menuGroup={baseGroup} />)
      expect(isVisibleWhen).not.toHaveBeenCalled()
    })

    it('calls isVisibleWhen with the visibleWhen value', () => {
      const visibleWhen = { menu: ['someValue'] }
      render(<RadioGroupWrapper {...makeProps()} menuGroup={{ ...baseGroup, visibleWhen }} />)
      expect(isVisibleWhen).toHaveBeenCalledWith(visibleWhen)
    })
  })

  describe('rendered output', () => {
    it('renders the group label as the legend', () => {
      render(<RadioGroupWrapper {...makeProps()} menuGroup={baseGroup} />)
      expect(screen.getByText('My Group')).toBeTruthy()
    })

    it('renders a MenuRadio for each item', () => {
      const { getAllByTestId } = render(
        <RadioGroupWrapper {...makeProps()} menuGroup={baseGroup} />
      )
      expect(getAllByTestId('layers-menu-radio')).toHaveLength(2)
    })

    it('passes the group id as the name to each radio item', () => {
      const { getAllByTestId } = render(
        <RadioGroupWrapper {...makeProps()} menuGroup={baseGroup} />
      )
      getAllByTestId('layers-menu-radio').forEach(radio => {
        expect(radio.dataset.name).toBe('group-1')
      })
    })
  })

  describe('checked state', () => {
    it('marks the item matching menuState as checked', () => {
      const { getAllByTestId } = render(
        <RadioGroupWrapper {...makeProps({ 'group-1': 'opt-a' })} menuGroup={baseGroup} />
      )
      const radios = getAllByTestId('layers-menu-radio')
      expect(radios[0].dataset.checked).toBe('true')
      expect(radios[1].dataset.checked).toBe('false')
    })

    it('marks no item as checked when menuState has no value for the group', () => {
      const { getAllByTestId } = render(
        <RadioGroupWrapper {...makeProps({})} menuGroup={baseGroup} />
      )
      getAllByTestId('layers-menu-radio').forEach(radio => {
        expect(radio.dataset.checked).toBe('false')
      })
    })
  })

  describe('handleChange', () => {
    it('dispatches UPDATE_MENU_STATE with the selected item id', () => {
      const props = makeProps({ 'group-1': 'opt-a' })
      render(<RadioGroupWrapper {...props} menuGroup={baseGroup} />)
      act(() => { capturedOnChange({ target: { value: 'opt-b' } }) })
      expect(props.dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_MENU_STATE',
        payload: { 'group-1': 'opt-b' }
      })
    })

    it('dispatches using the group id as the payload key', () => {
      const group = { ...baseGroup, id: 'another-group' }
      const props = makeProps({ 'another-group': 'opt-a' })
      render(<RadioGroupWrapper {...props} menuGroup={group} />)
      act(() => { capturedOnChange({ target: { value: 'opt-b' } }) })
      expect(props.dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_MENU_STATE',
        payload: { 'another-group': 'opt-b' }
      })
    })
  })
})
