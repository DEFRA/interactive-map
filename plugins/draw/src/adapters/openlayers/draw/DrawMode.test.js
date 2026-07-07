import { createDrawMode, buildCondition, buildCanPlaceVertex } from './DrawMode.js'
import { createDrawInput } from './drawInput.js'
import { createFeatureStore } from '../core/featureStore.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'
import { STYLES_CHANGED_EVENT } from '../core/internalEvents.js'
import { createFakeMap, createFakeManager, polygonFeature, lineFeature } from '../__helpers__/harness.js'

jest.mock('./drawInput.js', () => ({
  createDrawInput: jest.fn(() => ({
    getInterfaceType: jest.fn(() => 'keyboard'),
    destroy: jest.fn()
  }))
}))

const setup = (geometryType = 'Polygon') => {
  const map = createFakeMap()
  const manager = createFakeManager()
  manager.store = createFeatureStore()
  const emitted = () => manager.emit.mock.calls.map(([type, payload]) => ({ type, payload }))
  const mode = createDrawMode({
    map,
    manager,
    options: { geometryType, featureId: 'shape-1', properties: { label: 'field' }, container: null, snap: null }
  })
  const interaction = map.interactions[0]
  const input = createDrawInput.mock.results.at(-1).value
  const inputOptions = createDrawInput.mock.calls.at(-1)[0].options
  return { map, manager, emitted, mode, interaction, input, inputOptions }
}

afterEach(() => jest.clearAllMocks())

describe('buildCondition (duplicate-click suppression)', () => {
  const map = createFakeMap()
  const click = (x, y, originalEvent = {}) => ({ pixel: [x, y], originalEvent })
  const conditionFor = (sketch) => buildCondition(map, 'LineString', () => sketch, () => true)

  test('modifier-key clicks never draw', () => {
    expect(conditionFor(null)(click(0, 0, { shiftKey: true }))).toBe(false)
  })

  test('clicks always draw before the sketch exists or once the shape is finishable', () => {
    expect(conditionFor(null)(click(0, 0))).toBe(true)
    const finishable = lineFeature([[0, 0], [10, 0], [50, 50]]) // 2 placed ≥ line minimum
    expect(conditionFor(finishable)(click(10, 1))).toBe(true)
  })

  test('while unfinishable, clicks on the last placed vertex are suppressed', () => {
    const oneVertex = lineFeature([[10, 10], [50, 50]]) // 1 placed + rubber
    expect(conditionFor(oneVertex)(click(11, 11))).toBe(false)
    expect(conditionFor(oneVertex)(click(20, 20))).toBe(true)
  })

  test('degenerate sketches or unprojectable vertices do not block drawing', () => {
    expect(conditionFor(lineFeature([[10, 10]]))(click(10, 10))).toBe(true) // nothing placed yet
    const blindMap = { getPixelFromCoordinate: () => null }
    const condition = buildCondition(blindMap, 'LineString', () => lineFeature([[10, 10], [50, 50]]), () => true)
    expect(condition(click(10, 10))).toBe(true)
  })
})

describe('buildCondition (placement gate, polygon)', () => {
  const map = createFakeMap()
  // Polygon sketch: 3 placed vertices + 2 trailing (rubber-band + closing) coords.
  const polyClick = (coordinate) => ({ pixel: [0, 0], originalEvent: {}, coordinate })
  const condition = (ring, manager = createFakeManager()) => {
    const getSketch = () => polygonFeature(ring)
    const gate = buildCanPlaceVertex({ manager, geometryType: 'Polygon', getSketch })
    return buildCondition(map, 'Polygon', getSketch, gate)
  }

  test('rejects a click that would make the drawn path cross itself', () => {
    const sketch = [[0, 0], [2, 2], [2, 0], [9, 9], [0, 0]] // placed: (0,0)(2,2)(2,0)
    expect(condition(sketch)(polyClick([0, 2]))).toBe(false)
  })

  test('allows a click that keeps the path simple', () => {
    const sketch = [[0, 0], [2, 0], [2, 2], [9, 9], [0, 0]] // placed: (0,0)(2,0)(2,2)
    expect(condition(sketch)(polyClick([0, 2]))).toBe(true)
  })
})

