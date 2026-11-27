import { needsTarget } from './needsTarget.js'

const mapControlsOpen = new Set(['mapControls'])
const closed = new Set()

const check = (appState, pluginState = {}) =>
  needsTarget({ appState, pluginState: { interactionModes: ['selectFeature'], ...pluginState } })

describe('needsTarget', () => {
  it.each([
    ['touch', closed, true],
    ['mouse', closed, false],
    ['keyboard', closed, false],
    ['touch', mapControlsOpen, true],
    ['mouse', mapControlsOpen, true],
    ['keyboard', mapControlsOpen, true]
  ])('%s, map controls %p: %s', (interfaceType, expandedButtons, expected) => {
    expect(check({ interfaceType, expandedButtons })).toBe(expected)
  })

  it('is false on touch when touchTarget is false', () => {
    expect(check({ interfaceType: 'touch', expandedButtons: closed }, { touchTarget: false })).toBe(false)
  })

  it('is true with touchTarget false once the map controls are open', () => {
    expect(check({ interfaceType: 'touch', expandedButtons: mapControlsOpen }, { touchTarget: false })).toBe(true)
  })

  it('is false on touch when selectMarker is the only mode', () => {
    expect(check({ interfaceType: 'touch' }, { interactionModes: ['selectMarker'] })).toBe(false)
  })

  it('treats a missing expandedButtons as map controls closed', () => {
    expect(check({ interfaceType: 'mouse' })).toBe(false)
  })
})
