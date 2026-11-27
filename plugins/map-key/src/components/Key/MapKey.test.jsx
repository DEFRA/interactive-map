import { render, act } from '@testing-library/react'
import { MapKey } from './MapKey'

// eslint-disable-next-line no-var -- jest.mock factories may only reference vars prefixed "mock"
var mockKeyRenderCount = 0
jest.mock('./Key.jsx', () => ({
  Key: ({ noKeyItemText, keyGroups, hasGroups, mapStyle }) => {
    mockKeyRenderCount++
    return (
      <div
        data-testid='key'
        data-no-key-item-text={noKeyItemText}
        data-has-groups={String(hasGroups)}
        data-map-style-id={mapStyle.id}
        data-key-groups-length={keyGroups.length}
      />
    )
  }
}))

const makeEventBus = () => {
  const eventBus = {
    requestOnce: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
  eventBus.on.mockReturnValue(eventBus)
  eventBus.off.mockReturnValue(eventBus)
  return eventBus
}

const makeRegistry = (items = [], hasGroups = false) => ({
  keyItems: jest.fn().mockReturnValue({ items, hasGroups }),
  invalidateKeyItemsOnMenuStateChange: jest.fn()
})

let eventBus
// This map's datasets registry, which MapKeyInit puts in plugin state
let datasetRegistry
const baseProps = (pluginState = {}) => ({
  mapState: { mapStyle: { id: 'default' } },
  pluginConfig: { noKeyItemText: 'No items' },
  pluginState: { datasetRegistry, ...pluginState },
  services: { eventBus }
})

beforeEach(() => {
  jest.clearAllMocks()
  eventBus = makeEventBus()
  mockKeyRenderCount = 0
})

describe('MapKey', () => {
  describe('when datasetRegistry is null', () => {
    beforeEach(() => { datasetRegistry = null })

    it('passes empty items and hasGroups false to Key', () => {
      const { getByTestId } = render(<MapKey {...baseProps()} />)
      expect(getByTestId('key').dataset.keyGroupsLength).toBe('0')
      expect(getByTestId('key').dataset.hasGroups).toBe('false')
    })

    it('does not request the registry itself', () => {
      render(<MapKey {...baseProps()} />)
      expect(eventBus.requestOnce).not.toHaveBeenCalled()
    })

    it('populates key items when the registry arrives in plugin state', () => {
      const { rerender, getByTestId } = render(<MapKey {...baseProps()} />)
      const registry = makeRegistry([{ id: '1' }, { id: '2' }], true)
      rerender(<MapKey {...baseProps({ datasetRegistry: registry })} />)
      expect(registry.keyItems).toHaveBeenCalled()
      expect(getByTestId('key').dataset.keyGroupsLength).toBe('2')
    })
  })

  describe('when datasetRegistry exists', () => {
    let registry

    beforeEach(() => {
      registry = makeRegistry([{ id: '1' }, { id: '2' }], true)
      datasetRegistry = registry
    })

    it('passes keyGroups and hasGroups from the registry to Key', () => {
      const { getByTestId } = render(<MapKey {...baseProps()} />)
      expect(getByTestId('key').dataset.keyGroupsLength).toBe('2')
      expect(getByTestId('key').dataset.hasGroups).toBe('true')
    })

    // Regression: when the registry is already populated at mount (e.g. reopening the key
    // panel after datasets:ready), Key must render with real data straight away rather than
    // painting the empty state first and flashing to the real content once the mount effect
    // catches up — see MapKey.jsx's lazy useState initializers.
    it('renders Key only once, already carrying the real items, instead of flashing empty first', () => {
      render(<MapKey {...baseProps()} />)
      expect(mockKeyRenderCount).toBe(1)
    })

    it('registers menu:changed and datasets:changed listeners', () => {
      render(<MapKey {...baseProps()} />)
      expect(eventBus.on).toHaveBeenCalledWith('menu:changed', expect.any(Function))
      expect(eventBus.on).toHaveBeenCalledWith('datasets:changed', expect.any(Function))
    })

    it('deregisters listeners on unmount', () => {
      const { unmount } = render(<MapKey {...baseProps()} />)
      unmount()
      expect(eventBus.off).toHaveBeenCalledWith('menu:changed', expect.any(Function))
      expect(eventBus.off).toHaveBeenCalledWith('datasets:changed', expect.any(Function))
    })

    it('refreshes key items when datasets:changed fires', () => {
      render(<MapKey {...baseProps()} />)
      const callsAtMount = registry.keyItems.mock.calls.length
      const onDatasetsChanged = eventBus.on.mock.calls.find(([e]) => e === 'datasets:changed')[1]
      act(() => { onDatasetsChanged() })
      expect(registry.keyItems).toHaveBeenCalledTimes(callsAtMount + 1)
    })

    it('invalidates and refreshes key items when menu:changed fires', () => {
      render(<MapKey {...baseProps()} />)
      const callsAtMount = registry.keyItems.mock.calls.length
      const onMenuChanged = eventBus.on.mock.calls.find(([e]) => e === 'menu:changed')[1]
      const menuState = { someKey: 'value' }
      act(() => { onMenuChanged(menuState) })
      expect(registry.invalidateKeyItemsOnMenuStateChange).toHaveBeenCalledWith(menuState)
      expect(registry.keyItems).toHaveBeenCalledTimes(callsAtMount + 1)
    })

    it('merges the latest key groups from plugin state when an event fires after they change', () => {
      datasetRegistry = makeRegistry([
        { id: '1', type: 'flat', keyDefinition: { id: '1' } },
        { id: '2', type: 'flat', keyDefinition: { id: '2' } }
      ])
      const { rerender, getByTestId } = render(<MapKey {...baseProps()} />)
      const groupState = {
        groups: [{ id: 'manual', type: 'group', groupLabel: 'Manual' }],
        keyDefinitions: [{ id: 'm1', groupId: 'manual' }]
      }
      rerender(<MapKey {...baseProps(groupState)} />)
      const onDatasetsChanged = eventBus.on.mock.calls.find(([e]) => e === 'datasets:changed')[1]
      act(() => { onDatasetsChanged() })
      expect(getByTestId('key').dataset.keyGroupsLength).toBe('3')
    })
  })

  describe('props forwarded to Key', () => {
    beforeEach(() => { datasetRegistry = null })

    it('passes noKeyItemText from pluginConfig', () => {
      const { getByTestId } = render(<MapKey {...baseProps()} />)
      expect(getByTestId('key').dataset.noKeyItemText).toBe('No items')
    })

    it('passes mapStyle from mapState', () => {
      const { getByTestId } = render(<MapKey {...baseProps()} />)
      expect(getByTestId('key').dataset.mapStyleId).toBe('default')
    })
  })
})