describe('buildCanPlaceVertex', () => {
  const gateFor = (ring, manager) =>
    buildCanPlaceVertex({ manager, geometryType: 'Polygon', getSketch: () => (ring ? polygonFeature(ring) : null) })

  test('a hard-rule veto emits PLACEMENT_BLOCKED with the candidate and reason', () => {
    const manager = createFakeManager()
    const gate = gateFor([[0, 0], [2, 2], [2, 0], [9, 9], [0, 0]], manager)
    expect(gate([0, 2])).toBe(false)
    expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.PLACEMENT_BLOCKED, expect.objectContaining({
      kind: 'place',
      mode: 'draw_polygon',
      vertexIndex: 3,
      reason: expect.any(String),
      feature: expect.objectContaining({ type: 'Feature' })
    }))
  })

  test('the user callback can veto a placement (and receives kind "place")', () => {
    const manager = createFakeManager()
    manager._geometryValidator = jest.fn((feature, context) =>
      context.kind === 'place' ? { valid: false, reason: 'outside region' } : { valid: true })
    const gate = gateFor([[0, 0], [2, 0], [9, 9], [0, 0]], manager)
    expect(gate([5, 5])).toBe(false)
    expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.PLACEMENT_BLOCKED,
      expect.objectContaining({ reason: 'outside region', kind: 'place' }))
  })

  test('the user callback can veto the very first vertex (no sketch yet)', () => {
    const manager = createFakeManager()
    manager._geometryValidator = () => ({ valid: false, reason: 'outside region' })
    const gate = gateFor(null, manager)
    expect(gate([5, 5])).toBe(false)
    expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.PLACEMENT_BLOCKED,
      expect.objectContaining({ vertexIndex: 0 }))
  })

  test('a valid placement passes and emits nothing', () => {
    const manager = createFakeManager()
    manager._geometryValidator = jest.fn(() => true)
    const gate = gateFor([[0, 0], [2, 0], [9, 9], [0, 0]], manager)
    expect(gate([2, 2])).toBe(true)
    expect(manager.emit).not.toHaveBeenCalled()
  })
})

