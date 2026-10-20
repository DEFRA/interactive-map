import createPlugin from './index.js'
import { createManifest } from './manifest.js'

jest.mock('./datasets.scss', () => {})
jest.mock('./manifest.js', () => ({
  createManifest: jest.fn(() => ({ InitComponent: jest.fn(), reducer: {} }))
}))

describe('createPlugin', () => {
  it('returns a plugin with id "datasets"', () => {
    const plugin = createPlugin()
    expect(plugin.id).toBe('datasets')
  })

  it('applies default noKeyItemText', () => {
    const plugin = createPlugin()
    expect(plugin.noKeyItemText).toBe('No features displayed')
  })

  it('merges provided options (options override defaults, id stays fixed)', () => {
    const plugin = createPlugin({ noKeyItemText: 'Custom text', extra: true })
    expect(plugin.noKeyItemText).toBe('Custom text')
    expect(plugin.extra).toBe(true)
    expect(plugin.id).toBe('datasets')
  })

  it('exposes a load function', () => {
    const plugin = createPlugin()
    expect(typeof plugin.load).toBe('function')
  })

  it('load() resolves to the manifest', async () => {
    const plugin = createPlugin()
    const result = await plugin.load()
    expect(result).toBeDefined()
  })

  it('load() builds the manifest from the plugin options', async () => {
    const options = { hasMenu: false }
    await createPlugin(options).load()
    expect(createManifest).toHaveBeenCalledWith(options)
  })
})
