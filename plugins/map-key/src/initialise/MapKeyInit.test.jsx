import { render } from '@testing-library/react'
import { MapKeyInit } from './MapKeyInit.jsx'
const eventBus = { requestOnce: jest.fn(), emit: jest.fn() }
const pluginState = { dispatch: jest.fn() }
const pluginConfig = {
  groups: {
    alpha: { groupLabel: 'Alpha' }
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('MapKeyInit', () => {
  const renderInit = ({ isMapReady = false, config = {} } = {}) => render(
    <MapKeyInit
      pluginConfig={config}
      pluginState={pluginState}
      mapState={{ isMapReady }}
      services={{ eventBus }}
    />
  )

  it('does not call requestOnce when map is not ready', () => {
    renderInit({ isMapReady: false })
    expect(eventBus.requestOnce).not.toHaveBeenCalled()
  })

  it('calls requestOnce for datasets:registry when map is ready', () => {
    renderInit({ isMapReady: true })
    expect(eventBus.requestOnce).toHaveBeenCalledWith('datasets:registry', expect.any(Function))
  })

  it('puts the datasets registry it receives in this map\'s plugin state', () => {
    renderInit({ isMapReady: true })
    const datasetRegistry = { keyItems: jest.fn() }
    const [, onRegistry] = eventBus.requestOnce.mock.calls[0]
    onRegistry(datasetRegistry)
    expect(pluginState.dispatch).toHaveBeenCalledWith({ type: 'SET_DATASET_REGISTRY', payload: datasetRegistry })
  })

  it('dispatches configured groups when pluginConfig.groups is provided', () => {
    renderInit({ isMapReady: true, config: pluginConfig })
    expect(pluginState.dispatch).toHaveBeenCalledWith({
      type: 'ADD_KEY_GROUPS',
      payload: [{ id: 'alpha', groupLabel: 'Alpha', label: 'Alpha' }]
    })
  })

  it('calls requestOnce when isMapReady changes to true', () => {
    const { rerender } = renderInit({ isMapReady: false })
    expect(eventBus.requestOnce).not.toHaveBeenCalled()
    rerender(
      <MapKeyInit
        pluginConfig={{}}
        pluginState={pluginState}
        mapState={{ isMapReady: true }}
        services={{ eventBus }}
      />
    )
    expect(eventBus.requestOnce).toHaveBeenCalledTimes(1)
  })

  it('does not call requestOnce again on re-render when isMapReady stays true', () => {
    const { rerender } = renderInit({ isMapReady: true })
    rerender(
      <MapKeyInit
        pluginConfig={{}}
        pluginState={pluginState}
        mapState={{ isMapReady: true }}
        services={{ eventBus }}
      />
    )
    expect(eventBus.requestOnce).toHaveBeenCalledTimes(1)
  })
})
