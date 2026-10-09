import { manifest } from './manifest.js'

const findButton = (id) => manifest.buttons.find((b) => b.id === id)

describe('manifest structure', () => {
  test('exposes the reducer, init component and api surface', () => {
    expect(manifest.reducer).toHaveProperty('initialState')
    expect(manifest.reducer).toHaveProperty('actions')
    expect(manifest.InitComponent).toBeDefined()
    expect(Object.keys(manifest.api)).toEqual(expect.arrayContaining([
      'newPolygon', 'newLine', 'newPoint', 'editFeature', 'addFeature', 'setStyle', 'deleteFeature', 'split', 'merge'
    ]))
  })
})

describe('application mode', () => {
  test('declares the draw mode, keeping map styles, map controls and the scale bar (its own items are kept automatically)', () => {
    expect(manifest.applicationModes).toEqual({ draw: { include: ['mapStyles', 'mapControls', 'scaleBar'] } })
  })
})

describe('drawCancel', () => {
  test('is hidden only when there is no active mode', () => {
    expect(findButton('drawCancel').hiddenWhen({ pluginState: { mode: null } })).toBe(true)
    expect(findButton('drawCancel').hiddenWhen({ pluginState: { mode: 'draw_line' } })).toBe(false)
  })
})

describe('drawAddPoint', () => {
  const hidden = (interfaceType, mode) =>
    findButton('drawAddPoint').hiddenWhen({ appState: { interfaceType }, pluginState: { mode } })

  test('is shown only while drawing on a touch interface', () => {
    expect(hidden('touch', 'draw_polygon')).toBe(false)
    expect(hidden('mouse', 'draw_polygon')).toBe(true)
    expect(hidden('touch', 'edit_vertex')).toBe(true)
  })

  test('is disabled while placing at the crosshair would be vetoed', () => {
    const btn = findButton('drawAddPoint')
    expect(btn.enableWhen({ pluginState: { canAddPoint: true } })).toBe(true)
    expect(btn.enableWhen({ pluginState: { canAddPoint: false } })).toBe(false)
  })
})

describe('drawDone', () => {
  const btn = () => findButton('drawDone')

  test('is hidden outside draw/edit modes', () => {
    expect(btn().hiddenWhen({ pluginState: { mode: null } })).toBe(true)
    expect(btn().hiddenWhen({ pluginState: { mode: 'draw_polygon' } })).toBe(false)
    expect(btn().hiddenWhen({ pluginState: { mode: 'edit_point' } })).toBe(false)
  })

  test('enables in a draw/edit mode only when the geometry is valid', () => {
    expect(btn().enableWhen({ pluginState: { mode: 'draw_polygon', geometryValid: true } })).toBe(true)
    expect(btn().enableWhen({ pluginState: { mode: 'draw_line', geometryValid: true } })).toBe(true)
    expect(btn().enableWhen({ pluginState: { mode: 'edit_vertex', geometryValid: true } })).toBe(true)
    expect(btn().enableWhen({ pluginState: { mode: 'edit_point', geometryValid: true } })).toBe(true)
    expect(btn().enableWhen({ pluginState: { mode: 'disabled', geometryValid: true } })).toBe(false)
  })

  test('stays disabled while the geometry is invalid', () => {
    expect(btn().enableWhen({ pluginState: { mode: 'draw_polygon', geometryValid: false } })).toBe(false)
    expect(btn().enableWhen({ pluginState: { mode: 'draw_line', geometryValid: false } })).toBe(false)
    expect(btn().enableWhen({ pluginState: { mode: 'edit_vertex', geometryValid: false } })).toBe(false)
    expect(btn().enableWhen({ pluginState: { mode: 'edit_point', geometryValid: false } })).toBe(false)
  })
})

