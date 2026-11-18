import createPlugin from './index.js'

// Mock the scss import
jest.mock('./mapLoading.scss', () => ({}))

const setup = (html = '<div id="map"></div>') => {
  document.body.innerHTML = html
  return document.getElementById('map')
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('createPlugin', () => {
  describe('plugin descriptor', () => {
    it('returns a plugin with the mapLoading id', () => {
      const plugin = createPlugin({ container: setup(), delay: 0 })
      expect(plugin.id).toBe('mapLoading')
      plugin.destroy()
    })

    it('returns plugin with load function', () => {
      const plugin = createPlugin({ container: setup(), delay: 0 })
      expect(typeof plugin.load).toBe('function')
      plugin.destroy()
    })

    it('exposes overlay helpers on the descriptor', () => {
      const plugin = createPlugin({ container: setup(), delay: 0 })
      expect(plugin.isShown()).toBe(true)
      plugin.dismiss()
      expect(plugin.isShown()).toBe(false)
      plugin.show()
      expect(plugin.isShown()).toBe(true)
      plugin.destroy()
    })

    it('keeps helpers inert without a container', () => {
      const plugin = createPlugin()
      expect(plugin.id).toBe('mapLoading')
      expect(plugin.isShown()).toBe(false)
      expect(() => {
        plugin.show()
        plugin.dismiss()
        plugin.destroy()
      }).not.toThrow()
    })

    it('passes options through to the descriptor (pluginConfig)', () => {
      const plugin = createPlugin({ container: setup(), text: 'Loading projects', timeout: 1000, delay: 0 })
      expect(plugin.text).toBe('Loading projects')
      expect(plugin.timeout).toBe(1000)
      expect(plugin.controller).toBeDefined()
      plugin.destroy()
    })

    it('passes through manifest option', () => {
      const customManifest = { custom: true }
      const plugin = createPlugin({ container: setup(), manifest: customManifest, delay: 0 })
      expect(plugin.manifest).toBe(customManifest)
      plugin.destroy()
    })

    it('handles undefined options', () => {
      const plugin = createPlugin(undefined)
      expect(plugin.id).toBe('mapLoading')
      expect(plugin.isShown()).toBe(false)
    })
  })

  describe('load function', () => {
    it('returns the manifest when called', async () => {
      const plugin = createPlugin({ container: setup(), delay: 0 })
      const manifest = await plugin.load()

      expect(manifest).toBeDefined()
      expect(typeof manifest.InitComponent).toBe('function')
      plugin.destroy()
    })
  })
})
