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
        expect(typeof b[dev].showLabel).toBe('boolean')
      })
    })
  })

  it('button logic functions cover all branches', () => {
    const done = manifest.buttons.find(b => b.id === 'selectDone')
    const atTarget = manifest.buttons.find(b => b.id === 'selectAtTarget')
    const cancel = manifest.buttons.find(b => b.id === 'selectCancel')

    // selectDone.excludeWhen
    expect(done.excludeWhen({ appState: { isFullscreen: false }, pluginState: { enabled: true } })).toBe(true)
    expect(done.excludeWhen({ appState: { isFullscreen: true }, pluginState: { enabled: true } })).toBe(false)

    // selectDone.enableWhen
    expect(done.enableWhen({
      mapState: { markers: { items: [{ id: 'location' }] } },
      pluginState: { selectionBounds: null }
    })).toBe(true)
    expect(done.enableWhen({
      mapState: { markers: { items: [] } },
      pluginState: { selectionBounds: null }
    })).toBe(false)
    expect(done.enableWhen({
      mapState: { markers: { items: [] } },
      pluginState: { selectionBounds: { sw:[0,0], ne:[1,1] } }
    })).toBe(true)

    // selectAtTarget.hiddenWhen
    expect(atTarget.hiddenWhen({ appState: { interfaceType: 'pointer' }, pluginState: { enabled: true } })).toBe(true)
    expect(atTarget.hiddenWhen({ appState: { interfaceType: 'touch' }, pluginState: { enabled: true } })).toBe(false)
    expect(atTarget.hiddenWhen({ appState: { interfaceType: 'touch' }, pluginState: { enabled: false } })).toBe(true)

    // selectCancel.hiddenWhen
    expect(cancel.hiddenWhen({
      appConfig: { behaviour: 'always' },
      appState: { isFullscreen: true },
      pluginState: { enabled: true }
    })).toBe(true)
    expect(cancel.hiddenWhen({
      appConfig: { behaviour: 'hybrid' },
      appState: { isFullscreen: true },
      pluginState: { enabled: true }
    })).toBe(false)
    expect(cancel.hiddenWhen({
      appConfig: { behaviour: 'hybrid' },
      appState: { isFullscreen: false },
      pluginState: { enabled: true }
    })).toBe(true)
    expect(cancel.hiddenWhen({
      appConfig: { behaviour: 'hybrid' },
      appState: { isFullscreen: true },
      pluginState: { enabled: false }
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
