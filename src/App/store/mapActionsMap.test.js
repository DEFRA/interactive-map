import { actionsMap } from './mapActionsMap.js'

describe('actionsMap', () => {
  let state

  beforeEach(() => {
    state = {
      isMapReady: false,
      mapStyle: 'default',
      mapSize: { width: 100, height: 100 },
      crossHair: { lat: 0, lng: 0 },
      otherProp: 'keep',
      markers: {
        items: [
          { id: 'm1', name: 'One', coords: [0, 0] },
          { id: 'm2', name: 'Two', coords: [1, 1] }
        ]
      }
    }
  })

  test('SET_MAP_READY sets isMapReady to true', () => {
    const result = actionsMap.SET_MAP_READY(state)
    expect(result).toEqual({
      ...state,
      isMapReady: true
    })
  })

  test('MAP_MOVE merges payload into state', () => {
    const payload = { center: [10, 20] }
    const result = actionsMap.MAP_MOVE(state, payload)
    expect(result).toEqual({ ...state, ...payload })
  })

  test('MAP_MOVE_END merges payload into state', () => {
    const payload = { zoom: 5 }
    const result = actionsMap.MAP_MOVE_END(state, payload)
    expect(result).toEqual({ ...state, ...payload })
  })

  test('MAP_FIRST_IDLE merges payload into state', () => {
    const payload = { loaded: true }
    const result = actionsMap.MAP_FIRST_IDLE(state, payload)
    expect(result).toEqual({ ...state, ...payload })
  })

  test('SET_MAP_STYLE sets mapStyle', () => {
    const mapStyle = { id: 'satellite' }
    const result = actionsMap.SET_MAP_STYLE(state, mapStyle)
    expect(result.mapStyle).toBe(mapStyle)
    expect(result.otherProp).toBe(state.otherProp)
  })

  test('SET_MAP_SIZE sets mapSize', () => {
    const newSize = { width: 200, height: 200 }
    const result = actionsMap.SET_MAP_SIZE(state, newSize)
    expect(result.mapSize).toBe(newSize)
  })

  test('UPDATE_CROSS_HAIR merges payload into crossHair', () => {
    const marker = { lat: 10, lng: 20 }
    const result = actionsMap.UPDATE_CROSS_HAIR(state, marker)
    expect(result.crossHair).toEqual({ ...state.crossHair, ...marker })
  })

  // --- New tests for upsert/remove location markers ---

  test('UPSERT_LOCATION_MARKER updates an existing marker with same id', () => {
    const payload = { id: 'm2', name: 'Two-updated', coords: [2, 2], extra: 'x' }
    const result = actionsMap.UPSERT_LOCATION_MARKER(state, payload)

    // new items should have same length (replace m2)
    expect(result.markers.items).toHaveLength(state.markers.items.length)

    // find updated marker
    const updated = result.markers.items.find(i => i.id === 'm2')
    expect(updated).toEqual(payload)

    // original state must not be mutated
    expect(state.markers.items.find(i => i.id === 'm2')).toEqual({ id: 'm2', name: 'Two', coords: [1, 1] })
    expect(result.markers.items).not.toBe(state.markers.items)
  })

  test('UPSERT_LOCATION_MARKER inserts a new marker if id not present', () => {
    const payload = { id: 'm3', name: 'Three', coords: [3, 3] }

    const result = actionsMap.UPSERT_LOCATION_MARKER(state, payload)

    // new items should be length +1
    expect(result.markers.items).toHaveLength(state.markers.items.length + 1)

    // new marker present
    const added = result.markers.items.find(i => i.id === 'm3')
    expect(added).toEqual(payload)

    // original state must not be mutated
    expect(state.markers.items.find(i => i.id === 'm3')).toBeUndefined()
    expect(result.markers.items).not.toBe(state.markers.items)
  })

  test('REMOVE_LOCATION_MARKER removes the specified marker by id', () => {
    const result = actionsMap.REMOVE_LOCATION_MARKER(state, 'm1')

    // m1 should be removed
    expect(result.markers.items.find(i => i.id === 'm1')).toBeUndefined()

    // remaining items should still contain m2
    expect(result.markers.items.find(i => i.id === 'm2')).toBeDefined()
    expect(result.markers.items).toHaveLength(1)

    // original state must not be mutated
    expect(state.markers.items.find(i => i.id === 'm1')).toBeDefined()
    expect(result.markers.items).not.toBe(state.markers.items)
  })
})
