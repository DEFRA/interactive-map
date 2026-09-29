import {
  selectApplicationModes,
  getActiveApplicationModes,
  getApplicationModeClass,
  isHiddenByApplicationMode
} from './applicationModes.js'

const mode = (id, lists = {}) => ({ id, include: null, exclude: null, ...lists })
// The stack of modes set at runtime (app state) and the consumer's applicationModes option (app config)
const modesWith = (entries, config = {}) => ({ entries, config })

describe('selectApplicationModes', () => {
  it('pairs the stack from app state with the applicationModes option from app config', () => {
    const entries = [mode('draw')]
    expect(selectApplicationModes({ applicationModeEntries: entries }, { applicationModes: { draw: false } }))
      .toEqual({ entries, config: { draw: false } })
  })

  it('defaults both halves when missing', () => {
    expect(selectApplicationModes({}, undefined)).toEqual({ entries: [], config: {} })
  })
})

describe('getActiveApplicationModes', () => {
  it('lists the modes on the stack, least recently set first', () => {
    expect(getActiveApplicationModes(modesWith([mode('draw'), mode('search')])).map(active => active.id)).toEqual(['draw', 'search'])
  })

  it('leaves out a mode the consumer\'s config disables', () => {
    expect(getActiveApplicationModes(modesWith([mode('draw'), mode('search')], { draw: false })).map(active => active.id)).toEqual(['search'])
  })
})

describe('getApplicationModeClass', () => {
  it('uses the most recently set active mode', () => {
    expect(getApplicationModeClass(modesWith([mode('draw'), mode('search')]))).toBe('im-o-app--mode-search')
  })

  it('is null with no active mode', () => {
    expect(getApplicationModeClass(modesWith([]))).toBeNull()
    expect(getApplicationModeClass(modesWith([mode('draw')], { draw: false }))).toBeNull()
  })
})

describe('isHiddenByApplicationMode', () => {
  it('hides nothing with no active mode, or a mode without lists', () => {
    expect(isHiddenByApplicationMode(modesWith([]), ['mapKey'])).toBe(false)
    expect(isHiddenByApplicationMode(modesWith([mode('search')]), ['mapKey'])).toBe(false)
  })

  it('shows only included items when a mode has an include list', () => {
    const modes = modesWith([mode('draw', { include: ['mapStyles', 'drawUndo'] })])
    expect(isHiddenByApplicationMode(modes, ['mapStyles'])).toBe(false)
    expect(isHiddenByApplicationMode(modes, ['drawUndo'])).toBe(false)
    expect(isHiddenByApplicationMode(modes, ['mapKey'])).toBe(true)
  })

  it('shows an item if any of its ids is included', () => {
    const modes = modesWith([mode('draw', { include: ['mapStyles'] })])
    expect(isHiddenByApplicationMode(modes, ['zoomIn', 'mapStyles'])).toBe(false)
  })

  it('hides excluded items and nothing else when a mode has only an exclude list', () => {
    const modes = modesWith([mode('focus', { exclude: ['search'] })])
    expect(isHiddenByApplicationMode(modes, ['search'])).toBe(true)
    expect(isHiddenByApplicationMode(modes, ['mapKey'])).toBe(false)
  })

  it('lets a mode\'s exclude beat its include', () => {
    const modes = modesWith([mode('review', { include: ['layers'], exclude: ['layers'] })])
    expect(isHiddenByApplicationMode(modes, ['layers'])).toBe(true)
  })

  describe('the consumer\'s config adjusts the mode', () => {
    const draw = mode('draw', { include: ['mapStyles', 'scaleBar'] })

    it('appends items with include', () => {
      expect(isHiddenByApplicationMode(modesWith([draw], { draw: { include: ['search'] } }), ['search'])).toBe(false)
    })

    it('removes items with exclude', () => {
      expect(isHiddenByApplicationMode(modesWith([draw], { draw: { exclude: ['scaleBar'] } }), ['scaleBar'])).toBe(true)
    })

    it('brings back an item the mode excluded', () => {
      const focus = mode('focus', { exclude: ['search'] })
      expect(isHiddenByApplicationMode(modesWith([focus], { focus: { include: ['search'] } }), ['search'])).toBe(false)
    })

    it('leaves items it doesn\'t name to the mode', () => {
      const modes = modesWith([draw], { draw: { include: ['search'] } })
      expect(isHiddenByApplicationMode(modes, ['mapStyles'])).toBe(false)
      expect(isHiddenByApplicationMode(modes, ['mapKey'])).toBe(true)
    })

    it('only applies to its own mode', () => {
      expect(isHiddenByApplicationMode(modesWith([draw], { review: { include: ['search'] } }), ['search'])).toBe(true)
    })

    it('ignores a mode it disables', () => {
      expect(isHiddenByApplicationMode(modesWith([draw], { draw: false }), ['mapKey'])).toBe(false)
    })
  })

  it('hides an item when any active mode hides it', () => {
    const modes = modesWith([mode('draw', { include: ['mapStyles', 'search'] }), mode('focus', { exclude: ['mapStyles'] })])
    expect(isHiddenByApplicationMode(modes, ['mapKey'])).toBe(true)
    expect(isHiddenByApplicationMode(modes, ['mapStyles'])).toBe(true)
    expect(isHiddenByApplicationMode(modes, ['search'])).toBe(false)
  })
})
