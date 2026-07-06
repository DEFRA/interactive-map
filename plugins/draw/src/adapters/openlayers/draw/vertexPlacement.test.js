import Point from 'ol/geom/Point.js'
import Polygon from 'ol/geom/Polygon.js'
import Feature from 'ol/Feature.js'
import { createVertexPlacement, applyRubberbanding, isCloseToFirstVertex } from './vertexPlacement.js'
import { createFakeMap, createEmitter, polygonFeature, lineFeature } from '../__helpers__/harness.js'

const CENTER = [5, 5]

const setup = ({ interfaceType = 'touch', snap = null, canFinish = () => true } = {}) => {
  const map = createFakeMap()
  const bus = createEmitter()
  const drawInteraction = {
    on: bus.on,
    emit: bus.emit,
    getMap: () => map,
    appendCoordinates: jest.fn(),
    finishDrawing: jest.fn()
  }
  const placement = createVertexPlacement({
    drawInteraction,
    mapProvider: { getCenter: () => CENTER },
    snap,
    canFinish,
    getInterfaceType: () => interfaceType
  })
  const startSketch = (feature) => { bus.emit('drawstart', { feature }); return feature }
  return { drawInteraction, placement, startSketch, bus }
}

describe('placing vertices', () => {
  test('appends the crosshair position, snapped when a snap manager is active', () => {
    const { placement, drawInteraction } = setup()
    placement.placeVertex()
    expect(drawInteraction.appendCoordinates).toHaveBeenCalledWith([CENTER])

    const snap = { apply: jest.fn(() => [9, 9]), hideIndicator: jest.fn() }
    const snapped = setup({ snap })
    snapped.placement.placeVertex()
    expect(snapped.drawInteraction.appendCoordinates).toHaveBeenCalledWith([[9, 9]])
    expect(snap.hideIndicator).toHaveBeenCalled()
  })

  test('the mouse interface ignores snapping (the OL snap interaction covers it)', () => {
    const snap = { apply: jest.fn(() => [9, 9]), hideIndicator: jest.fn() }
    const { placement, drawInteraction } = setup({ interfaceType: 'mouse', snap })
    placement.placeVertex()
    expect(drawInteraction.appendCoordinates).toHaveBeenCalledWith([CENTER])
  })

  test('a second tap at the same spot finishes the shape instead of duplicating — when finishable', () => {
    const { placement, drawInteraction, startSketch } = setup()
    startSketch(lineFeature([[0, 0], [50, 50]]))
    placement.placeVertex()
    placement.placeVertex()
    expect(drawInteraction.appendCoordinates).toHaveBeenCalledTimes(1)
    expect(drawInteraction.finishDrawing).toHaveBeenCalledTimes(1)

    const unfinishable = setup({ canFinish: () => false })
    unfinishable.startSketch(lineFeature([[0, 0], [50, 50]]))
    unfinishable.placement.placeVertex()
    unfinishable.placement.placeVertex()
    unfinishable.placement.placeVertex() // duplicate reset the bookkeeping — placed again
    expect(unfinishable.drawInteraction.finishDrawing).not.toHaveBeenCalled()
    expect(unfinishable.drawInteraction.appendCoordinates).toHaveBeenCalledTimes(2)
  })

  test('placing near the first polygon vertex closes the ring', () => {
    const { placement, drawInteraction, startSketch } = setup()
    startSketch(polygonFeature([[0, 0], [30, 0], [30, 30], [8, 8], [0, 0]])) // center [5,5] within 12px of [0,0]
    placement.placeVertex()
    expect(drawInteraction.finishDrawing).toHaveBeenCalled()
    expect(drawInteraction.appendCoordinates).not.toHaveBeenCalled()
  })

  test('a vertex OL already committed at the same position is not appended twice', () => {
    const { placement, drawInteraction, startSketch } = setup()
    startSketch(lineFeature([[0, 0], [5, 6], [50, 50]])) // last committed [5,6] within 2px of center
    placement.placeVertex()
    expect(drawInteraction.appendCoordinates).not.toHaveBeenCalled()
    placement.placeVertex() // now registered as last placed — same spot again closes
    expect(drawInteraction.finishDrawing).toHaveBeenCalled()
  })

  test('the first vertex of a fresh sketch appends — nothing is committed yet', () => {
    const { placement, drawInteraction, startSketch } = setup()
    startSketch(lineFeature([[0, 0]])) // only the rubber-band coord, no committed vertex
    placement.placeVertex()
    expect(drawInteraction.appendCoordinates).toHaveBeenCalledWith([CENTER])
  })

  test('an unprojectable committed vertex skips the duplicate-tolerance check', () => {
    const { placement, drawInteraction, startSketch } = setup()
    startSketch(lineFeature([[0, 0], [5, 6], [50, 50]]))
    drawInteraction.getMap().getPixelFromCoordinate = () => null // mid view transition
    placement.placeVertex()
    expect(drawInteraction.appendCoordinates).toHaveBeenCalledWith([CENTER])
  })

  test('placing into an empty polygon sketch (no ring yet) appends without error', () => {
    const { placement, drawInteraction, startSketch } = setup()
    startSketch(new Feature(new Polygon([]))) // ring not created yet
    placement.placeVertex()
    expect(drawInteraction.appendCoordinates).toHaveBeenCalledWith([CENTER])
  })

  test('clearLastCoord and sketch end/abort reset the duplicate bookkeeping', () => {
    const { placement, drawInteraction, startSketch, bus } = setup()
    startSketch(lineFeature([[0, 0], [50, 50]]))
    placement.placeVertex()
    placement.clearLastCoord()
    placement.placeVertex()
    expect(drawInteraction.appendCoordinates).toHaveBeenCalledTimes(2)

    bus.emit('drawend')
    placement.placeVertex() // no sketch — plain append
    expect(drawInteraction.appendCoordinates).toHaveBeenCalledTimes(3)
    bus.emit('drawabort')
  })
})

