import { manifest } from './manifest.js'

jest.mock('./api/enable.js', () => ({ enable: jest.fn() }))
jest.mock('./api/disable.js', () => ({ disable: jest.fn() }))
jest.mock('./api/clear.js', () => ({ clear: jest.fn() }))
jest.mock('./api/selectFeature.js', () => ({ selectFeature: jest.fn() }))
jest.mock('./api/unselectFeature.js', () => ({ unselectFeature: jest.fn() }))

describe('manifest', () => {
  it('has InitComponent', () => {
    expect(manifest.InitComponent).toBeDefined()
  })

  it('has reducer with initialState and actions', () => {
    expect(manifest.reducer.initialState).toBeDefined()
    expect(manifest.reducer.actions).toBeDefined()
  })

  it('defines buttons with correct ids', () => {
    const ids = manifest.buttons.map(b => b.id)
    expect(ids).toEqual(expect.arrayContaining(['selectAtTarget']))
    expect(ids).not.toContain('selectDone')
    expect(ids).not.toContain('selectCancel')
  })

  it('buttons have slots and showLabel', () => {
    manifest.buttons.forEach(b => {
      ['mobile', 'tablet', 'desktop'].forEach(dev => {
        expect(b[dev].slot).toBe('actions')
        if (b[dev].showLabel !== undefined) {
          expect(typeof b[dev].showLabel).toBe('boolean')
        }
      })
    })
  })

  it('button logic functions cover all branches', () => {
    const atTarget = manifest.buttons.find(b => b.id === 'selectAtTarget')

    // selectAtTarget.hiddenWhen
    expect(atTarget.hiddenWhen({ appState: { interfaceType: 'pointer' }, pluginState: { enabled: true } })).toBe(true)
    expect(atTarget.hiddenWhen({ appState: { interfaceType: 'touch' }, pluginState: { enabled: true } })).toBe(false)
    expect(atTarget.hiddenWhen({ appState: { interfaceType: 'touch' }, pluginState: { enabled: false } })).toBe(true)
  })

  it('keyboardShortcuts array exists', () => {
    expect(Array.isArray(manifest.keyboardShortcuts)).toBe(true)
  })

  it('api exposes expected methods', () => {
    ['enable', 'disable', 'clear', 'selectFeature', 'unselectFeature'].forEach(fn => {
      expect(typeof manifest.api[fn]).toBe('function')
    })
  })
})
