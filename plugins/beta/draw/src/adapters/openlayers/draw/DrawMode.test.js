import { createDrawMode, buildCondition } from './DrawMode.js'
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
  const conditionFor = (sketch) => buildCondition(map, 'LineString', () => sketch)

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
    const condition = buildCondition(blindMap, 'LineString', () => lineFeature([[10, 10], [50, 50]]))
    expect(condition(click(10, 10))).toBe(true)
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
