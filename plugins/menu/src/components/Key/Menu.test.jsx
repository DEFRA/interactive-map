import { render } from '@testing-library/react'
import { Menu } from './Menu'
import { getDatasetRegistry } from '../../registry/index.js'

jest.mock('../../registry/index.js', () => ({
  getDatasetRegistry: jest.fn()
}))

jest.mock('./Key.jsx', () => ({
  Key: ({ noKeyItemText, keyGroups, hasGroups, mapStyle }) => (
    <div
      data-testid='key'
      data-no-key-item-text={noKeyItemText}
      data-has-groups={String(hasGroups)}
      data-map-style-id={mapStyle.id}
      data-key-groups-length={keyGroups.length}
    />
  )
}))

const baseProps = {
  mapState: { mapStyle: { id: 'default' } },
  pluginConfig: { noKeyItemText: 'No items' }
}

describe('Menu', () => {
  it('passes keyGroups and hasGroups from the registry to Key', () => {
    getDatasetRegistry.mockReturnValue({
      keyItems: () => ({ items: [{ id: '1' }, { id: '2' }], hasGroups: true })
    })
    const { getByTestId } = render(<Menu {...baseProps} />)
    const key = getByTestId('key')
    expect(key.dataset.keyGroupsLength).toBe('2')
    expect(key.dataset.hasGroups).toBe('true')
  })

  it('passes empty items and hasGroups false when registry is null', () => {
    getDatasetRegistry.mockReturnValue(null)
    const { getByTestId } = render(<Menu {...baseProps} />)
    const key = getByTestId('key')
    expect(key.dataset.keyGroupsLength).toBe('0')
    expect(key.dataset.hasGroups).toBe('false')
  })

  it('passes noKeyItemText from pluginConfig to Key', () => {
    getDatasetRegistry.mockReturnValue(null)
    const { getByTestId } = render(<Menu {...baseProps} />)
    expect(getByTestId('key').dataset.noKeyItemText).toBe('No items')
  })

  it('passes mapStyle from mapState to Key', () => {
    getDatasetRegistry.mockReturnValue(null)
    const { getByTestId } = render(<Menu {...baseProps} />)
    expect(getByTestId('key').dataset.mapStyleId).toBe('default')
  })
})