describe('drawing lifecycle', () => {
  test('the sketch reports its placed vertex count on every geometry change', () => {
    const { emitted, interaction } = setup()
    const sketch = polygonFeature([[0, 0], [5, 5], [0, 0]])
    interaction.dispatchEvent({ type: 'drawstart', feature: sketch })
    sketch.getGeometry().setCoordinates([[[0, 0], [10, 0], [5, 5], [0, 0]]])
    expect(emitted().at(-1)).toEqual({ type: ADAPTER_EVENTS.VERTEX_CHANGE, payload: { numVertices: 2 } })
  })

  test('finishCondition blocks finishing while the geometry is invalid', () => {
    const { manager, interaction } = setup()
    manager._geometryValid = false
    expect(interaction.finishCondition_()).toBe(false)
    manager._geometryValid = true
    expect(interaction.finishCondition_()).toBe(true)
  })

  test('the live check turns the sketch stroke dashed while the displayed ring self-intersects', () => {
    const { manager, interaction } = setup('Polygon')
    const sketch = polygonFeature([[0, 0], [5, 5], [0, 0]])
    interaction.dispatchEvent({ type: 'drawstart', feature: sketch })
    // Placed (0,0)(10,10)(10,0) + rubber-band (0,10) + closing — a bowtie.
    sketch.getGeometry().setCoordinates([[[0, 0], [10, 10], [10, 0], [0, 10], [0, 0]]])
    expect(manager.styles.createSketchStyle).toHaveBeenLastCalledWith('Polygon', true)
    // Rubber-band moves back to a simple ring → solid again.
    sketch.getGeometry().setCoordinates([[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]])
    expect(manager.styles.createSketchStyle).toHaveBeenLastCalledWith('Polygon', false)
  })

  test('the live check only restyles when the invalid state flips, not on every move', () => {
    const { manager, interaction } = setup('Polygon')
    const sketch = polygonFeature([[0, 0], [5, 5], [0, 0]])
    interaction.dispatchEvent({ type: 'drawstart', feature: sketch })
    sketch.getGeometry().setCoordinates([[[0, 0], [10, 10], [10, 0], [0, 10], [0, 0]]])
    const styleCalls = manager.styles.createSketchStyle.mock.calls.length
    sketch.getGeometry().setCoordinates([[[0, 0], [10, 10], [10, 0], [1, 10], [0, 0]]]) // still crossing
    expect(manager.styles.createSketchStyle.mock.calls.length).toBe(styleCalls)
  })

  test('placing a valid vertex keeps the stroke solid while the rubber band still sits on it', () => {
    const { manager, interaction } = setup('Polygon')
    const sketch = polygonFeature([[0, 0], [5, 5], [0, 0]])
    interaction.dispatchEvent({ type: 'drawstart', feature: sketch })
    // 3 placed + rubber band duplicating the just-placed vertex + closing coord.
    sketch.getGeometry().setCoordinates([[[0, 0], [10, 0], [10, 10], [10, 10], [0, 0]]])
    expect(manager.styles.createSketchStyle).not.toHaveBeenCalledWith('Polygon', true)
  })

  test('2 placed vertices + cursor never go dashed (below the 4-point threshold)', () => {
    const { manager, interaction } = setup('Polygon')
    const sketch = polygonFeature([[0, 0], [5, 5], [0, 0]])
    interaction.dispatchEvent({ type: 'drawstart', feature: sketch })
    sketch.getGeometry().setCoordinates([[[0, 0], [10, 10], [5, 0], [0, 0]]]) // 2 placed + rubber
    expect(manager.styles.createSketchStyle).not.toHaveBeenCalledWith('Polygon', true)
  })

  test('drawInput receives the placement gate for touch/keyboard placements', () => {
    const { inputOptions } = setup('Polygon')
    expect(typeof inputOptions.canPlace).toBe('function')
  })

  test('setInvalid rebuilds the sketch style in the invalid variant and re-renders', () => {
    const { mode, manager, interaction } = setup('Polygon')
    const changed = jest.spyOn(interaction.overlay_, 'changed')
    mode.setInvalid(true)
    expect(manager.styles.createSketchStyle).toHaveBeenLastCalledWith('Polygon', true)
    expect(changed).toHaveBeenCalled()
  })

  test('undo re-validates the committed shape (deferred, kind delete)', () => {
    jest.useFakeTimers()
    const { mode, manager, emitted, interaction } = setup()
    const sketch = polygonFeature([[0, 0], [10, 0], [5, 5], [0, 0]])
    interaction.dispatchEvent({ type: 'drawstart', feature: sketch })
    jest.spyOn(interaction, 'removeLastPoint').mockImplementation(() => {})
    manager.emit.mockClear()
    mode.undo()
    jest.runAllTimers()
    expect(emitted().filter((e) => e.type === ADAPTER_EVENTS.GEOMETRY_CHANGE).pop()?.payload).toEqual(
      expect.objectContaining({ kind: 'delete', feature: expect.any(Object) }))
    jest.useRealTimers()
  })

  test('placing a vertex emits a deferred commit-level geometrychange for validation', () => {
    jest.useFakeTimers()
    const { emitted, interaction } = setup()
    const sketch = polygonFeature([[0, 0], [5, 5], [0, 0]])
    interaction.dispatchEvent({ type: 'drawstart', feature: sketch })
    sketch.getGeometry().setCoordinates([[[0, 0], [10, 0], [5, 5], [0, 0]]])
    // Deferred a tick to avoid re-entrancy — not emitted synchronously.
    expect(emitted().some((e) => e.type === ADAPTER_EVENTS.GEOMETRY_CHANGE)).toBe(false)
    jest.runAllTimers()
    const geom = emitted().find((e) => e.type === ADAPTER_EVENTS.GEOMETRY_CHANGE)
    expect(geom.payload).toEqual(expect.objectContaining({ kind: 'add' }))
    jest.useRealTimers()
  })

  test('does not re-emit an add when the placed count is unchanged', () => {
    jest.useFakeTimers()
    const { emitted, interaction } = setup()
    const sketch = polygonFeature([[0, 0], [5, 5], [0, 0]])
    interaction.dispatchEvent({ type: 'drawstart', feature: sketch })
    sketch.getGeometry().setCoordinates([[[0, 0], [10, 0], [5, 5], [0, 0]]]) // placed grows to 2 → one add
    sketch.getGeometry().setCoordinates([[[0, 0], [10, 0], [7, 7], [0, 0]]]) // rubber moved, placed still 2
    jest.runAllTimers()
    expect(emitted().filter((e) => e.type === ADAPTER_EVENTS.GEOMETRY_CHANGE)).toHaveLength(1)
    jest.useRealTimers()
  })

  test('emits the placed line vertices as a LineString geometrychange', () => {
    jest.useFakeTimers()
    const { emitted, interaction } = setup('LineString')
    const sketch = lineFeature([[0, 0], [5, 5]])
    interaction.dispatchEvent({ type: 'drawstart', feature: sketch })
    sketch.getGeometry().setCoordinates([[0, 0], [10, 0], [5, 5]])
    jest.runAllTimers()
    const geom = emitted().find((e) => e.type === ADAPTER_EVENTS.GEOMETRY_CHANGE)
    expect(geom.payload.feature.geometry.type).toBe('LineString')
    jest.useRealTimers()
  })

  test('vertex tracking becomes inert once the sketch is cleared', () => {
    jest.useFakeTimers()
    const { emitted, interaction, mode } = setup()
    const sketch = polygonFeature([[0, 0], [5, 5], [0, 0]])
    interaction.dispatchEvent({ type: 'drawstart', feature: sketch })
    sketch.getGeometry().setCoordinates([[[0, 0], [10, 0], [5, 5], [0, 0]]]) // schedules a deferred add emit
    mode.destroy() // clears the sketch reference
    sketch.getGeometry().setCoordinates([[[0, 0], [12, 0], [6, 6], [0, 0]]]) // updateVertexCount now a no-op
    jest.runAllTimers() // the earlier deferred emit sees no sketch
    expect(emitted().some((e) => e.type === ADAPTER_EVENTS.GEOMETRY_CHANGE)).toBe(false)
    jest.useRealTimers()
  })

  test('finishing hands the feature over with the requested id and properties', () => {
    const { manager, emitted, interaction } = setup()
    interaction.dispatchEvent({ type: 'drawend', feature: polygonFeature([[0, 0], [10, 0], [10, 10], [0, 0]], null) })
    const created = emitted().find((e) => e.type === ADAPTER_EVENTS.CREATE)
    expect(created.payload).toMatchObject({ id: 'shape-1', properties: { label: 'field' } })
    expect(manager.store.getOL('shape-1')).not.toBeNull()
  })

  test('aborting cancels', () => {
    const { emitted, interaction } = setup()
    interaction.dispatchEvent({ type: 'drawabort' })
    expect(emitted()).toContainEqual({ type: ADAPTER_EVENTS.CANCEL, payload: undefined })
  })

  test('the interaction consults the duplicate-suppression condition against the live sketch', () => {
    const { interaction } = setup('LineString')
    expect(interaction.condition_({ pixel: [11, 11], originalEvent: {} })).toBe(true) // no sketch yet
    interaction.dispatchEvent({ type: 'drawstart', feature: lineFeature([[11, 11], [50, 50]]) })
    expect(interaction.condition_({ pixel: [11, 11], originalEvent: {} })).toBe(false) // on last placed
  })

  test('done() finishes only when the shape has enough vertices', () => {
    const { mode, interaction } = setup()
    const finish = jest.spyOn(interaction, 'finishDrawing').mockImplementation(() => {})
    mode.done() // no sketch at all
    interaction.dispatchEvent({ type: 'drawstart', feature: polygonFeature([[0, 0], [10, 0], [5, 5], [0, 0]]) })
    mode.done() // 2 placed < polygon minimum of 3
    expect(finish).not.toHaveBeenCalled()

    interaction.dispatchEvent({ type: 'drawstart', feature: polygonFeature([[0, 0], [10, 0], [10, 10], [5, 5], [0, 0]]) })
    mode.done()
    expect(finish).toHaveBeenCalled()
  })

  test('cancel() aborts the sketch; undo() removes the last point and re-reports the count', () => {
    const { mode, emitted, interaction } = setup()
    const abort = jest.spyOn(interaction, 'abortDrawing').mockImplementation(() => {})
    const removeLast = jest.spyOn(interaction, 'removeLastPoint').mockImplementation(() => {})
    mode.cancel()
    expect(abort).toHaveBeenCalled()

    interaction.dispatchEvent({ type: 'drawstart', feature: polygonFeature([[0, 0], [10, 0], [5, 5], [0, 0]]) })
    mode.undo()
    expect(removeLast).toHaveBeenCalled()
    expect(emitted().at(-1)).toEqual({ type: ADAPTER_EVENTS.VERTEX_CHANGE, payload: { numVertices: 2 } })
  })

  test('undo before any sketch exists re-reports nothing', () => {
    const { mode, emitted, interaction } = setup()
    jest.spyOn(interaction, 'removeLastPoint').mockImplementation(() => {})
    mode.undo() // no sketch yet → updateVertexCount returns early
    expect(emitted().some((e) => e.type === ADAPTER_EVENTS.VERTEX_CHANGE)).toBe(false)
  })
})

