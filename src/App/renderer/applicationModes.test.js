import {
  selectApplicationModes,
  getCurrentApplicationMode,
  getApplicationModeClass,
  isHiddenByApplicationMode
} from './applicationModes.js'

// A mode on the stack, as setApplicationMode stores it (its lists are the call options)
const mode = (id, lists = {}) => ({ id, include: null, exclude: null, ...lists })
// A mode a plugin declares in its manifest
const declared = (id, pluginId, lists = {}) => ({ id, pluginId, ...lists })
const modesWith = ({ entries = [], declarations = [], config = {} } = {}) => ({ entries, declarations, config })

// An item as the renderers describe it: its id and owning plugin (none for host-added items)
const item = (id, pluginId) => ({ ids: [id], pluginId })
const isHidden = (modes, target) => isHiddenByApplicationMode(modes, target)

describe('selectApplicationModes', () => {
  it('gathers the stack, the manifests\' declarations and the consumer\'s config', () => {
    const appState = {
      applicationModeEntries: [mode('draw')],
      pluginRegistry: {
        registeredPlugins: [
          { id: 'draw', manifest: { applicationModes: { draw: { include: ['mapStyles'] } } } },
          { id: 'search', manifest: {} }
        ]
      }
    }
    expect(selectApplicationModes(appState, { applicationModes: { draw: false } })).toEqual({
      entries: [mode('draw')],
      declarations: [declared('draw', 'draw', { include: ['mapStyles'] })],
      config: { draw: false }
    })
  })

  it('defaults everything when missing', () => {
    expect(selectApplicationModes({}, undefined)).toEqual({ entries: [], declarations: [], config: {} })
  })
})

describe('getCurrentApplicationMode', () => {
  it('is the top of the stack', () => {
    expect(getCurrentApplicationMode(modesWith({ entries: [mode('draw'), mode('search')] }))).toEqual(mode('search'))
  })

  it('skips a mode the consumer\'s config disables, so the one underneath is current', () => {
    expect(getCurrentApplicationMode(modesWith({ entries: [mode('search'), mode('draw')], config: { draw: false } }))).toEqual(mode('search'))
  })

  it('is null with an empty stack', () => {
    expect(getCurrentApplicationMode(modesWith())).toBeNull()
  })
})

describe('getApplicationModeClass', () => {
  it('uses the current mode', () => {
    expect(getApplicationModeClass(modesWith({ entries: [mode('draw'), mode('search')] }))).toBe('im-o-app--mode-search')
  })

  it('is null with no current mode', () => {
    expect(getApplicationModeClass(modesWith())).toBeNull()
    expect(getApplicationModeClass(modesWith({ entries: [mode('draw')], config: { draw: false } }))).toBeNull()
  })
})

describe('isHiddenByApplicationMode', () => {
  it('hides nothing with no current mode, or a mode without lists anywhere', () => {
    expect(isHidden(modesWith(), item('mapKey', 'mapKey'))).toBe(false)
    const search = modesWith({ entries: [mode('search')], declarations: [declared('search', 'search')] })
    expect(isHidden(search, item('mapKey', 'mapKey'))).toBe(false)
  })

  it('applies only the current mode, not modes underneath', () => {
    const declarations = [declared('draw', 'draw', { include: ['mapStyles'] }), declared('search', 'search')]
    expect(isHidden(modesWith({ entries: [mode('draw'), mode('search')], declarations }), item('mapKey', 'mapKey'))).toBe(false)
    expect(isHidden(modesWith({ entries: [mode('draw')], declarations }), item('mapKey', 'mapKey'))).toBe(true)
  })

  describe('a mode defined in a plugin manifest', () => {
    const declarations = [declared('draw', 'draw', { include: ['mapStyles'] })]
    const drawing = (overrides = {}) => modesWith({ entries: [mode('draw', overrides.call)], declarations, config: overrides.config })

    it('is a takeover with an include: only included items and the declaring plugin\'s own items show', () => {
      expect(isHidden(drawing(), item('mapStyles', 'mapStyles'))).toBe(false)
      expect(isHidden(drawing(), item('drawUndo', 'draw'))).toBe(false)
      expect(isHidden(drawing(), item('mapKey', 'mapKey'))).toBe(true)
    })

    it('shows an item if any of its ids is included', () => {
      expect(isHidden(drawing(), { ids: ['zoomIn', 'mapStyles'] })).toBe(false)
    })

    it('combines every manifest that declares the mode, keeping each declaring plugin\'s own items', () => {
      const modes = modesWith({
        entries: [mode('draw')],
        declarations: [...declarations, declared('draw', 'measure', { include: ['scaleBar'], exclude: ['mapStyles'] })]
      })
      expect(isHidden(modes, item('scaleBar', 'scaleBar'))).toBe(false)
      expect(isHidden(modes, item('measureTool', 'measure'))).toBe(false)
      expect(isHidden(modes, item('mapStyles', 'mapStyles'))).toBe(true)
    })

    it('lets the consumer\'s config append and remove items, without changing what it is', () => {
      const modes = drawing({ config: { draw: { include: ['search'], exclude: ['mapStyles'] } } })
      expect(isHidden(modes, item('search', 'search'))).toBe(false)
      expect(isHidden(modes, item('mapStyles', 'mapStyles'))).toBe(true)
      expect(isHidden(modes, item('mapKey', 'mapKey'))).toBe(true)
    })

    it('can\'t be turned into a takeover by the consumer\'s include', () => {
      const search = modesWith({ entries: [mode('search')], declarations: [declared('search', 'search')], config: { search: { include: ['myControl'] } } })
      expect(isHidden(search, item('mapKey', 'mapKey'))).toBe(false)
    })

    it('applies call options last, so they have the final say', () => {
      const modes = drawing({ config: { draw: { include: ['search'] } }, call: { exclude: ['search'] } })
      expect(isHidden(modes, item('search', 'search'))).toBe(true)
      expect(isHidden(drawing({ call: { include: ['mapKey'] } }), item('mapKey', 'mapKey'))).toBe(false)
    })

    it('lets a rule\'s exclude beat its own include', () => {
      expect(isHidden(drawing({ config: { draw: { include: ['layers'], exclude: ['layers'] } } }), item('layers', 'datasets'))).toBe(true)
    })
  })

  describe('a mode no manifest declares', () => {
    it('is defined by the consumer\'s config, whose include makes it a takeover', () => {
      const modes = modesWith({ entries: [mode('review')], config: { review: { include: ['mapStyles'] } } })
      expect(isHidden(modes, item('mapStyles', 'mapStyles'))).toBe(false)
      expect(isHidden(modes, item('mapKey', 'mapKey'))).toBe(true)
    })

    it('is defined by its call options when there\'s no config either', () => {
      const modes = modesWith({ entries: [mode('review', { include: ['myButton'] })] })
      expect(isHidden(modes, item('myButton', undefined))).toBe(false)
      expect(isHidden(modes, item('mapKey', 'mapKey'))).toBe(true)
    })

    it('hides only excluded items when its definition has just an exclude', () => {
      const modes = modesWith({ entries: [mode('focus')], config: { focus: { exclude: ['search'] } } })
      expect(isHidden(modes, item('search', 'search'))).toBe(true)
      expect(isHidden(modes, item('mapKey', 'mapKey'))).toBe(false)
    })
  })

  it('ignores a mode the consumer\'s config disables', () => {
    const modes = modesWith({ entries: [mode('draw')], declarations: [declared('draw', 'draw', { include: [] })], config: { draw: false } })
    expect(isHidden(modes, item('mapKey', 'mapKey'))).toBe(false)
  })
})
