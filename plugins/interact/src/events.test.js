import { attachEvents } from './events.js'

const MOCK_POINT = { x: 1, y: 2 }
const MOCK_COORDS = [1, 2]
const INTERACT_DONE = 'interact:done'

const createParams = () => {
  const appState = { layoutRefs: { viewportRef: { current: document.body } }, disabledButtons: new Set() }
  const pluginState = { dispatch: jest.fn(), selectionBounds: null, selectedFeatures: [], selectedMarkers: [], closeOnAction: true, multiSelect: false }
  const clickReadyRef = { current: false }
  return {
    appState,
    pluginState,
    clickReadyRef,
    getAppState: () => appState,
    getPluginState: () => pluginState,
    mapState: {
      markers: { remove: jest.fn(), getMarker: jest.fn(() => null) },
      crossHair: { getDetail: jest.fn(() => ({ point: { x: 0, y: 0 }, coords: [0, 0] })) }
    },
    buttonConfig: { selectDone: {}, selectAtTarget: {}, selectCancel: {} },
    events: { MAP_CLICK: 'map:click' },
    eventBus: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
    handleInteraction: jest.fn(),
    closeApp: jest.fn()
  }
}

describe('attachEvents — keyboard', () => {
  let cleanup = null

  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { cleanup?.(); jest.useRealTimers() })

  it('Enter on viewport triggers interaction', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    const keydown = new KeyboardEvent('keydown', { key: 'Enter' })
    Object.defineProperty(keydown, 'target', { value: document.body })
    document.dispatchEvent(keydown)

    const keyup = new KeyboardEvent('keyup', { key: 'Enter' })
    Object.defineProperty(keyup, 'target', { value: document.body })
    document.dispatchEvent(keyup)

    expect(params.handleInteraction).toHaveBeenCalled()
  })

  it('ignores Enter outside viewport or other keys', () => {
    const params = createParams()
    cleanup = attachEvents(params)
    const input = document.createElement('input')

    let kd = new KeyboardEvent('keydown', { key: 'Enter' })
    Object.defineProperty(kd, 'target', { value: input })
    document.dispatchEvent(kd)
    let ku = new KeyboardEvent('keyup', { key: 'Enter' })
    Object.defineProperty(ku, 'target', { value: input })
    document.dispatchEvent(ku)

    kd = new KeyboardEvent('keydown', { key: 'Space' })
    Object.defineProperty(kd, 'target', { value: document.body })
    document.dispatchEvent(kd)
    ku = new KeyboardEvent('keyup', { key: 'Space' })
    Object.defineProperty(ku, 'target', { value: document.body })
    document.dispatchEvent(ku)

    expect(params.handleInteraction).not.toHaveBeenCalled()
  })
})

describe('attachEvents — click handling', () => {
  let cleanup = null

  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { cleanup?.(); jest.useRealTimers() })

  it('map click triggers interaction when clickReadyRef is true', () => {
    const params = createParams()
    params.clickReadyRef.current = true
    cleanup = attachEvents(params)

    const handler = params.eventBus.on.mock.calls.find(c => c[0] === 'map:click')[1]
    handler({ point: MOCK_POINT, coords: MOCK_COORDS })

    expect(params.handleInteraction).toHaveBeenCalledWith({ point: MOCK_POINT, coords: MOCK_COORDS })
  })

  it('map click is suppressed when clickReadyRef is false', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    const handler = params.eventBus.on.mock.calls.find(c => c[0] === 'map:click')[1]
    handler({ point: MOCK_POINT, coords: MOCK_COORDS })

    expect(params.handleInteraction).not.toHaveBeenCalled()
  })

  it('selectAtTarget triggers crosshair interaction', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    const crossDetail = { point: MOCK_POINT, coords: MOCK_COORDS }
    params.mapState.crossHair.getDetail.mockReturnValue(crossDetail)

    params.buttonConfig.selectAtTarget.onClick()
    expect(params.handleInteraction).toHaveBeenCalledWith(crossDetail)
  })
})

