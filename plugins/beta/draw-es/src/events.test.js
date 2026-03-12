import { attachEvents } from './events.js'
import { EVENTS as events } from '../../../../src/config/events.js'
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
      sketchViewModel: createMockEventHandler('sketchViewModel'),
      sketchLayer: {},
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
})
