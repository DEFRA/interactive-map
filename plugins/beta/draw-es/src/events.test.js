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

  const assertOnCalls = (methodArray) => {
    expect(onSpy.mock.calls, `${type}.on should be called ${methodArray.length} times`)
      .toHaveLength(methodArray.length)
    methodArray.forEach((method) =>
      expect(onSpy, `${type}.on should be called with ${method} and a callback`)
        .toHaveBeenCalledWith(method, callbackSpies[method]))
  }

  const assertRemoveCalls = (methodArray) => {
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
  constructor () {
    this._onClick = jest.fn()
    this.assignOnClickSpy = jest.spyOn(this, 'onClick')
  }

  set onClick (onClick) {
    this._onClick = jest.fn(onClick)
  }

  get onClick () {
    return this._onClick
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
      drawDone: new ButtonConfigMock(),
      drawCancel: new ButtonConfigMock()
    },
    mapColorScheme: 'MOCK_COLOUR_SCHEME'
  }

  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should add listeners and return a method that tears them down', async () => {
    const { eventBus } = mockAttachEventParameters
    const { sketchViewModel, view } = mockAttachEventParameters.mapProvider
    const teardown = attachEvents(mockAttachEventParameters)
    view.assertOnCalls(['click'])
    sketchViewModel.assertOnCalls(['update', 'create', 'undo'])
    eventBus.assertOnCalls([events.MAP_STYLE_CHANGE])

    teardown()

    view.assertRemoveCalls(['click'])
    sketchViewModel.assertRemoveCalls(['update', 'create', 'undo'])
    eventBus.assertRemoveCalls([events.MAP_STYLE_CHANGE])
  })

  // it('should call handleDone when Done is clicked', async () => {
  // })
})
