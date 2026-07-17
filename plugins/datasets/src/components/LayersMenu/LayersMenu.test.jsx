import { render } from '@testing-library/react'
import { LayersMenu } from './LayersMenu.jsx'
import { setDatasetVisibility } from '../../api/setDatasetVisibility.js'

jest.mock('../../api/setDatasetVisibility.js', () => ({
  setDatasetVisibility: jest.fn()
}))

let capturedOnChange = null

jest.mock('./LayersMenuCheckbox.jsx', () => ({
  LayersMenuCheckbox: ({ menuGroupItem, onChange }) => {
    capturedOnChange = onChange
    return (
      <div
        data-testid='layers-menu-checkbox'
        data-item-id={menuGroupItem.id}
      />
    )
  }
}))

jest.mock('./LayersRadioGroupWrapper.jsx', () => ({
  LayersRadioGroupWrapper: ({ menuGroup }) => (
    <div data-testid='layers-radio-group-wrapper' data-group-id={menuGroup.id} />
  )
}))

jest.mock('./LayersMenuGroupWrapper.jsx', () => ({
  LayersMenuGroupWrapper: ({ menuGroup, children }) => (
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

describe('LayersMenu', () => {
  beforeEach(() => {
    setDatasetVisibility.mockClear()
  })

  describe('container class', () => {
    it('renders the base container class when no groups have a groupLabel', () => {
      const pluginState = makePluginState([{ id: 'g1', type: 'checkbox', items: [] }])
      const { container } = render(<LayersMenu pluginState={pluginState} />)
      const div = container.firstChild
      expect(div.className).toBe('im-c-datasets-layers')
    })

    it('adds the --has-groups modifier when at least one group has a groupLabel', () => {
      const pluginState = makePluginState([{ id: 'g1', type: 'checkbox', groupLabel: 'My Group', items: [] }])
      const { container } = render(<LayersMenu pluginState={pluginState} />)
      const div = container.firstChild
      expect(div.className).toBe('im-c-datasets-layers im-c-datasets-layers--has-groups')
    })
  })

  describe('empty menu', () => {
    it('renders the container with no children when menu is empty', () => {
      const pluginState = makePluginState([])
      const { container } = render(<LayersMenu pluginState={pluginState} />)
      expect(container.firstChild.children).toHaveLength(0)
    })

    it('uses an empty array when menu is not provided', () => {
      const { container } = render(<LayersMenu pluginState={{}} />)
      expect(container.firstChild.children).toHaveLength(0)
    })
  })

  describe('checkbox groups', () => {
    it('renders a LayersMenuGroupWrapper for each checkbox group', () => {
      const pluginState = makePluginState([
        { id: 'g1', type: 'checkbox', items: [] },
        { id: 'g2', type: 'checkbox', items: [] }
      ])
      const { getAllByTestId } = render(<LayersMenu pluginState={pluginState} />)
      expect(getAllByTestId('layers-menu-group-wrapper')).toHaveLength(2)
    })

    it('renders a LayersMenuCheckbox for each item in a checkbox group', () => {
      const pluginState = makePluginState([
        { id: 'g1', type: 'checkbox', items: [{ id: 'item-a' }, { id: 'item-b' }] }
      ])
      const { getAllByTestId } = render(<LayersMenu pluginState={pluginState} />)
      expect(getAllByTestId('layers-menu-checkbox')).toHaveLength(2)
    })

    it('passes the correct group to LayersMenuGroupWrapper', () => {
      const group = { id: 'group-x', type: 'checkbox', items: [] }
      const pluginState = makePluginState([group])
      const { getByTestId } = render(<LayersMenu pluginState={pluginState} />)
      expect(getByTestId('layers-menu-group-wrapper').dataset.groupId).toBe('group-x')
    })

    it('passes the correct item to LayersMenuCheckbox', () => {
      const pluginState = makePluginState([
        { id: 'g1', type: 'checkbox', items: [{ id: 'item-1' }] }
      ])
      const { getByTestId } = render(<LayersMenu pluginState={pluginState} />)
      expect(getByTestId('layers-menu-checkbox').dataset.itemId).toBe('item-1')
    })
  })

  describe('radio groups', () => {
    it('renders a LayersRadioGroupWrapper for non-checkbox groups', () => {
      const pluginState = makePluginState([
        { id: 'r1', type: 'radio', items: [{ id: 'opt1' }, { id: 'opt2' }] }
      ])
      const { getAllByTestId } = render(<LayersMenu pluginState={pluginState} />)
      expect(getAllByTestId('layers-radio-group-wrapper')).toHaveLength(1)
    })

    it('passes the correct group to LayersRadioGroupWrapper', () => {
      const pluginState = makePluginState([
        { id: 'radio-group-1', type: 'radio', items: [] }
      ])
      const { getByTestId } = render(<LayersMenu pluginState={pluginState} />)
      expect(getByTestId('layers-radio-group-wrapper').dataset.groupId).toBe('radio-group-1')
    })

    it('does not render a LayersMenuGroupWrapper for radio groups', () => {
      const pluginState = makePluginState([{ id: 'r1', type: 'radio', items: [] }])
      const { queryByTestId } = render(<LayersMenu pluginState={pluginState} />)
      expect(queryByTestId('layers-menu-group-wrapper')).toBeNull()
    })
  })

  describe('mixed groups', () => {
    it('renders both checkbox and radio wrappers when both types are present', () => {
      const pluginState = makePluginState([
        { id: 'c1', type: 'checkbox', items: [] },
        { id: 'r1', type: 'radio', items: [] }
      ])
      const { getByTestId } = render(<LayersMenu pluginState={pluginState} />)
      expect(getByTestId('layers-menu-group-wrapper')).toBeTruthy()
      expect(getByTestId('layers-radio-group-wrapper')).toBeTruthy()
    })
  })

  describe('handleDatasetChange', () => {
    it('calls setDatasetVisibility with the correct arguments when a checkbox changes', () => {
      const pluginState = makePluginState([
        { id: 'g1', type: 'checkbox', items: [{ id: 'dataset-abc' }] }
      ])
      render(<LayersMenu pluginState={pluginState} />)
      capturedOnChange({ target: { value: 'dataset-abc', checked: true } })
      expect(setDatasetVisibility).toHaveBeenCalledTimes(1)
      expect(setDatasetVisibility).toHaveBeenCalledWith(
        { pluginState },
        true,
        { datasetId: 'dataset-abc' }
      )
    })

    it('passes checked: false to setDatasetVisibility when unchecking', () => {
      const pluginState = makePluginState([
        { id: 'g1', type: 'checkbox', items: [{ id: 'dataset-xyz' }] }
      ])
      render(<LayersMenu pluginState={pluginState} />)
      capturedOnChange({ target: { value: 'dataset-xyz', checked: false } })
      expect(setDatasetVisibility).toHaveBeenCalledWith(
        { pluginState },
        false,
        { datasetId: 'dataset-xyz' }
      )
    })
  })
})
