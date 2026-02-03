import createPlugin from './index.js'

jest.mock('./interact.scss', () => ({}))

describe('createPlugin', () => {
  it('returns plugin with fixed id and load function', () => {
    const plugin = createPlugin({ foo: 'bar' })
    expect(plugin.id).toBe('interact')
    expect(typeof plugin.load).toBe('function')
    expect(plugin.foo).toBe('bar') // merged option
  })

  it('load() returns manifest', async () => {
    const plugin = createPlugin()
    const manifest = await plugin.load()
    expect(manifest).toBeDefined()
    expect(manifest.InitComponent).toBeDefined()
    expect(manifest.reducer).toBeDefined()
    expect(Array.isArray(manifest.buttons)).toBe(true)
    expect(manifest.api).toBeDefined()
  })
})
