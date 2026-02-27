// /plugins/search/index.test.js

// Mock SCSS import so Jest can run without parsing errors
jest.mock('./search.scss', () => {})

import createPlugin from './index'

describe('createPlugin', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('returns default plugin structure with showMarker and id', async () => {
    const plugin = createPlugin()
    expect(plugin.showMarker).toBe(true)
    expect(plugin.id).toBe('search')
    expect(typeof plugin.load).toBe('function')
  })

  it('overrides manifest when expanded is true', () => {
    const plugin = createPlugin({ expanded: true })
    expect(plugin.expanded).toBe(true)
    expect(plugin.manifest).toEqual({
      controls: [{ id: 'search', mobile: { slot: 'banner' } }]
    })
  })

  it('spreads custom options correctly', () => {
    const custom = { foo: 'bar', expanded: false }
    const plugin = createPlugin(custom)
    expect(plugin.foo).toBe('bar')
    expect(plugin.showMarker).toBe(true)
    expect(plugin.id).toBe('search')
  })

  it('load function dynamically imports the manifest and returns it', async () => {
    // Mock the dynamic import for './manifest.js'
    const manifestMock = { data: 'test-manifest' }
    jest.mock('./manifest.js', () => ({
      manifest: manifestMock
    }), { virtual: true })

    const plugin = createPlugin()
    const result = await plugin.load()
    expect(result).toEqual(manifestMock)
  })
})