describe('attachEvents — button actions', () => {
  let cleanup = null

  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { cleanup?.(); jest.useRealTimers() })

  it('selectDone emits correct payload and respects closeOnAction', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    params.mapState.markers.getMarker.mockReturnValue({ coords: MOCK_COORDS })
    params.buttonConfig.selectDone.onClick()
    expect(params.closeApp).toHaveBeenCalled()

    params.closeApp.mockClear()
    params.pluginState.closeOnAction = false
    params.buttonConfig.selectDone.onClick()
    expect(params.closeApp).not.toHaveBeenCalled()
  })

  it('selectDone emits selectedFeatures and selectionBounds when no marker', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    params.pluginState.selectedFeatures = [{ id: 'f1' }]
    params.pluginState.selectionBounds = { sw: [0, 0], ne: [1, 1] }
    params.buttonConfig.selectDone.onClick()

    expect(params.eventBus.emit).toHaveBeenCalledWith(INTERACT_DONE, {
      selectedFeatures: [{ id: 'f1' }],
      selectionBounds: { sw: [0, 0], ne: [1, 1] }
    })
  })

  it('selectDone includes selectedMarkers in payload when present', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    params.pluginState.selectedMarkers = ['m1', 'm2']
    params.buttonConfig.selectDone.onClick()

    expect(params.eventBus.emit).toHaveBeenCalledWith(INTERACT_DONE,
      expect.objectContaining({ selectedMarkers: ['m1', 'm2'] })
    )
  })

  it('selectDone omits selectedMarkers from payload when empty', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    params.buttonConfig.selectDone.onClick()

    const payload = params.eventBus.emit.mock.calls.find(c => c[0] === INTERACT_DONE)[1]
    expect(payload).not.toHaveProperty('selectedMarkers')
  })

  it('does not emit or closeApp if selectDone button is disabled', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    params.appState.disabledButtons.add('selectDone')
    params.buttonConfig.selectDone.onClick()

    expect(params.eventBus.emit).not.toHaveBeenCalled()
    expect(params.closeApp).not.toHaveBeenCalled()
  })

  it('selectCancel emits cancel and respects closeOnAction', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    params.buttonConfig.selectCancel.onClick()
    expect(params.closeApp).toHaveBeenCalled()

    cleanup()
    const params2 = createParams()
    cleanup = attachEvents(params2)
    params2.pluginState.closeOnAction = false
    params2.buttonConfig.selectCancel.onClick()
    expect(params2.closeApp).not.toHaveBeenCalled()
  })

  it('respects default closeOnAction when value is nullish', () => {
    const params = createParams()
    params.pluginState.closeOnAction = null
    cleanup = attachEvents(params)

    params.buttonConfig.selectDone.onClick()
    expect(params.closeApp).toHaveBeenCalledTimes(1)

    params.closeApp.mockClear()
    params.buttonConfig.selectCancel.onClick()
    expect(params.closeApp).toHaveBeenCalledTimes(1)
  })
})

describe('attachEvents — programmatic selection', () => {
  let cleanup = null

  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { cleanup?.(); jest.useRealTimers() })

  it('selectFeature and unselectFeature dispatch and remove location marker', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    const selectHandler = params.eventBus.on.mock.calls.find(c => c[0] === 'interact:selectFeature')[1]
    const unselectHandler = params.eventBus.on.mock.calls.find(c => c[0] === 'interact:unselectFeature')[1]

    selectHandler({ featureId: 'F1' })
    unselectHandler({ featureId: 'F2' })

    expect(params.pluginState.dispatch).toHaveBeenCalledTimes(2)
    expect(params.mapState.markers.remove).toHaveBeenCalledTimes(2)
  })
})

describe('attachEvents — cleanup', () => {
  it('removes all handlers and nulls button onClick callbacks', () => {
    jest.useFakeTimers()
    const params = createParams()
    const cleanup = attachEvents(params)
    cleanup()
    Object.values(params.buttonConfig).forEach(btn => expect(btn.onClick).toBeNull())
    jest.useRealTimers()
  })
})