describe('top row buttons', () => {
  test('sit in the top-middle slot as Undo, Snap, Delete point, with only Snap showing its label', () => {
    const topMiddle = manifest.buttons.filter(button => button.desktop?.slot === 'top-middle').map(button => button.id)
    expect(topMiddle).toEqual(['drawUndo', 'drawSnap', 'drawDeletePoint'])
    expect(findButton('drawUndo').desktop).toEqual({ slot: 'top-middle', showLabel: false })
    expect(findButton('drawSnap').desktop).toEqual({ slot: 'top-middle', showLabel: true })
    expect(findButton('drawDeletePoint').desktop).toEqual({ slot: 'top-middle', showLabel: false })
  })

  test('replace the draw/edit actions menu', () => {
    expect(findButton('drawMenu')).toBeUndefined()
  })

  describe('drawUndo', () => {
    const item = () => findButton('drawUndo')

    test('is hidden outside draw/edit modes', () => {
      expect(item().hiddenWhen({ pluginState: { mode: null } })).toBe(true)
      expect(item().hiddenWhen({ pluginState: { mode: 'draw_line' } })).toBe(false)
    })

    test('is visible in edit_point', () => {
      expect(item().hiddenWhen({ pluginState: { mode: 'edit_point' } })).toBe(false)
    })

    test('stays hidden for draw_point — nothing to undo before a single-click commit', () => {
      expect(item().hiddenWhen({ pluginState: { mode: 'draw_point' } })).toBe(true)
    })

    test('enables from vertex count while drawing and from the undo stack while editing', () => {
      expect(item().enableWhen({ pluginState: { mode: 'draw_polygon', numVertices: 1 } })).toBe(true)
      expect(item().enableWhen({ pluginState: { mode: 'draw_polygon', numVertices: 0 } })).toBe(false)
      expect(item().enableWhen({ pluginState: { mode: 'edit_vertex', undoStackLength: 2 } })).toBe(true)
      expect(item().enableWhen({ pluginState: { mode: 'edit_vertex', undoStackLength: 0 } })).toBe(false)
      expect(item().enableWhen({ pluginState: { mode: 'edit_point', undoStackLength: 1 } })).toBe(true)
      expect(item().enableWhen({ pluginState: { mode: 'edit_point', undoStackLength: 0 } })).toBe(false)
    })
  })

  describe('drawSnap', () => {
    const item = () => findButton('drawSnap')

    test('is hidden without a mode or snap layers', () => {
      expect(item().hiddenWhen({ pluginState: { mode: null, hasSnapLayers: true } })).toBe(true)
      expect(item().hiddenWhen({ pluginState: { mode: 'draw_line', hasSnapLayers: false } })).toBe(true)
      expect(item().hiddenWhen({ pluginState: { mode: 'draw_line', hasSnapLayers: true } })).toBe(false)
    })

    test('is visible during draw_point, which supports snapping but has no undo/delete', () => {
      expect(item().hiddenWhen({ pluginState: { mode: 'draw_point', hasSnapLayers: true } })).toBe(false)
    })

    test('is pressed when snapping is enabled', () => {
      expect(item().pressedWhen({ pluginState: { snap: true } })).toBe(true)
      expect(item().pressedWhen({ pluginState: { snap: false } })).toBe(false)
    })
  })

  describe('drawDeletePoint', () => {
    const item = () => findButton('drawDeletePoint')

    test('is hidden outside edit mode', () => {
      expect(item().hiddenWhen({ pluginState: { mode: 'draw_polygon' } })).toBe(true)
      expect(item().hiddenWhen({ pluginState: { mode: 'edit_vertex' } })).toBe(false)
    })

    // Deliberately excluded from edit_point — deleting a point's one coordinate is deleting
    // the whole feature (deleteFeature's job), not a per-vertex action.
    test('stays hidden for edit_point', () => {
      expect(item().hiddenWhen({ pluginState: { mode: 'edit_point' } })).toBe(true)
    })

    test('enables only with a selection and enough vertices (polygon vs line)', () => {
      expect(item().enableWhen({ pluginState: { selectedVertexIndex: -1 } })).toBe(false)
      expect(item().enableWhen({ pluginState: { selectedVertexIndex: 0, feature: { geometry: { type: 'Polygon' } }, numVertices: 4 } })).toBe(true)
      expect(item().enableWhen({ pluginState: { selectedVertexIndex: 0, feature: { geometry: { type: 'Polygon' } }, numVertices: 3 } })).toBe(false)
      expect(item().enableWhen({ pluginState: { selectedVertexIndex: 0, feature: { geometry: { type: 'LineString' } }, numVertices: 3 } })).toBe(true)
      expect(item().enableWhen({ pluginState: { selectedVertexIndex: 0, feature: { geometry: { type: 'LineString' } }, numVertices: 2 } })).toBe(false)
    })
  })
})

describe('platform-specific keyboard shortcut commands', () => {
  const loadCommand = (mac, id) => {
    let command
    jest.isolateModules(() => {
      jest.doMock('../../../src/utils/isMac.js', () => ({ isMac: () => mac }))
      const { manifest: reloaded } = require('./manifest.js')
      command = reloaded.keyboardShortcuts.find((s) => s.id === id).command
    })
    return command
  }

  afterEach(() => {
    jest.dontMock('../../../src/utils/isMac.js')
    jest.resetModules()
  })

  describe('drawUndo', () => {
    test('uses Command on macOS', () => {
      expect(loadCommand(true, 'drawUndo')).toBe('<kbd>Command</kbd> + <kbd>Z</kbd>')
    })

    test('uses Ctrl on non-mac platforms', () => {
      expect(loadCommand(false, 'drawUndo')).toBe('<kbd>Ctrl</kbd> + <kbd>Z</kbd>')
    })
  })

  describe('drawSelectAdjacentPoint', () => {
    test('uses Option on macOS', () => {
      expect(loadCommand(true, 'drawSelectAdjacentPoint')).toBe('<kbd>Option</kbd> + <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> or <kbd>→</kbd>')
    })

    test('uses Alt on non-mac platforms', () => {
      expect(loadCommand(false, 'drawSelectAdjacentPoint')).toBe('<kbd>Alt</kbd> + <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> or <kbd>→</kbd>')
    })
  })
})