describe('rubber-banding', () => {
  test('moves the trailing coordinate of a line or polygon ring to the crosshair', () => {
    const { placement, startSketch } = setup()
    const line = startSketch(lineFeature([[0, 0], [50, 50]]))
    placement.updateRubberbanding()
    expect(line.getGeometry().getCoordinates()).toEqual([[0, 0], CENTER])

    const poly = setup()
    const hole = [[10, 10], [12, 10], [12, 12], [10, 10]]
    const feature = poly.startSketch(new Feature(new Polygon([[[0, 0], [30, 0], [50, 50], [0, 0]], hole])))
    poly.placement.updateRubberbanding()
    expect(feature.getGeometry().getCoordinates()[0].at(-1)).toEqual(CENTER)
    expect(feature.getGeometry().getCoordinates()[1]).toEqual(hole) // inner rings untouched
  })

  test('without a sketch it only refreshes the snap indicator at the crosshair (non-mouse)', () => {
    const snap = { apply: jest.fn((c) => c), hideIndicator: jest.fn() }
    const { placement } = setup({ snap })
    placement.updateRubberbanding()
    expect(snap.apply).toHaveBeenCalledWith(CENTER)

    const mouse = setup({ interfaceType: 'mouse', snap })
    snap.apply.mockClear()
    mouse.placement.updateRubberbanding()
    expect(snap.apply).not.toHaveBeenCalled()
  })

  test('an empty sketch geometry is left alone', () => {
    const { placement, startSketch } = setup()
    const line = startSketch(lineFeature([]))
    placement.updateRubberbanding() // must not throw
    expect(line.getGeometry().getCoordinates()).toEqual([])
  })

  test('applyRubberbanding ignores unsupported geometry types', () => {
    const point = new Point([1, 1])
    applyRubberbanding(point, CENTER)
    expect(point.getCoordinates()).toEqual([1, 1])
  })
})

describe('isCloseToFirstVertex', () => {
  const map = createFakeMap()

  test('only closes polygons with enough vertices, within the snap tolerance', () => {
    const ring = [[0, 0], [30, 0], [30, 30], [8, 8], [0, 0]]
    expect(isCloseToFirstVertex(map, [5, 5], ring, 'Polygon')).toBe(true)
    expect(isCloseToFirstVertex(map, [20, 20], ring, 'Polygon')).toBe(false)
    expect(isCloseToFirstVertex(map, [5, 5], ring, 'LineString')).toBe(false)
    expect(isCloseToFirstVertex(map, [5, 5], [[0, 0], [30, 0]], 'Polygon')).toBe(false)
  })

  test('is false when a coordinate cannot be projected to a pixel', () => {
    const nullMap = { getPixelFromCoordinate: () => null }
    expect(isCloseToFirstVertex(nullMap, [5, 5], [[0, 0], [1, 1], [2, 2], [3, 3]], 'Polygon')).toBe(false)
  })
})
