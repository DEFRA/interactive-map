import { attachEvents } from './events.js'
import { EVENTS as events } from '../../../../src/config/events.js'

import * as graphicJs from './graphic.js'
jest.mock('./graphic.js')
const createGraphic = jest.spyOn(graphicJs, 'createGraphic')
const createSymbol = jest.spyOn(graphicJs, 'createSymbol')
// const graphicToGeoJSON = jest.spyOn(graphicJs, 'graphicToGeoJSON')

const dispatch = jest.fn()

const createMockEventHandler = (type) => {
  const callbackSpies = {}
  const removeSpy = jest.fn()
  const onSpy = jest.fn((eventType, callback) => {
    callbackSpies[eventType] = callback
    return { remove: () => removeSpy(eventType) }
  })

  // returns an async function that runs asserts
  const assertOnCalls = (methodArray) => async () => {
    expect(onSpy.mock.calls, `${type}.on should be called ${methodArray.length} times`)
      .toHaveLength(methodArray.length)
    methodArray.forEach((method) =>
      expect(onSpy, `${type}.on should be called with ${method} and a callback`)
        .toHaveBeenCalledWith(method, callbackSpies[method]))
  }

  const assertRemoveCalls = (methodArray) => async () => {
    expect(removeSpy.mock.calls, `${type}.remove/off should be called ${methodArray.length} times`)
      .toHaveLength(methodArray.length)
    methodArray.forEach((method) => {
      const removeParams = type === 'eventBus' ? [method, callbackSpies[[method]]] : [method]
      expect(removeSpy, `${type}.remove/off should be called with ${removeParams} `).toHaveBeenCalledWith(...removeParams)
    })
  }

  return {
    removeSpy,
    callbackSpies,
    emit: jest.fn(),
    off: removeSpy,
    on: onSpy,
    assertOnCalls,
    assertRemoveCalls,
    triggerEvent: (eventType, event) => callbackSpies[eventType](event)
  }
}
const coordinates = [[[337560, 504846], [337580, 504855], [337587, 504838], [337565, 504833], [337560, 504846]]]
const feature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates
  },
  properties: { id: 'boundary' }
}

const mockSymbol = { color: 'blue' }
const newGraphicMock = { symbol: { color: 'red' } }

const mockGraphic = {
  attributes: { id: 'boundary' },
  geometry: { rings: coordinates },
  symbol: null
}

const sketchLayer = {
  removeAll: jest.fn(),
  add: jest.fn(),
  graphics: { items: [mockGraphic] }
}

class ButtonConfigMock {
  constructor (name) {
    this.name = name
    this._onClick = 'Initial Value'
    this._initialOnClick = this._onClick
    this.assignOnClickSpy = jest.spyOn(this, 'onClick', 'set')
  }

  set onClick (onClick) {
    this._onClick = onClick
  }

  get onClick () {
    return this._onClick
  }

  assertOnClickAssignment () {
    return async () => {
      expect(this.assignOnClickSpy.mock.calls, `${this.name}.onClick should have been reassigned once`)
        .toHaveLength(1)
      expect(this._onClick, `${this.name}.onClick should have changed`)
        .not.toEqual(this._initialOnClick)
    }
  }

  assertOnClickReset () {
    return async () => {
      expect(this.assignOnClickSpy.mock.calls, `${this.name}.onClick should have been assigned twice`)
        .toHaveLength(2)
      expect(this._onClick, `${this.name}.onClick should been set back to its initial value`)
        .toEqual(this._initialOnClick)
    }
  }
}
const emptySketchLayer = {}

const buildParams = (overrides = {}) => {
  return {
    pluginState: {
      dispatch,
      mode: 'new-polygon', // or: edit-feature
      feature,
      ...overrides.pluginState
    },
    mapProvider: {
      view: createMockEventHandler('view'),
      sketchViewModel: {
        ...createMockEventHandler('sketchViewModel'),
        layer: sketchLayer,
        cancel: jest.fn(),
        state: 'idle',
        polygonSymbol: null,
        update: jest.fn().mockResolvedValue(undefined)
      },
      // sketchViewModel: { ...sketchViewModel, ...overrides.sketchViewModel },
      sketchLayer,
      emptySketchLayer,
      ...overrides.mapProvider
    },
    events,
    eventBus: createMockEventHandler('eventBus'),
    buttonConfig: {
      drawDone: new ButtonConfigMock('Done'),
      drawCancel: new ButtonConfigMock('Cancel')
    },
    mapColorScheme: 'MOCK_COLOUR_SCHEME'
  }
}

