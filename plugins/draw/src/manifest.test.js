import { manifest } from './manifest.js'

const findButton = (id) => manifest.buttons.find((b) => b.id === id)
const findMenuItem = (menuId, itemId) => findButton(menuId).menuItems.find((m) => m.id === itemId)

describe('manifest structure', () => {
  test('exposes the reducer, init component and api surface', () => {
    expect(manifest.reducer).toHaveProperty('initialState')
    expect(manifest.reducer).toHaveProperty('actions')
    expect(manifest.InitComponent).toBeDefined()
    expect(Object.keys(manifest.api)).toEqual(expect.arrayContaining([
      'newPolygon', 'newLine', 'editFeature', 'addFeature', 'deleteFeature', 'split', 'merge'
    ]))
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
})

describe('drawDone', () => {
  const btn = () => findButton('drawDone')

  test('is hidden outside draw/edit modes', () => {
    expect(btn().hiddenWhen({ pluginState: { mode: null } })).toBe(true)
    expect(btn().hiddenWhen({ pluginState: { mode: 'draw_polygon' } })).toBe(false)
  })

  test('enables per mode and vertex count', () => {
    expect(btn().enableWhen({ pluginState: { mode: 'draw_polygon', numVertices: 3 } })).toBe(true)
    expect(btn().enableWhen({ pluginState: { mode: 'draw_polygon', numVertices: 2 } })).toBe(false)
    expect(btn().enableWhen({ pluginState: { mode: 'draw_line', numVertices: 2 } })).toBe(true)
    expect(btn().enableWhen({ pluginState: { mode: 'draw_line', numVertices: 1 } })).toBe(false)
    expect(btn().enableWhen({ pluginState: { mode: 'edit_vertex' } })).toBe(true)
    expect(btn().enableWhen({ pluginState: { mode: 'disabled' } })).toBe(false)
  })
})

describe('drawMenu', () => {
  test('is hidden outside draw/edit modes', () => {
    expect(findButton('drawMenu').hiddenWhen({ pluginState: { mode: null } })).toBe(true)
    expect(findButton('drawMenu').hiddenWhen({ pluginState: { mode: 'edit_vertex' } })).toBe(false)
  })

  describe('drawUndo', () => {
    const item = () => findMenuItem('drawMenu', 'drawUndo')

    test('is hidden outside draw/edit modes', () => {
      expect(item().hiddenWhen({ pluginState: { mode: null } })).toBe(true)
      expect(item().hiddenWhen({ pluginState: { mode: 'draw_line' } })).toBe(false)
    })

    test('enables from vertex count while drawing and from the undo stack while editing', () => {
      expect(item().enableWhen({ pluginState: { mode: 'draw_polygon', numVertices: 1 } })).toBe(true)
      expect(item().enableWhen({ pluginState: { mode: 'draw_polygon', numVertices: 0 } })).toBe(false)
      expect(item().enableWhen({ pluginState: { mode: 'edit_vertex', undoStackLength: 2 } })).toBe(true)
      expect(item().enableWhen({ pluginState: { mode: 'edit_vertex', undoStackLength: 0 } })).toBe(false)
    })
  })

  describe('drawSnap', () => {
    const item = () => findMenuItem('drawMenu', 'drawSnap')

    test('is hidden without a mode or snap layers', () => {
      expect(item().hiddenWhen({ pluginState: { mode: null, hasSnapLayers: true } })).toBe(true)
      expect(item().hiddenWhen({ pluginState: { mode: 'draw_line', hasSnapLayers: false } })).toBe(true)
      expect(item().hiddenWhen({ pluginState: { mode: 'draw_line', hasSnapLayers: true } })).toBe(false)
    })

    test('is pressed when snapping is enabled', () => {
      expect(item().pressedWhen({ pluginState: { snap: true } })).toBe(true)
      expect(item().pressedWhen({ pluginState: { snap: false } })).toBe(false)
    })
  })

  describe('drawDeletePoint', () => {
    const item = () => findMenuItem('drawMenu', 'drawDeletePoint')

    test('is hidden outside edit mode', () => {
      expect(item().hiddenWhen({ pluginState: { mode: 'draw_polygon' } })).toBe(true)
      expect(item().hiddenWhen({ pluginState: { mode: 'edit_vertex' } })).toBe(false)
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

describe('drawUndo keyboard shortcut (platform-specific command)', () => {
  const loadUndoCommand = (mac) => {
    let command
    jest.isolateModules(() => {
      jest.doMock('../../../src/utils/isMac.js', () => ({ isMac: () => mac }))
      const { manifest: reloaded } = require('./manifest.js')
      command = reloaded.keyboardShortcuts.find((s) => s.id === 'drawUndo').command
    })
    return command
  }

  afterEach(() => {
    jest.dontMock('../../../src/utils/isMac.js')
    jest.resetModules()
  })

  test('uses Command on macOS', () => {
    expect(loadUndoCommand(true)).toBe('<kbd>Command</kbd> + <kbd>Z</kbd>')
  })

  test('uses Ctrl on non-mac platforms', () => {
    expect(loadUndoCommand(false)).toBe('<kbd>Ctrl</kbd> + <kbd>Z</kbd>')
  })
})
