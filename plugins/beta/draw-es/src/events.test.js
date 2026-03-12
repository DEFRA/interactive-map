import { attachEvents } from './events.js'
import { EVENTS as events } from '../../../../src/config/events.js'

import * as graphicJs from './graphic.js'
jest.mock('./graphic.js')
const createGraphic = jest.spyOn(graphicJs, 'createGraphic')
// const createSymbol = jest.spyOn(graphicJs, 'createSymbol')
// const graphicToGeoJSON = jest.spyOn(graphicJs, 'graphicToGeoJSON')

const dispatch = jest.fn()
const feature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[[337560, 504846], [337580, 504855], [337587, 504838], [337565, 504833], [337560, 504846]]]
  },
  properties: { id: 'boundary' }
}

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

describe('attachEvents - draw-es', () => {
  const mockAttachEventParameters = {
    pluginState: {
      dispatch,
      mode: 'new-polygon', // or: edit-feature
      feature
    },
    mapProvider: {
      view: createMockEventHandler('view'),
      sketchViewModel: {
        ...createMockEventHandler('sketchViewModel'),
        cancel: jest.fn()
      },
      sketchLayer: {
        removeAll: jest.fn(),
        add: jest.fn()
      },
      emptySketchLayer: {}
    },
    events,
    eventBus: createMockEventHandler('eventBus'),
    buttonConfig: {
      drawDone: new ButtonConfigMock('Done'),
      drawCancel: new ButtonConfigMock('Cancel')
    },
    mapColorScheme: 'MOCK_COLOUR_SCHEME'
  }

  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('listeners', () => {
    const { drawDone, drawCancel } = mockAttachEventParameters.buttonConfig
    const { eventBus } = mockAttachEventParameters
    const { sketchViewModel, view } = mockAttachEventParameters.mapProvider
    const teardown = attachEvents(mockAttachEventParameters)
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
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should return null if sketchViewModel is not set', async () => {
      const response = attachEvents({
        ...mockAttachEventParameters,
        mapProvider: {}
      })
      expect(response).toBeNull()
    })

    it('should call handleDone when Done is clicked', async () => {
      const { drawDone } = mockAttachEventParameters.buttonConfig
      const { sketchViewModel } = mockAttachEventParameters.mapProvider
      const { eventBus } = mockAttachEventParameters
      attachEvents({
        ...mockAttachEventParameters,
        pluginState: {
          ...mockAttachEventParameters.pluginState, tempFeature: 'Test Feature'
        }
      })
      drawDone.onClick()
      expect(sketchViewModel.cancel).toHaveBeenCalled()
      expect(sketchViewModel.layer).toEqual(mockAttachEventParameters.mapProvider.emptySketchLayer)
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: null })
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null } })
      expect(eventBus.emit).toHaveBeenCalledWith('draw:done', { newFeature: 'Test Feature' })
    })

    it('should call handleCancel when Cancel is clicked', async () => {
      const { drawCancel } = mockAttachEventParameters.buttonConfig
      const { sketchViewModel, sketchLayer } = mockAttachEventParameters.mapProvider
      const { eventBus } = mockAttachEventParameters
      attachEvents({
        ...mockAttachEventParameters,
        pluginState: {
          ...mockAttachEventParameters.pluginState, tempFeature: 'Test Feature'
        }
      })
      drawCancel.onClick()
      expect(sketchViewModel.cancel).toHaveBeenCalled()
      expect(sketchLayer.removeAll).toHaveBeenCalled()
      expect(createGraphic).toHaveBeenCalled()
      expect(sketchLayer.add).toHaveBeenCalled()
      expect(sketchViewModel.layer).toEqual(mockAttachEventParameters.mapProvider.emptySketchLayer)
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: null })
      expect(eventBus.emit).toHaveBeenCalledWith('draw:cancelled')
    })
  })
})