describe('attachEvents - draw-es', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('listeners', () => {
    const params = buildParams()
    const { drawDone, drawCancel } = params.buttonConfig
    const { eventBus } = params
    const { sketchViewModel, view } = params.mapProvider
    const teardown = attachEvents(params)
    describe('attach', () => {
      it('should add view listeners', view.assertOnCalls(['click']))
      it('should add sketchViewModel listeners', sketchViewModel.assertOnCalls(['update', 'create', 'undo']))
      it('should add eventBus listeners', eventBus.assertOnCalls([events.MAP_STYLE_CHANGE]))
      it('should assign a Done click handler', drawDone.assertOnClickAssignment())
      it('should assign a Cancel click handler', drawCancel.assertOnClickAssignment())
    })

    describe('teardown', () => {
      beforeAll(teardown)
      it('should teardown the view listeners', view.assertRemoveCalls(['click']))
      it('should teardown the sketchViewModel listeners', sketchViewModel.assertRemoveCalls(['update', 'create', 'undo']))
      it('should teardown the eventBus listeners', eventBus.assertRemoveCalls([events.MAP_STYLE_CHANGE]))
      it('should reset the Done click handler', drawDone.assertOnClickReset())
      it('should reset the Cancel click handler', drawCancel.assertOnClickReset())
    })
  })

  describe('internal methods', () => {
    beforeEach(jest.clearAllMocks)

    it('should return null if sketchViewModel is not set', async () => {
      const response = attachEvents(buildParams({
        mapProvider: { sketchViewModel: null }
      }))
      expect(response).toBeNull()
    })

    it('should call handleDone when Done is clicked', async () => {
      const params = buildParams()
      params.pluginState.tempFeature = 'Test Feature'
      attachEvents(params)
      params.buttonConfig.drawDone.onClick()
      expect(params.mapProvider.sketchViewModel.cancel).toHaveBeenCalled()
      expect(params.mapProvider.sketchViewModel.layer).toEqual(emptySketchLayer)
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: null })
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null } })
      expect(params.eventBus.emit).toHaveBeenCalledWith('draw:done', { newFeature: 'Test Feature' })
    })

    it('should call handleCancel when Cancel is clicked', async () => {
      const params = buildParams()
      params.pluginState.tempFeature = 'Test Feature'
      // params.pluginState.feature = { properties: { id: 'boundary' } }
      const { drawCancel } = params.buttonConfig
      const { sketchViewModel, sketchLayer } = params.mapProvider
      const { eventBus } = params
      attachEvents(params)
      drawCancel.onClick()
      expect(sketchViewModel.cancel).toHaveBeenCalled()
      expect(sketchLayer.removeAll).toHaveBeenCalled()
      expect(createGraphic).toHaveBeenCalled()
      expect(sketchLayer.add).toHaveBeenCalled()
      expect(sketchViewModel.layer).toEqual(emptySketchLayer)
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: null })
      expect(eventBus.emit).toHaveBeenCalledWith('draw:cancelled')
    })

    describe('reColour', () => {
      beforeEach(() => {
        createSymbol.mockReturnValue(mockSymbol)
        createGraphic.mockReturnValue(newGraphicMock)
        mockGraphic.symbol = null
      })

      it('should update polygonSymbol and graphic symbols when state is not active', async () => {
        const params = buildParams()
        attachEvents(params)
        params.eventBus.triggerEvent(events.MAP_STYLE_CHANGE)
        await Promise.resolve()
        expect(params.mapProvider.sketchViewModel.polygonSymbol).toEqual(mockSymbol)
        expect(createGraphic).toHaveBeenCalledWith('boundary', mockGraphic.geometry.rings, params.mapColorScheme)
        expect(mockGraphic.symbol).toEqual(newGraphicMock.symbol)
        expect(params.mapProvider.sketchViewModel.cancel).not.toHaveBeenCalled()
      })

      it('should cancel and re-enter update mode when state is active and activeGraphicId is set (edit mode)', async () => {
        const params = buildParams()
        params.mapProvider.sketchViewModel.state = 'active'
        attachEvents(params)
        params.eventBus.triggerEvent(events.MAP_STYLE_CHANGE)
        expect(params.mapProvider.sketchViewModel.cancel).toHaveBeenCalled()
        jest.advanceTimersByTime(50)
        await Promise.resolve()
        await Promise.resolve()
        expect(params.mapProvider.sketchViewModel.update).toHaveBeenCalledWith(mockGraphic, {
          tool: 'reshape',
          toggleToolOnClick: false
        })
      })

      it('should not cancel or re-enter update mode when isCreating (active state, no activeGraphicId)', async () => {
        const params = buildParams({
          pluginState: { feature: null }
        })
        attachEvents(params)
        params.eventBus.triggerEvent(events.MAP_STYLE_CHANGE)
        await Promise.resolve()
        expect(params.mapProvider.sketchViewModel.cancel).not.toHaveBeenCalled()
        expect(params.mapProvider.sketchViewModel.update).not.toHaveBeenCalled()
      })

      it('should not call sketchViewModel.update if layer is not sketchLayer', async () => {
        const params = buildParams()
        params.mapProvider.sketchViewModel.layer = emptySketchLayer
        attachEvents(params)
        params.eventBus.triggerEvent(events.MAP_STYLE_CHANGE)
        await Promise.resolve()
        expect(params.mapProvider.sketchViewModel.update).not.toHaveBeenCalled()
      })

      it('should swallow AbortError thrown by sketchViewModel.update', async () => {
        const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' })
        const params = buildParams()
        params.mapProvider.sketchViewModel.update.mockRejectedValue(abortError)
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
        attachEvents(params)
        params.eventBus.triggerEvent(events.MAP_STYLE_CHANGE)
        jest.advanceTimersByTime(50)
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
        expect(consoleSpy).not.toHaveBeenCalled()
        consoleSpy.mockRestore()
      })

      it('should log non-AbortError thrown by sketchViewModel.update', async () => {
        const genericError = new Error('Something went wrong')
        const params = buildParams()
        params.mapProvider.sketchViewModel.state = 'active'
        params.mapProvider.sketchViewModel.update.mockRejectedValue(genericError)
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
        attachEvents(params)
        params.eventBus.triggerEvent(events.MAP_STYLE_CHANGE)
        jest.advanceTimersByTime(50)
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
        expect(consoleSpy).toHaveBeenCalledWith('Error updating sketch:', genericError)
        consoleSpy.mockRestore()
      })
    })
  })
})
