import { MaplibreDrawAdapter } from './maplibre/MaplibreDrawAdapter.js'
import { OLDrawAdapter } from './openlayers/OLDrawAdapter.js'

/**
 * The shared adapter contract: events.js, DrawInit and the api entry points are
 * written against this surface, so both adapters must implement all of it — even
 * where an engine needs only a documented no-op (deleteVertex on MapLibre,
 * setFeatureProperty on OpenLayers). A method added to one adapter but not the
 * other fails here before it fails at runtime on the other engine.
 */
const CONTRACT_METHODS = [
  'changeMode',
  'getMode',
  'setInterfaceType',
  'done',
  'cancel',
  'undo',
  'deleteVertex',
  'get',
  'add',
  'delete',
  'deleteAll',
  'setSnapEnabled',
  'setSnapLayers',
  'isSnapEnabled',
  'setFeatureProperty',
  'setGeometryValid',
  'setInvalid',
  'on',
  'off',
  'remove'
]

describe.each([
  ['MaplibreDrawAdapter', MaplibreDrawAdapter],
  ['OLDrawAdapter', OLDrawAdapter]
])('%s adapter contract', (name, Adapter) => {
  test.each(CONTRACT_METHODS)('implements %s()', (method) => {
    expect(typeof Adapter.prototype[method]).toBe('function')
  })

  test('exposes the _geometryValidator accessor pair (user callback storage)', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Adapter.prototype, '_geometryValidator')
    expect(typeof descriptor?.get).toBe('function')
    expect(typeof descriptor?.set).toBe('function')
  })
})
