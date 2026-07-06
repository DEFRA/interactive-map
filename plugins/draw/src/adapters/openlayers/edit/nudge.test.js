import { wireNudge, resolveSnappedCoord } from './nudge.js'
import { getCoords } from '../utils/geometryHelpers.js'
import { createFakeMap, polygonFeature } from '../__helpers__/harness.js'

const RING = [[0, 0], [10, 0], [10, 10], [0, 0]]

const setup = ({ snap = null } = {}) => {
  const map = createFakeMap()
  const olFeature = polygonFeature(RING)
  const state = {
    olFeature,
    selectedVertexIndex: -1,
    selectedVertexType: null,
    vertices: [[0, 0], [10, 0], [10, 10]],
    midpoints: [[5, 0], [10, 5], [5, 5]]
  }
  const setState = jest.fn((updates) => Object.assign(state, updates))
  const onInserted = jest.fn(() => {
    // EditMode's onInserted runs syncGeom, refreshing vertices from the geometry
    state.vertices = getCoords({ type: 'Polygon', coordinates: olFeature.getGeometry().getCoordinates() })
  })
  const { nudge, keyMove } = wireNudge({ map, snap, getState: () => state, setState, onInserted })
  return { olFeature, state, setState, onInserted, nudge, keyMove }
}

const ring = (olFeature) => olFeature.getGeometry().getCoordinates()[0]

describe('nudging a vertex', () => {
  test('a plain arrow moves the selected vertex by the step amount, shift by the fine amount', () => {
    const { state, nudge, olFeature } = setup()
    Object.assign(state, { selectedVertexIndex: 1, selectedVertexType: 'vertex' })
    nudge({ key: 'ArrowRight', shiftKey: false })
    expect(ring(olFeature)[1]).toEqual([15, 0])
    nudge({ key: 'ArrowDown', shiftKey: true })
    expect(ring(olFeature)[1]).toEqual([15, 1])
  })

  test('the start coordinate is captured once for the whole nudge sequence (single undo op)', () => {
    const { state, nudge, keyMove } = setup()
    Object.assign(state, { selectedVertexIndex: 1, selectedVertexType: 'vertex' })
    nudge({ key: 'ArrowRight' })
    nudge({ key: 'ArrowRight' })
    expect(keyMove).toEqual({ start: [10, 0], index: 1 })
  })

  test('does nothing without a feature or a valid selection', () => {
    const { state, nudge, setState } = setup()
    nudge({ key: 'ArrowRight' }) // nothing selected
    state.olFeature = null
    nudge({ key: 'ArrowRight' })
    expect(setState).not.toHaveBeenCalled()
  })
})

describe('nudging a midpoint', () => {
  test('inserts the midpoint as a vertex, then moves and selects it', () => {
    const { state, nudge, onInserted, olFeature, setState } = setup()
    Object.assign(state, { selectedVertexIndex: 4, selectedVertexType: 'midpoint' }) // midpoint [10, 5]
    nudge({ key: 'ArrowRight', shiftKey: false })
    expect(onInserted).toHaveBeenCalledWith({ insertedIndex: 2 })
    expect(ring(olFeature)[2]).toEqual([15, 5])
    expect(setState).toHaveBeenLastCalledWith(expect.objectContaining({
      selectedVertexIndex: 2, selectedVertexType: 'vertex'
    }))
  })

  test('an invalid midpoint index is a no-op', () => {
    const { state, nudge, onInserted } = setup()
    Object.assign(state, { selectedVertexIndex: 99, selectedVertexType: 'midpoint' })
    nudge({ key: 'ArrowRight' })
    expect(onInserted).not.toHaveBeenCalled()
  })

  test('snaps the inserted-then-moved coordinate when a snap manager is active', () => {
    const snap = { apply: jest.fn((c) => [c[0] + 2, c[1]]), hideIndicator: jest.fn(), snapRadius: 12 }
    const { state, nudge, olFeature } = setup({ snap })
    Object.assign(state, { selectedVertexIndex: 4, selectedVertexType: 'midpoint' }) // midpoint [10, 5]
    nudge({ key: 'ArrowRight', shiftKey: false })
    expect(snap.apply).toHaveBeenCalled()
    expect(ring(olFeature)[2]).toEqual([17, 5]) // inserted [10,5] nudged +5 -> [15,5], snapped +2 -> [17,5]
  })

  test('stops safely if the inserted vertex is not reflected in state', () => {
    const { state, nudge, onInserted, setState } = setup()
    onInserted.mockImplementation(() => {}) // consumer failed to sync vertices
    Object.assign(state, { selectedVertexIndex: 1, selectedVertexType: 'midpoint', vertices: [] })
    nudge({ key: 'ArrowRight' }) // insert succeeds but the inserted coord is missing from state
    expect(onInserted).toHaveBeenCalled()
    expect(setState).not.toHaveBeenCalled()
  })
})

describe('snapping while nudging', () => {
  const snapReturning = (impl) => ({ apply: jest.fn(impl), hideIndicator: jest.fn(), snapRadius: 12 })

  test('the snapped coordinate is used when it makes progress in the nudge direction', () => {
    const snap = snapReturning((c) => [c[0] + 1, c[1]])
    const { state, nudge, olFeature } = setup({ snap })
    Object.assign(state, { selectedVertexIndex: 1, selectedVertexType: 'vertex' })
    nudge({ key: 'ArrowRight' })
    expect(ring(olFeature)[1]).toEqual([16, 0])
    expect(snap.hideIndicator).toHaveBeenCalled()
  })

  test('escapes the snap radius when snapping blocks the nudge', () => {
    const snap = snapReturning(() => [10, 0]) // snap holds the vertex in place
    const { state, nudge, olFeature } = setup({ snap })
    Object.assign(state, { selectedVertexIndex: 1, selectedVertexType: 'vertex' })
    nudge({ key: 'ArrowRight' })
    expect(ring(olFeature)[1]).toEqual([23, 0]) // snapRadius + 1 past the original position
  })
})

describe('resolveSnappedCoord', () => {
  test('returns the snapped coordinate without a snap manager or when progress is sufficient', () => {
    const map = createFakeMap()
    expect(resolveSnappedCoord(null, map, [0, 0], [5, 0], [4, 0], 5, 0)).toEqual([4, 0])
    expect(resolveSnappedCoord({ snapRadius: 12 }, map, [0, 0], [5, 0], [4, 0], 5, 0)).toEqual([4, 0])
  })

  test('escapes along both axes of a diagonal nudge when blocked', () => {
    const map = createFakeMap()
    expect(resolveSnappedCoord({ snapRadius: 12 }, map, [0, 0], [5, 5], [0, 0], 5, 5)).toEqual([13, 13])
  })

  test('escapes only the vertical axis when the horizontal delta is zero', () => {
    const map = createFakeMap()
    expect(resolveSnappedCoord({ snapRadius: 12 }, map, [0, 0], [0, 5], [0, 0], 0, 5)).toEqual([0, 13])
  })
})
