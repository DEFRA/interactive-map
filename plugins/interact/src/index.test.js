import createPlugin from './index.js'

jest.mock('./interact.scss', () => ({}))

describe('createPlugin', () => {
  describe('plugin descriptor', () => {
    it('returns plugin with id "interact"', () => {
      const plugin = createPlugin()

      expect(plugin.id).toBe('interact')
    })

    it('returns plugin with load function', () => {
      const plugin = createPlugin()

      expect(typeof plugin.load).toBe('function')
    })
  })

  describe('options merging', () => {
    it('passes through custom options', () => {
      const plugin = createPlugin({
        customOption: 'value',
        anotherOption: 123
      })

      expect(plugin.customOption).toBe('value')
      expect(plugin.anotherOption).toBe(123)
    })

    it('handles empty options object', () => {
      const plugin = createPlugin({})

      expect(plugin.id).toBe('interact')
      expect(typeof plugin.load).toBe('function')
    })

    it('handles undefined options', () => {
      const plugin = createPlugin(undefined)

      expect(plugin.id).toBe('interact')
      expect(typeof plugin.load).toBe('function')
    })

    it('id cannot be overridden by options', () => {
      const plugin = createPlugin({ id: 'hacked' })

      expect(plugin.id).toBe('interact')
    })
  })

  describe('load function', () => {
    it('returns manifest when called', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      expect(manifest).toBeDefined()
    })

    it('manifest contains InitComponent', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      expect(manifest.InitComponent).toBeDefined()
    })

    it('manifest contains reducer with initialState and actions', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      expect(manifest.reducer).toBeDefined()
      expect(manifest.reducer.initialState).toBeDefined()
      expect(manifest.reducer.actions).toBeDefined()
    })

    it('manifest contains buttons array', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      expect(Array.isArray(manifest.buttons)).toBe(true)
      expect(manifest.buttons.length).toBeGreaterThan(0)
    })

    it('manifest contains keyboardShortcuts array', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      expect(Array.isArray(manifest.keyboardShortcuts)).toBe(true)
    })

    it('manifest contains api object with 5 methods', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      expect(manifest.api).toBeDefined()
      expect(typeof manifest.api.enable).toBe('function')
      expect(typeof manifest.api.disable).toBe('function')
      expect(typeof manifest.api.clear).toBe('function')
      expect(typeof manifest.api.selectFeature).toBe('function')
      expect(typeof manifest.api.unselectFeature).toBe('function')
    })
  })

  describe('manifest buttons', () => {
    it('includes selectDone button', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      const button = manifest.buttons.find(b => b.id === 'selectDone')
      expect(button).toBeDefined()
      expect(button.label).toBe('Done')
      expect(button.variant).toBe('primary')
    })

    it('includes selectAtTarget button', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      const button = manifest.buttons.find(b => b.id === 'selectAtTarget')
      expect(button).toBeDefined()
      expect(button.label).toBe('Select')
    })

    it('includes selectCancel button', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      const button = manifest.buttons.find(b => b.id === 'selectCancel')
      expect(button).toBeDefined()
      expect(button.label).toBe('Cancel')
      expect(button.variant).toBe('tertiary')
    })

    it('buttons have correct slots for mobile/tablet/desktop', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      manifest.buttons.forEach(button => {
        expect(button.mobile.slot).toBe('actions')
        expect(button.tablet.slot).toBe('actions')
        expect(button.desktop.slot).toBe('actions')
      })
    })

    it('buttons have showLabel enabled', async () => {
      const plugin = createPlugin()
      const manifest = await plugin.load()

      manifest.buttons.forEach(button => {
        expect(button.mobile.showLabel).toBe(true)
        expect(button.tablet.showLabel).toBe(true)
        expect(button.desktop.showLabel).toBe(true)
      })
    })
  })

  describe('button visibility conditions', () => {
    let manifest

    beforeAll(async () => {
      const plugin = createPlugin()
      manifest = await plugin.load()
    })

    describe('selectDone excludeWhen', () => {
      it('excludes when plugin disabled', () => {
        const button = manifest.buttons.find(b => b.id === 'selectDone')
        const result = button.excludeWhen({
          appState: { isFullscreen: true },
          pluginState: { enabled: false }
        })

        expect(result).toBe(true)
      })

      it('excludes when not fullscreen', () => {
        const button = manifest.buttons.find(b => b.id === 'selectDone')
        const result = button.excludeWhen({
          appState: { isFullscreen: false },
          pluginState: { enabled: true }
        })

        expect(result).toBe(true)
      })

      it('includes when enabled and fullscreen', () => {
        const button = manifest.buttons.find(b => b.id === 'selectDone')
        const result = button.excludeWhen({
          appState: { isFullscreen: true },
          pluginState: { enabled: true }
        })

        expect(result).toBe(false)
      })
    })

    describe('selectDone enableWhen', () => {
      it('enabled when location marker exists', () => {
        const button = manifest.buttons.find(b => b.id === 'selectDone')
        const result = button.enableWhen({
          mapState: { markers: { items: [{ id: 'location' }] } },
          pluginState: { selectionBounds: null }
        })

        expect(result).toBe(true)
      })

      it('enabled when selectionBounds exists', () => {
        const button = manifest.buttons.find(b => b.id === 'selectDone')
        const result = button.enableWhen({
          mapState: { markers: { items: [] } },
          pluginState: { selectionBounds: { sw: [0, 0], ne: [1, 1] } }
        })

        expect(result).toBe(true)
      })

      it('disabled when no marker and no selection', () => {
        const button = manifest.buttons.find(b => b.id === 'selectDone')
        const result = button.enableWhen({
          mapState: { markers: { items: [] } },
          pluginState: { selectionBounds: null }
        })

        expect(result).toBe(false)
      })
    })

    describe('selectAtTarget hiddenWhen', () => {
      it('hidden when plugin disabled', () => {
        const button = manifest.buttons.find(b => b.id === 'selectAtTarget')
        const result = button.hiddenWhen({
          appState: { interfaceType: 'touch' },
          pluginState: { enabled: false }
        })

        expect(result).toBe(true)
      })

      it('hidden for pointer interface', () => {
        const button = manifest.buttons.find(b => b.id === 'selectAtTarget')
        const result = button.hiddenWhen({
          appState: { interfaceType: 'pointer' },
          pluginState: { enabled: true }
        })

        expect(result).toBe(true)
      })

      it('visible for touch interface when enabled', () => {
        const button = manifest.buttons.find(b => b.id === 'selectAtTarget')
        const result = button.hiddenWhen({
          appState: { interfaceType: 'touch' },
          pluginState: { enabled: true }
        })

        expect(result).toBe(false)
      })

      it('visible for keyboard interface when enabled', () => {
        const button = manifest.buttons.find(b => b.id === 'selectAtTarget')
        const result = button.hiddenWhen({
          appState: { interfaceType: 'keyboard' },
          pluginState: { enabled: true }
        })

        expect(result).toBe(false)
      })
    })

    describe('selectCancel hiddenWhen', () => {
      it('hidden when plugin disabled', () => {
        const button = manifest.buttons.find(b => b.id === 'selectCancel')
        const result = button.hiddenWhen({
          appConfig: { behaviour: 'hybrid' },
          appState: { isFullscreen: true },
          pluginState: { enabled: false }
        })

        expect(result).toBe(true)
      })

      it('hidden for always behaviour', () => {
        const button = manifest.buttons.find(b => b.id === 'selectCancel')
        const result = button.hiddenWhen({
          appConfig: { behaviour: 'always' },
          appState: { isFullscreen: true },
          pluginState: { enabled: true }
        })

        expect(result).toBe(true)
      })

      it('hidden when not fullscreen', () => {
        const button = manifest.buttons.find(b => b.id === 'selectCancel')
        const result = button.hiddenWhen({
          appConfig: { behaviour: 'hybrid' },
          appState: { isFullscreen: false },
          pluginState: { enabled: true }
        })

        expect(result).toBe(true)
      })

      it('visible for hybrid behaviour when fullscreen and enabled', () => {
        const button = manifest.buttons.find(b => b.id === 'selectCancel')
        const result = button.hiddenWhen({
          appConfig: { behaviour: 'hybrid' },
          appState: { isFullscreen: true },
          pluginState: { enabled: true }
        })

        expect(result).toBe(false)
      })

      it('visible for buttonFirst behaviour when fullscreen and enabled', () => {
        const button = manifest.buttons.find(b => b.id === 'selectCancel')
        const result = button.hiddenWhen({
          appConfig: { behaviour: 'buttonFirst' },
          appState: { isFullscreen: true },
          pluginState: { enabled: true }
        })

        expect(result).toBe(false)
      })
    })
  })
})