describe('wiring', () => {
  test('the drawInput gets working undo and canFinish callbacks', () => {
    const { interaction, inputOptions } = setup('LineString')
    const removeLast = jest.spyOn(interaction, 'removeLastPoint').mockImplementation(() => {})
    expect(inputOptions.canFinish()).toBe(false) // no sketch yet
    interaction.dispatchEvent({ type: 'drawstart', feature: lineFeature([[0, 0], [10, 0], [5, 5]]) })
    expect(inputOptions.canFinish()).toBe(true)
    inputOptions.onUndo()
    expect(removeLast).toHaveBeenCalled()
  })

  test('properties default to an empty object when omitted from options', () => {
    const map = createFakeMap()
    const manager = createFakeManager()
    manager.store = createFeatureStore()
    createDrawMode({ map, manager, options: { geometryType: 'Polygon', featureId: 'shape-2', container: null, snap: null } })
    map.interactions[0].dispatchEvent({ type: 'drawend', feature: polygonFeature([[0, 0], [10, 0], [10, 10], [0, 0]], null) })
    const created = manager.store.getOL('shape-2')
    expect(created).not.toBeNull()
    expect(created.get('label')).toBeUndefined()
  })

  test('map style changes rebuild the sketch style for the current geometry type', () => {
    const { manager, interaction } = setup()
    expect(manager.styles.createSketchStyle).toHaveBeenCalledWith('Polygon')
    manager.emit(STYLES_CHANGED_EVENT, manager.styles)
    expect(manager.styles.createSketchStyle).toHaveBeenCalledTimes(2)
    expect(interaction.getOverlay().getStyleFunction()({ getGeometry: () => ({ getType: () => 'Point' }) })).toEqual([])
  })

  test('destroy reports the final interface type, tears down input and interaction', () => {
    const { map, mode, emitted, input, interaction } = setup()
    mode.destroy()
    expect(emitted()).toContainEqual({
      type: ADAPTER_EVENTS.INTERFACE_TYPE_CHANGE,
      payload: { interfaceType: 'keyboard' }
    })
    expect(input.destroy).toHaveBeenCalled()
    expect(map.removeInteraction).toHaveBeenCalledWith(interaction)
  })
})
