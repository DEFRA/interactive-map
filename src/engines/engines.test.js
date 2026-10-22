import * as maplibre from './maplibre.js'
import * as openlayers from './openlayers.js'
import * as esri from './esri.js'
import createMapLibreProvider from '../../providers/maplibre/src/index.js'
import createOpenLayersProvider from '../../providers/openlayers/src/index.js'
import createEsriProvider from '../../providers/esri/src/index.js'
import { createEngineMap } from './createEngineMap.js'
import { EVENTS } from '../config/events.js'

jest.mock('./createEngineMap.js', () => ({ createEngineMap: jest.fn((createProvider) => ({ createProvider })) }))
jest.mock('../../providers/maplibre/src/index.js', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('../../providers/openlayers/src/index.js', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('../../providers/esri/src/index.js', () => ({ __esModule: true, default: jest.fn() }))

describe.each([
  ['maplibre', maplibre, createMapLibreProvider],
  ['openlayers', openlayers, createOpenLayersProvider],
  ['esri', esri, createEsriProvider]
])('%s entry', (_name, entry, createProvider) => {
  test("exports an InteractiveMap that creates the engine's provider", () => {
    expect(createEngineMap).toHaveBeenCalledWith(createProvider)
    expect(entry.default).toEqual({ createProvider })
    expect(entry.InteractiveMap).toBe(entry.default)
  })

  test('exports the events', () => {
    expect(entry.EVENTS).toBe(EVENTS)
  })
})
