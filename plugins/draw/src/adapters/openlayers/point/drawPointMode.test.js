import { createDrawPointMode } from './drawPointMode.js'
import { wireInputEvents, applyCrossHairVisibility } from '../draw/drawInput.js'
import { createFeatureStore } from '../core/featureStore.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'
import { createFakeMap, createFakeManager, pointFeature } from '../__helpers__/harness.js'

jest.mock('../draw/drawInput.js', () => ({
  wireInputEvents: jest.fn(() => ({ destroy: jest.fn() })),
  applyCrossHairVisibility: jest.fn()
}))

// Matches DrawMode.test.js's own convention: real OL interactions are used, but drawstart/
// drawend/drawabort are dispatched as plain event objects directly (rather than exercised
// through the real appendCoordinates/startDrawing_/finishDrawing internals, which need a
// fully-featured OL map — getMap().getView().getProjection() — well beyond what the
// lightweight fake map here provides or needs to).
const setup = (options = {}) => {
  const map = createFakeMap()
  const manager = createFakeManager()
  manager.store = createFeatureStore()
  const emitted = () => manager.emit.mock.calls.map(([type, payload]) => ({ type, payload }))
  const mode = createDrawPointMode({
    map,
    manager,
    options: {
      featureId: 'point-1',
      properties: { symbol: 'pin' },
      container: null,
      crossHair: null,
      snap: null,
      mapProvider: { getCenter: () => [5, 5] },
      ...options
    }
  })
  const interaction = map.interactions[0]
  const wireArgs = wireInputEvents.mock.calls.at(-1)[0]
  return { map, manager, emitted, mode, interaction, wireArgs }
}

afterEach(() => jest.clearAllMocks())

