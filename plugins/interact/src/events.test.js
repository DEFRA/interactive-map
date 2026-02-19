import { attachEvents } from './events.js'

describe('attachEvents', () => {
  let createParams, cleanup

  beforeEach(() => {
    jest.useFakeTimers()
    // factory function to create fresh params for each test
    createParams = () => ({
      appState: { layoutRefs: { viewportRef: { current: document.body } }, disabledButtons: new Set() },
      mapState: {
        markers: { remove: jest.fn(), getMarker: jest.fn(() => null) },
        crossHair: { getDetail: jest.fn(() => ({ point: { x: 0, y: 0 }, coords: [0,0] })) }
      },
      pluginState: { dispatch: jest.fn(), selectionBounds: null, selectedFeatures: [], closeOnAction: true, multiSelect: false },
      buttonConfig: { selectDone: {}, selectAtTarget: {}, selectCancel: {} },
      events: { MAP_CLICK: 'map:click' },
      eventBus: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
      handleInteraction: jest.fn(),
      closeApp: jest.fn()
    })
  })

  afterEach(() => {
    cleanup?.()
    jest.useRealTimers()
  })

  it('keyboard Enter triggers only on viewport', () => {
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

    // Enter outside viewport
    let kd = new KeyboardEvent('keydown', { key: 'Enter' })
    Object.defineProperty(kd, 'target', { value: input })
    document.dispatchEvent(kd)
    let ku = new KeyboardEvent('keyup', { key: 'Enter' })
    Object.defineProperty(ku, 'target', { value: input })
    document.dispatchEvent(ku)

    // other key
    kd = new KeyboardEvent('keydown', { key: 'Space' })
    Object.defineProperty(kd, 'target', { value: document.body })
    document.dispatchEvent(kd)
    ku = new KeyboardEvent('keyup', { key: 'Space' })
    Object.defineProperty(ku, 'target', { value: document.body })
    document.dispatchEvent(ku)

    expect(params.handleInteraction).not.toHaveBeenCalled()
  })

  it('map click triggers interaction after timer fires', () => {
    const params = createParams()
    cleanup = attachEvents(params)
    jest.runAllTimers()

    const handler = params.eventBus.on.mock.calls.find(c => c[0]==='map:click')[1]
    handler({ point:{x:1,y:2}, coords:[3,4] })

    expect(params.handleInteraction).toHaveBeenCalledWith({ point:{x:1,y:2}, coords:[3,4] })
  })

  it('map click is suppressed immediately after enable before timer fires', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    const handler = params.eventBus.on.mock.calls.find(c => c[0]==='map:click')[1]
    handler({ point:{x:1,y:2}, coords:[3,4] })

    expect(params.handleInteraction).not.toHaveBeenCalled()
  })

  it('selectAtTarget triggers crosshair interaction', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    const crossDetail = { point:{x:1,y:2}, coords:[3,4] }
    params.mapState.crossHair.getDetail.mockReturnValue(crossDetail)

    params.buttonConfig.selectAtTarget.onClick()
    expect(params.handleInteraction).toHaveBeenCalledWith(crossDetail)
  })

  it('selectDone emits correct payload and respects closeOnAction', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    // closeOnAction = true (already covered)
    params.mapState.markers.getMarker.mockReturnValue({ coords:[1,2] })
    params.buttonConfig.selectDone.onClick()
    expect(params.closeApp).toHaveBeenCalled()

    // cover closeOnAction = false
    params.closeApp.mockClear()
    params.pluginState.closeOnAction = false
    params.mapState.markers.getMarker.mockReturnValue({ coords:[3,4] })
    params.buttonConfig.selectDone.onClick()
    expect(params.closeApp).not.toHaveBeenCalled()
  })

  it('selectCancel emits cancel and respects closeOnAction', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    // closeOnAction = true
    params.buttonConfig.selectCancel.onClick()
    expect(params.closeApp).toHaveBeenCalled()

    // cover closeOnAction = false
    cleanup()
    const params2 = createParams()
    cleanup = attachEvents(params2)
    params2.pluginState.closeOnAction = false
    params2.buttonConfig.selectCancel.onClick()
    expect(params2.closeApp).not.toHaveBeenCalled()
  })

  it('does not emit or closeApp if selectDone button is disabled', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    params.appState.disabledButtons.add('selectDone')
    params.buttonConfig.selectDone.onClick()

    expect(params.eventBus.emit).not.toHaveBeenCalled()
    expect(params.closeApp).not.toHaveBeenCalled()
  })

  it('programmatic select/unselect dispatches and removes location', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    const selectHandler = params.eventBus.on.mock.calls.find(c => c[0]==='interact:selectFeature')[1]
    const unselectHandler = params.eventBus.on.mock.calls.find(c => c[0]==='interact:unselectFeature')[1]

    selectHandler({ featureId:'F1' })
    unselectHandler({ featureId:'F2' })

    expect(params.pluginState.dispatch).toHaveBeenCalledTimes(2)
    expect(params.mapState.markers.remove).toHaveBeenCalledTimes(2)
  })

  it('cleanup removes all handlers', () => {
    const params = createParams()
    cleanup = attachEvents(params)
    cleanup()
    Object.values(params.buttonConfig).forEach(btn => expect(btn.onClick).toBeNull())
  })

  it('selectDone handles emission when no marker/coords exist', () => {
    const params = createParams()
    cleanup = attachEvents(params)

    // Ensure marker returns null (no coords)
    params.mapState.markers.getMarker.mockReturnValue(null)
    
    // Set up features and bounds
    params.pluginState.selectedFeatures = [{ id: 'f1' }]
    params.pluginState.selectionBounds = { sw: [0, 0], ne: [1, 1] }

    params.buttonConfig.selectDone.onClick()

    expect(params.eventBus.emit).toHaveBeenCalledWith('interact:done', {
      selectedFeatures: [{ id: 'f1' }],
      selectionBounds: { sw: [0, 0], ne: [1, 1] }
    })
  })

  it('respects default closeOnAction when value is undefined (fallback to true)', () => {
    const params = createParams()
    // Explicitly set to undefined to trigger the ?? fallback
    params.pluginState.closeOnAction = undefined 
    cleanup = attachEvents(params)

    // Test for selectDone
    params.buttonConfig.selectDone.onClick()
    expect(params.closeApp).toHaveBeenCalledTimes(1)

    // Test for selectCancel
    params.closeApp.mockClear()
    params.buttonConfig.selectCancel.onClick()
    expect(params.closeApp).toHaveBeenCalledTimes(1)
  })
})
