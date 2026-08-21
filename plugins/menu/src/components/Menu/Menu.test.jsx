import { render } from '@testing-library/react'
import { Menu } from './Menu.jsx'

let capturedOnChange = null

jest.mock('./MenuCheckbox.jsx', () => ({
  MenuCheckbox: ({ menuGroupItem, onChange }) => {
    capturedOnChange = onChange
    return (
      <div
        data-testid='layers-menu-checkbox'
        data-item-id={menuGroupItem.id}
      />
    )
  }
}))

jest.mock('./RadioGroupWrapper.jsx', () => ({
  RadioGroupWrapper: ({ menuGroup }) => (
    <div data-testid='layers-radio-group-wrapper' data-group-id={menuGroup.id} />
  )
}))

jest.mock('./GroupLegend.jsx', () => ({
  GroupLegend: ({ menuGroup, children }) => (
    <div data-testid='layers-menu-group-wrapper' data-group-id={menuGroup.id}>
      {children}
    </div>
  )
}))

const makePluginState = (menu = [], extra = {}) => ({
  menu,
  dispatch: jest.fn(),
  ...extra
})

describe('Menu', () => {
  describe('container class', () => {
    it('renders the base container class when no groups have a groupLabel', () => {
      const pluginState = makePluginState([{ id: 'g1', type: 'checkbox', items: [] }])
      const { container } = render(<Menu pluginState={pluginState} />)
      const div = container.firstChild
      expect(div.className).toBe('im-c-menu-layers')
    })

    it('adds the --has-groups modifier when at least one group has a groupLabel', () => {
      const pluginState = makePluginState([{ id: 'g1', type: 'checkbox', groupLabel: 'My Group', items: [] }])
      const { container } = render(<Menu pluginState={pluginState} />)
      const div = container.firstChild
      expect(div.className).toBe('im-c-menu-layers im-c-menu-layers--has-groups')
    })
  })

  describe('empty menu', () => {
    it('renders the container with no children when menu is empty', () => {
      const pluginState = makePluginState([])
      const { container } = render(<Menu pluginState={pluginState} />)
      expect(container.firstChild.children).toHaveLength(0)
    })

    it('uses an empty array when menu is not provided', () => {
      const { container } = render(<Menu pluginState={{}} />)
      expect(container.firstChild.children).toHaveLength(0)
    })
  })

  describe('checkbox groups', () => {
    it('renders a GroupLegend for each checkbox group', () => {
      const pluginState = makePluginState([
        { id: 'g1', type: 'checkbox', items: [] },
        { id: 'g2', type: 'checkbox', items: [] }
      ])
      const { getAllByTestId } = render(<Menu pluginState={pluginState} />)
      expect(getAllByTestId('layers-menu-group-wrapper')).toHaveLength(2)
    })

    it('renders a MenuCheckbox for each item in a checkbox group', () => {
      const pluginState = makePluginState([
        { id: 'g1', type: 'checkbox', items: [{ id: 'item-a' }, { id: 'item-b' }] }
      ])
      const { getAllByTestId } = render(<Menu pluginState={pluginState} />)
      expect(getAllByTestId('layers-menu-checkbox')).toHaveLength(2)
    })

    it('passes the correct group to GroupLegend', () => {
      const group = { id: 'group-x', type: 'checkbox', items: [] }
      const pluginState = makePluginState([group])
      const { getByTestId } = render(<Menu pluginState={pluginState} />)
      expect(getByTestId('layers-menu-group-wrapper').dataset.groupId).toBe('group-x')
    })

    it('passes the correct item to MenuCheckbox', () => {
      const pluginState = makePluginState([
        { id: 'g1', type: 'checkbox', items: [{ id: 'item-1' }] }
      ])
      const { getByTestId } = render(<Menu pluginState={pluginState} />)
      expect(getByTestId('layers-menu-checkbox').dataset.itemId).toBe('item-1')
    })
  })

  describe('radio groups', () => {
    it('renders a RadioGroupWrapper for non-checkbox groups', () => {
      const pluginState = makePluginState([
        { id: 'r1', type: 'radio', items: [{ id: 'opt1' }, { id: 'opt2' }] }
      ])
      const { getAllByTestId } = render(<Menu pluginState={pluginState} />)
      expect(getAllByTestId('layers-radio-group-wrapper')).toHaveLength(1)
    })

    it('passes the correct group to RadioGroupWrapper', () => {
      const pluginState = makePluginState([
        { id: 'radio-group-1', type: 'radio', items: [] }
      ])
      const { getByTestId } = render(<Menu pluginState={pluginState} />)
      expect(getByTestId('layers-radio-group-wrapper').dataset.groupId).toBe('radio-group-1')
    })

    it('does not render a GroupLegend for radio groups', () => {
      const pluginState = makePluginState([{ id: 'r1', type: 'radio', items: [] }])
      const { queryByTestId } = render(<Menu pluginState={pluginState} />)
      expect(queryByTestId('layers-menu-group-wrapper')).toBeNull()
    })
  })

  describe('mixed groups', () => {
    it('renders both checkbox and radio wrappers when both types are present', () => {
      const pluginState = makePluginState([
        { id: 'c1', type: 'checkbox', items: [] },
        { id: 'r1', type: 'radio', items: [] }
      ])
      const { getByTestId } = render(<Menu pluginState={pluginState} />)
      expect(getByTestId('layers-menu-group-wrapper')).toBeTruthy()
      expect(getByTestId('layers-radio-group-wrapper')).toBeTruthy()
    })
  })

  describe('handleDatasetChange', () => {
    it('passes handleOnChange from the config item as onChange', () => {
      const handleOnChange = jest.fn()
      const pluginState = makePluginState([
        { id: 'g1', type: 'checkbox', items: [{ id: 'dataset-abc', handleOnChange }] }
      ])
      render(<Menu pluginState={pluginState} />)
      expect(capturedOnChange).toBe(handleOnChange)
    })

    it('onChange is undefined when the config item has no handleOnChange', () => {
      const pluginState = makePluginState([
        { id: 'g1', type: 'checkbox', items: [{ id: 'dataset-abc' }] }
      ])
      render(<Menu pluginState={pluginState} />)
      expect(capturedOnChange).toBeUndefined()
    })
  })
})
