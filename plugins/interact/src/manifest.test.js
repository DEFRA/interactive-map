import { manifest } from './manifest.js'
import { initialState, actions } from './reducer.js'

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
    expect(ids).toEqual(expect.arrayContaining(['selectDone', 'selectAtTarget', 'selectCancel']))
  })

  it('buttons have slots and showLabel', () => {
    manifest.buttons.forEach(b => {
      ['mobile','tablet','desktop'].forEach(dev => {
        expect(b[dev].slot).toBe('actions')
        expect(b[dev].showLabel).toBe(true)
      })
    })
  })

  it('button logic functions work', () => {
    const done = manifest.buttons.find(b => b.id === 'selectDone')
    expect(done.excludeWhen({ appState: { isFullscreen: false }, pluginState: { enabled: true } })).toBe(true)
    expect(done.enableWhen({
      mapState: { markers: { items: [{ id: 'location' }] } },
      pluginState: { selectionBounds: null }
    })).toBe(true)

    const atTarget = manifest.buttons.find(b => b.id === 'selectAtTarget')
    expect(atTarget.hiddenWhen({
      appState: { interfaceType: 'pointer' },
      pluginState: { enabled: true }
    })).toBe(true)

    const cancel = manifest.buttons.find(b => b.id === 'selectCancel')
    expect(cancel.hiddenWhen({
      appConfig: { behaviour: 'always' },
      appState: { isFullscreen: true },
      pluginState: { enabled: true }
    })).toBe(true)
  })

  it('keyboardShortcuts array exists', () => {
    expect(Array.isArray(manifest.keyboardShortcuts)).toBe(true)
  })

  it('api exposes expected methods', () => {
    ['enable','disable','clear','selectFeature','unselectFeature'].forEach(fn => {
      expect(typeof manifest.api[fn]).toBe('function')
    })
  })
})
