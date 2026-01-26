import createPlugin from './index.js'

// Mock the scss import
jest.mock('./scaleBar.scss', () => ({}))

describe('createPlugin', () => {
  describe('plugin descriptor', () => {
    it('returns plugin with correct id', () => {
      const plugin = createPlugin()

      expect(plugin.id).toBe('scaleBar')
    })

    it('returns plugin with load function', () => {
      const plugin = createPlugin()

      expect(typeof plugin.load).toBe('function')
    })

    it('defaults units to metric', () => {
      const plugin = createPlugin()

      expect(plugin.units).toBe('metric')
    })

    it('accepts custom units option', () => {
      const plugin = createPlugin({ units: 'imperial' })

      expect(plugin.units).toBe('imperial')
    })

    it('passes through manifest option', () => {
      const customManifest = { custom: true }
      const plugin = createPlugin({ manifest: customManifest })

      expect(plugin.manifest).toBe(customManifest)
    })
  })

  describe('load function', () => {
    it('returns manifest when called', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      expect(manifest).toBeDefined()
      expect(manifest.controls).toBeDefined()
    })

    it('manifest contains scaleBar control', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      const scaleBarControl = manifest.controls.find(c => c.id === 'scaleBar')
      expect(scaleBarControl).toBeDefined()
      expect(scaleBarControl.label).toBe('Scale bar')
    })

    it('manifest control has responsive slots', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      const scaleBarControl = manifest.controls[0]
      expect(scaleBarControl.mobile.slot).toBe('footer-right')
      expect(scaleBarControl.tablet.slot).toBe('footer-right')
      expect(scaleBarControl.desktop.slot).toBe('footer-right')
    })

    it('manifest control has render function', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      const scaleBarControl = manifest.controls[0]
      expect(typeof scaleBarControl.render).toBe('function')
    })
  })

  describe('edge cases', () => {
    it('handles empty options object', () => {
      const plugin = createPlugin({})

      expect(plugin.id).toBe('scaleBar')
      expect(plugin.units).toBe('metric')
    })

    it('handles undefined options', () => {
      const plugin = createPlugin(undefined)

      expect(plugin.id).toBe('scaleBar')
      expect(plugin.units).toBe('metric')
    })
  })
})
