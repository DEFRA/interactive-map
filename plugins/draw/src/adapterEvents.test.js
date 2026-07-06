import { ADAPTER_EVENTS } from './adapterEvents.js'

describe('adapter event contract', () => {
  test('event names are stable — renaming a value breaks adapter consumers', () => {
    expect(ADAPTER_EVENTS).toEqual({
      CREATE: 'create',
      EDIT_FINISH: 'editfinish',
      CANCEL: 'cancel',
      VERTEX_SELECTION: 'vertexselection',
      VERTEX_CHANGE: 'vertexchange',
      UNDO_CHANGE: 'undochange',
      UPDATE: 'update',
      GEOMETRY_CHANGE: 'geometrychange',
      INTERFACE_TYPE_CHANGE: 'interfacetypechange'
    })
  })
})