describe('createDrawPointMode', () => {
  test('adds a Point-type Draw interaction to the map', () => {
    const { interaction } = setup()
    expect(interaction).toBeDefined()
  })

  test('suppresses OL\'s default sketch style — no blue cursor-following circle', () => {
    const { interaction } = setup()
    // OL stores the resolved style on the sketch overlay layer, not on the interaction
    // itself — this is what OL actually calls per frame to render the sketch/hover point.
    expect(interaction.overlay_.getStyle()()).toEqual([])
  })

  test('drawend commits the sketch under the requested id and fires CREATE', () => {
    const { interaction, manager, emitted } = setup()
    interaction.dispatchEvent({ type: 'drawend', feature: pointFeature([1, 2], 'ol-generated-id') })

    const created = emitted().filter((e) => e.type === ADAPTER_EVENTS.CREATE)
    expect(created).toHaveLength(1)
    expect(created[0].payload.id).toBe('point-1') // re-id'd, not the OL-generated one
    expect(created[0].payload.geometry.coordinates).toEqual([1, 2])
    expect(created[0].payload.properties).toEqual({ symbol: 'pin' })
    expect(manager.store.get('point-1')).toBeTruthy()
  })

  test('calls the adapter-injected resolvePointSymbol hook with the committed OL feature, after re-id', () => {
    const resolvePointSymbol = jest.fn()
    const { interaction } = setup({ resolvePointSymbol })
    interaction.dispatchEvent({ type: 'drawend', feature: pointFeature([1, 2], 'ol-generated-id') })

    expect(resolvePointSymbol).toHaveBeenCalledTimes(1)
    const [olFeature] = resolvePointSymbol.mock.calls[0]
    expect(olFeature.getId()).toBe('point-1')
  })

  test('does not throw when no resolvePointSymbol hook was supplied', () => {
    const { interaction } = setup()
    expect(() => interaction.dispatchEvent({ type: 'drawend', feature: pointFeature([1, 2], 'ol-generated-id') })).not.toThrow()
  })

  test('defaults properties to {} when none are supplied', () => {
    const { interaction, manager, emitted } = setup({ properties: undefined })
    interaction.dispatchEvent({ type: 'drawend', feature: pointFeature([1, 2], 'ol-generated-id') })
    const created = emitted().filter((e) => e.type === ADAPTER_EVENTS.CREATE)
    // OL's GeoJSON writer reports no properties as null (not {}) — the meaningful
    // assertion is what setProperties() was actually called with, on the stored feature.
    expect(created[0].payload.properties).toBeNull()
    const { geometry, ...nonGeometryProps } = manager.store.getOL('point-1').getProperties()
    expect(nonGeometryProps).toEqual({})
  })

  test('condition vetoes placement via onGeometryChange', () => {
    const { interaction, manager, emitted } = setup()
    manager._geometryValidator = () => ({ valid: false, reason: 'not allowed here' })
    const condition = interaction.condition_
    const allowed = condition({ coordinate: [1, 2], originalEvent: {} })
    expect(allowed).toBe(false)
    const blocked = emitted().filter((e) => e.type === ADAPTER_EVENTS.PLACEMENT_BLOCKED)
    expect(blocked).toHaveLength(1)
    expect(blocked[0].payload).toMatchObject({ reason: 'not allowed here', phase: 'place', mode: 'draw_point' })
  })

  test('condition allows an unvetoed placement', () => {
    const { interaction } = setup()
    const condition = interaction.condition_
    expect(condition({ coordinate: [1, 2], originalEvent: {} })).toBe(true)
  })

  test('condition blocks modifier-key clicks', () => {
    const { interaction } = setup()
    const condition = interaction.condition_
    expect(condition({ coordinate: [1, 2], originalEvent: { shiftKey: true } })).toBe(false)
  })

  test('drawabort emits CANCEL', () => {
    const { interaction, emitted } = setup()
    interaction.dispatchEvent({ type: 'drawabort' })
    expect(emitted().some((e) => e.type === ADAPTER_EVENTS.CANCEL)).toBe(true)
  })

  describe('touch/keyboard placement (via the wired placeVertex callback)', () => {
    // appendCoordinates()/finishDrawing() are OL-internal machinery already exercised by
    // OL's own test suite — what this mode owns is calling them with the right (possibly
    // snapped) coordinate, gated by the same placement veto the mouse path uses.
    const spyOnCommit = (interaction) => ({
      append: jest.spyOn(interaction, 'appendCoordinates').mockImplementation(() => {}),
      finish: jest.spyOn(interaction, 'finishDrawing').mockImplementation(() => {})
    })

    test('places at the (possibly snapped) map centre and hides the indicator', () => {
      const snap = { apply: jest.fn((c) => [c[0] + 1, c[1] + 1]), hideIndicator: jest.fn() }
      const mapProvider = { getCenter: () => [5, 5] }
      const { wireArgs, interaction } = setup({ snap, mapProvider, interfaceType: 'touch' })
      const { append, finish } = spyOnCommit(interaction)

      wireArgs.placeVertex()

      expect(snap.apply).toHaveBeenCalledWith([5, 5])
      expect(snap.hideIndicator).toHaveBeenCalled()
      expect(append).toHaveBeenCalledWith([[6, 6]])
      expect(finish).toHaveBeenCalled()
    })

    test('does not snap on mouse interface', () => {
      const snap = { apply: jest.fn(), hideIndicator: jest.fn() }
      const { wireArgs, interaction } = setup({ snap, interfaceType: 'mouse' })
      const { append } = spyOnCommit(interaction)
      wireArgs.placeVertex()
      expect(snap.apply).not.toHaveBeenCalled()
      expect(append).toHaveBeenCalledWith([[5, 5]])
    })

    test('a vetoed crosshair placement never commits', () => {
      const { wireArgs, manager, emitted, interaction } = setup()
      const { append, finish } = spyOnCommit(interaction)
      manager._geometryValidator = () => false
      wireArgs.placeVertex()
      expect(append).not.toHaveBeenCalled()
      expect(finish).not.toHaveBeenCalled()
      expect(emitted().filter((e) => e.type === ADAPTER_EVENTS.PLACEMENT_BLOCKED)).toHaveLength(1)
    })

    test('updateRubberbanding shows the snap indicator at the crosshair for touch/keyboard, not mouse', () => {
      const snap = { apply: jest.fn(), hideIndicator: jest.fn() }
      const mapProvider = { getCenter: () => [7, 7] }
      const { wireArgs } = setup({ snap, mapProvider, interfaceType: 'keyboard' })
      wireArgs.updateRubberbanding()
      expect(snap.apply).toHaveBeenCalledWith([7, 7])
    })

    test('updateRubberbanding does nothing on mouse interface', () => {
      const snap = { apply: jest.fn(), hideIndicator: jest.fn() }
      const { wireArgs } = setup({ snap, interfaceType: 'mouse' })
      wireArgs.updateRubberbanding()
      expect(snap.apply).not.toHaveBeenCalled()
    })

    // Regression: without this, switching to touch/keyboard left the indicator hidden until
    // the next pointermove/change:center — mirrors draw/drawInput.js's createDrawInput and
    // the MapLibre adapter's onInterfaceTypeChange (which calls onMove(state) for the same
    // reason).
    test('switching interface type via the wired setInterfaceType immediately refreshes the snap indicator at the crosshair', () => {
      const snap = { apply: jest.fn(), hideIndicator: jest.fn() }
      const mapProvider = { getCenter: () => [9, 9] }
      const { wireArgs } = setup({ snap, mapProvider, interfaceType: 'mouse' })
      wireArgs.setInterfaceType('touch')
      expect(snap.apply).toHaveBeenCalledWith([9, 9])
    })

    test('switching interface type via the wired setInterfaceType does not query snap for mouse', () => {
      const snap = { apply: jest.fn(), hideIndicator: jest.fn() }
      const { wireArgs } = setup({ snap, interfaceType: 'touch' })
      wireArgs.setInterfaceType('mouse')
      expect(snap.apply).not.toHaveBeenCalled()
    })

    test('clearLastCoord is a harmless no-op (points have no lastPlacedCoord bookkeeping)', () => {
      const { wireArgs } = setup()
      expect(() => wireArgs.clearLastCoord()).not.toThrow()
    })
  })

  test('applies crosshair visibility for the initial interface type on setup', () => {
    setup({ interfaceType: 'touch' })
    expect(applyCrossHairVisibility).toHaveBeenCalledWith(null, 'touch')
  })

  describe('mode API', () => {
    test('done/undo are no-ops — a single click has nothing pending or to undo', () => {
      const { mode } = setup()
      expect(() => mode.done()).not.toThrow()
      expect(() => mode.undo()).not.toThrow()
    })

    test('cancel aborts the in-progress sketch', () => {
      const { mode, interaction } = setup()
      const abortSpy = jest.spyOn(interaction, 'abortDrawing').mockImplementation(() => {})
      mode.cancel()
      expect(abortSpy).toHaveBeenCalled()
    })

    test('setInterfaceType delegates to applyCrossHairVisibility', () => {
      const { mode } = setup()
      applyCrossHairVisibility.mockClear()
      mode.setInterfaceType('touch')
      expect(applyCrossHairVisibility).toHaveBeenCalledWith(null, 'touch')
    })

    test('setInterfaceType also refreshes the snap indicator at the crosshair for touch/keyboard', () => {
      const snap = { apply: jest.fn(), hideIndicator: jest.fn() }
      const mapProvider = { getCenter: () => [3, 4] }
      const { mode } = setup({ snap, mapProvider })
      mode.setInterfaceType('keyboard')
      expect(snap.apply).toHaveBeenCalledWith([3, 4])
    })

    test('destroy emits the final interface type, tears down input and removes the interaction', () => {
      const { mode, map, interaction, emitted } = setup()
      const removeSpy = jest.spyOn(map, 'removeInteraction')
      mode.destroy()
      expect(emitted().some((e) => e.type === ADAPTER_EVENTS.INTERFACE_TYPE_CHANGE)).toBe(true)
      expect(removeSpy).toHaveBeenCalledWith(interaction)
    })

    test('wires crossHair.activate to the same placeVertex callback given to wireInputEvents — the crosshair button\'s own onClick (CrossHair.jsx) does exactly what Enter/the touch add-vertex button already do', () => {
      const crossHair = {}
      const { wireArgs } = setup({ crossHair })
      expect(crossHair.activate).toBe(wireArgs.placeVertex)
    })

    test('does not wire crossHair.activate when no crossHair is provided', () => {
      expect(() => setup({ crossHair: null })).not.toThrow()
    })

    test('destroy clears crossHair.activate so a stale closure cannot fire after the mode has gone', () => {
      const crossHair = {}
      const { mode } = setup({ crossHair })
      expect(typeof crossHair.activate).toBe('function')
      mode.destroy()
      expect(crossHair.activate).toBeNull()
    })
  })
})
