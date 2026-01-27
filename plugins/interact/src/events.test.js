import { attachEvents } from './events.js'

describe('attachEvents', () => {
  let mockParams
  let cleanup
  let capturedMapClickHandler
  let capturedSelectHandler
  let capturedUnselectHandler

  beforeEach(() => {
    capturedMapClickHandler = null
    capturedSelectHandler = null
    capturedUnselectHandler = null

    mockParams = {
      appState: {
        layoutRefs: { viewportRef: { current: document.body } },
        disabledButtons: new Set()
      },
      mapState: {
        markers: {
          remove: jest.fn(),
          getMarker: jest.fn(() => null)
        },
        crossHair: {
          getDetail: jest.fn(() => ({ point: { x: 100, y: 100 }, coords: [0, 0] }))
        }
      },
      pluginState: {
        dispatch: jest.fn(),
        selectionBounds: null,
        selectedFeatures: [],
        closeOnAction: true,
        multiSelect: false
      },
      buttonConfig: {
        selectDone: { onClick: null },
        selectAtTarget: { onClick: null },
        selectCancel: { onClick: null }
      },
      events: { MAP_CLICK: 'map:click' },
      eventBus: {
        on: jest.fn((event, handler) => {
          if (event === 'map:click') capturedMapClickHandler = handler
          if (event === 'interact:selectFeature') capturedSelectHandler = handler
          if (event === 'interact:unselectFeature') capturedUnselectHandler = handler
        }),
        off: jest.fn(),
        emit: jest.fn()
      },
      handleInteraction: jest.fn(),
      closeApp: jest.fn()
    }
  })

  afterEach(() => {
    if (cleanup) {
      cleanup()
      cleanup = null
    }
  })

  describe('keyboard interaction', () => {
    it('triggers interaction when Enter is pressed on the map viewport', () => {
      cleanup = attachEvents(mockParams)

      // User presses Enter while focused on map
      const keydownEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      Object.defineProperty(keydownEvent, 'target', { value: document.body })
      document.dispatchEvent(keydownEvent)

      const keyupEvent = new KeyboardEvent('keyup', { key: 'Enter' })
      document.dispatchEvent(keyupEvent)

      expect(mockParams.handleInteraction).toHaveBeenCalled()
    })

    it('does not trigger interaction when Enter is pressed outside viewport', () => {
      const inputElement = document.createElement('input')
      cleanup = attachEvents(mockParams)

      // User presses Enter in a form input (not the map)
      const keydownEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      Object.defineProperty(keydownEvent, 'target', { value: inputElement })
      document.dispatchEvent(keydownEvent)

      const keyupEvent = new KeyboardEvent('keyup', { key: 'Enter' })
      document.dispatchEvent(keyupEvent)

      expect(mockParams.handleInteraction).not.toHaveBeenCalled()
    })

    it('does not trigger interaction for other keys', () => {
      cleanup = attachEvents(mockParams)

      const keydownEvent = new KeyboardEvent('keydown', { key: 'Space' })
      Object.defineProperty(keydownEvent, 'target', { value: document.body })
      document.dispatchEvent(keydownEvent)

      const keyupEvent = new KeyboardEvent('keyup', { key: 'Space' })
      document.dispatchEvent(keyupEvent)

      expect(mockParams.handleInteraction).not.toHaveBeenCalled()
    })

    it('no longer responds to Enter after cleanup', () => {
      cleanup = attachEvents(mockParams)
      cleanup()
      cleanup = null // Prevent double cleanup in afterEach

      const keydownEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      Object.defineProperty(keydownEvent, 'target', { value: document.body })
      document.dispatchEvent(keydownEvent)

      const keyupEvent = new KeyboardEvent('keyup', { key: 'Enter' })
      document.dispatchEvent(keyupEvent)

      expect(mockParams.handleInteraction).not.toHaveBeenCalled()
    })
  })

  describe('map click interaction', () => {
    it('triggers interaction when map is clicked', () => {
      cleanup = attachEvents(mockParams)

      const eventData = { point: { x: 50, y: 50 }, coords: [1, 2] }
      capturedMapClickHandler(eventData)

      expect(mockParams.handleInteraction).toHaveBeenCalledWith(eventData)
    })

    it('passes click coordinates to interaction handler', () => {
      cleanup = attachEvents(mockParams)

      capturedMapClickHandler({
        point: { x: 123, y: 456 },
        coords: [-1.5, 53.4]
      })

      expect(mockParams.handleInteraction).toHaveBeenCalledWith({
        point: { x: 123, y: 456 },
        coords: [-1.5, 53.4]
      })
    })
  })

  describe('Select button (selectAtTarget)', () => {
    it('triggers interaction at crosshair position when clicked', () => {
      mockParams.mapState.crossHair.getDetail.mockReturnValue({
        point: { x: 200, y: 300 },
        coords: [2.5, 48.8]
      })
      cleanup = attachEvents(mockParams)

      mockParams.buttonConfig.selectAtTarget.onClick()

      expect(mockParams.handleInteraction).toHaveBeenCalledWith({
        point: { x: 200, y: 300 },
        coords: [2.5, 48.8]
      })
    })
  })

  describe('Done button (selectDone)', () => {
    it('emits done event with marker coordinates when marker exists', () => {
      mockParams.mapState.markers.getMarker.mockReturnValue({
        coords: [1.5, 51.5]
      })
      cleanup = attachEvents(mockParams)

      mockParams.buttonConfig.selectDone.onClick()

      expect(mockParams.eventBus.emit).toHaveBeenCalledWith(
        'interact:done',
        expect.objectContaining({ coords: [1.5, 51.5] })
      )
    })

    it('emits done event with selected features when no marker', () => {
      mockParams.pluginState.selectedFeatures = [
        { featureId: 'F1', layerId: 'parcels' }
      ]
      mockParams.pluginState.selectionBounds = { sw: [0, 0], ne: [1, 1] }
      cleanup = attachEvents(mockParams)

      mockParams.buttonConfig.selectDone.onClick()

      expect(mockParams.eventBus.emit).toHaveBeenCalledWith(
        'interact:done',
        expect.objectContaining({
          selectedFeatures: [{ featureId: 'F1', layerId: 'parcels' }],
          selectionBounds: { sw: [0, 0], ne: [1, 1] }
        })
      )
    })

    it('closes the app after emitting done event', () => {
      mockParams.pluginState.closeOnAction = true
      cleanup = attachEvents(mockParams)

      mockParams.buttonConfig.selectDone.onClick()

      expect(mockParams.closeApp).toHaveBeenCalled()
    })

    it('does not close app when closeOnAction is false', () => {
      mockParams.pluginState.closeOnAction = false
      cleanup = attachEvents(mockParams)

      mockParams.buttonConfig.selectDone.onClick()

      expect(mockParams.eventBus.emit).toHaveBeenCalledWith(
        'interact:done',
        expect.anything()
      )
      expect(mockParams.closeApp).not.toHaveBeenCalled()
    })

    it('is disabled when button is in disabled state', () => {
      mockParams.appState.disabledButtons.add('selectDone')
      cleanup = attachEvents(mockParams)

      mockParams.buttonConfig.selectDone.onClick()

      expect(mockParams.eventBus.emit).not.toHaveBeenCalledWith(
        'interact:done',
        expect.anything()
      )
      expect(mockParams.closeApp).not.toHaveBeenCalled()
    })
  })

  describe('Cancel button (selectCancel)', () => {
    it('emits cancel event when clicked', () => {
      cleanup = attachEvents(mockParams)

      mockParams.buttonConfig.selectCancel.onClick()

      expect(mockParams.eventBus.emit).toHaveBeenCalledWith('interact:cancel')
    })

    it('closes the app after cancelling', () => {
      mockParams.pluginState.closeOnAction = true
      cleanup = attachEvents(mockParams)

      mockParams.buttonConfig.selectCancel.onClick()

      expect(mockParams.closeApp).toHaveBeenCalled()
    })

    it('does not close app when closeOnAction is false', () => {
      mockParams.pluginState.closeOnAction = false
      cleanup = attachEvents(mockParams)

      mockParams.buttonConfig.selectCancel.onClick()

      expect(mockParams.eventBus.emit).toHaveBeenCalledWith('interact:cancel')
      expect(mockParams.closeApp).not.toHaveBeenCalled()
    })
  })

  describe('programmatic feature selection (interact:selectFeature)', () => {
    it('selects the specified feature', () => {
      cleanup = attachEvents(mockParams)

      capturedSelectHandler({
        featureId: 'PARCEL-123',
        layerId: 'parcels',
        idProperty: 'parcelId'
      })

      expect(mockParams.pluginState.dispatch).toHaveBeenCalledWith({
        type: 'TOGGLE_SELECTED_FEATURES',
        payload: expect.objectContaining({
          featureId: 'PARCEL-123',
          layerId: 'parcels',
          addToExisting: true
        })
      })
    })

    it('removes any existing location marker when selecting', () => {
      cleanup = attachEvents(mockParams)

      capturedSelectHandler({ featureId: 'F1' })

      expect(mockParams.mapState.markers.remove).toHaveBeenCalledWith('location')
    })

    it('respects multiSelect setting from plugin state', () => {
      mockParams.pluginState.multiSelect = true
      cleanup = attachEvents(mockParams)

      capturedSelectHandler({ featureId: 'F1' })

      expect(mockParams.pluginState.dispatch).toHaveBeenCalledWith({
        type: 'TOGGLE_SELECTED_FEATURES',
        payload: expect.objectContaining({ multiSelect: true })
      })
    })
  })

  describe('programmatic feature unselection (interact:unselectFeature)', () => {
    it('removes the specified feature from selection', () => {
      cleanup = attachEvents(mockParams)

      capturedUnselectHandler({
        featureId: 'PARCEL-123',
        layerId: 'parcels'
      })

      expect(mockParams.pluginState.dispatch).toHaveBeenCalledWith({
        type: 'TOGGLE_SELECTED_FEATURES',
        payload: expect.objectContaining({
          featureId: 'PARCEL-123',
          layerId: 'parcels',
          addToExisting: false
        })
      })
    })

    it('removes any existing location marker when unselecting', () => {
      cleanup = attachEvents(mockParams)

      capturedUnselectHandler({ featureId: 'F1' })

      expect(mockParams.mapState.markers.remove).toHaveBeenCalledWith('location')
    })
  })

  describe('cleanup', () => {
    it('disables all button handlers', () => {
      cleanup = attachEvents(mockParams)

      expect(mockParams.buttonConfig.selectDone.onClick).toBeInstanceOf(Function)
      expect(mockParams.buttonConfig.selectAtTarget.onClick).toBeInstanceOf(Function)
      expect(mockParams.buttonConfig.selectCancel.onClick).toBeInstanceOf(Function)

      cleanup()
      cleanup = null

      expect(mockParams.buttonConfig.selectDone.onClick).toBeNull()
      expect(mockParams.buttonConfig.selectAtTarget.onClick).toBeNull()
      expect(mockParams.buttonConfig.selectCancel.onClick).toBeNull()
    })

    it('stops responding to keyboard events', () => {
      cleanup = attachEvents(mockParams)
      cleanup()
      cleanup = null

      // After cleanup, keyboard should not trigger interaction
      const keydownEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      Object.defineProperty(keydownEvent, 'target', { value: document.body })
      document.dispatchEvent(keydownEvent)

      const keyupEvent = new KeyboardEvent('keyup', { key: 'Enter' })
      document.dispatchEvent(keyupEvent)

      expect(mockParams.handleInteraction).not.toHaveBeenCalled()
    })
  })
})
