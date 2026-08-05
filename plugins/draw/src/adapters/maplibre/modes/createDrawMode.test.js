import { createDrawMode } from './createDrawMode.js'

/**
 * Tests for the factory's own job: composing ParentMode with every handler group into a
 * single mode object. The behaviour of each handler group is covered in its colocated
 * test file under drawMode/ (lifecycle, click, keyboard, undo, pointer, render).
 */

const POLYGON_CONFIG = {
  featureProp: 'polygon',
  geometryType: 'Polygon',
  getCoords: (f) => f.coordinates[0],
  validateClick: () => true,
  getPlacedCoords: () => []
}

const build = (parent = {}, config = POLYGON_CONFIG) => createDrawMode(parent, config)

describe('createDrawMode composition', () => {
  test('assembles a mode object with methods from every handler group', () => {
    const mode = build()
    const contributed = [
      'onSetup', 'onStop', // lifecycle
      'onClick', 'onTap', 'doClick', 'onVertexButtonClick', 'onCreate', // click
      'pushDrawUndo', 'undoVertex', 'onUndo', // undo
      'onKeydown', 'onKeyup', 'onKeyUp', // keyboard
      'onMove', 'onMouseMove', 'onTouchStart', 'onBlur', // pointer
      'toDisplayFeatures', '_showCrossHair', '_simulateMouse' // render
    ]
    for (const method of contributed) {
      expect(typeof mode[method]).toBe('function')
    }
  })

  test('preserves non-overridden ParentMode members and overrides shared ones', () => {
    const parent = { parentOnly () {}, onClick: 'parent-onclick' }
    const mode = build(parent)
    expect(mode.parentOnly).toBe(parent.parentOnly) // passed through
    expect(typeof mode.onClick).toBe('function') // overridden by the click handlers
    expect(mode.onClick).not.toBe(parent.onClick)
  })

  test('passes config through so the getFeature accessor reads the configured feature prop', () => {
    const polygonMode = build()
    const lineMode = build({}, { ...POLYGON_CONFIG, featureProp: 'line' })
    // dispatchVertexChange is config-agnostic, but pushDrawUndo reads getFeature(state).id
    const map = { _undoStack: { push: jest.fn() }, _undoInProgress: false }
    polygonMode.pushDrawUndo.call({ map }, { polygon: { id: 'p1' } })
    lineMode.pushDrawUndo.call({ map }, { line: { id: 'l1' } })
    expect(map._undoStack.push).toHaveBeenNthCalledWith(1, expect.objectContaining({ featureId: 'p1' }))
    expect(map._undoStack.push).toHaveBeenNthCalledWith(2, expect.objectContaining({ featureId: 'l1' }))
  })
})
