import createPlugin from './index.js'
import { manifest } from './manifest.js'

jest.mock('./manifest.js', () => ({ manifest: { id: 'draw-manifest' } }))

describe('createPlugin', () => {
  test('returns a plugin descriptor with a fixed id and passes options through', () => {
    const plugin = createPlugin({ foo: 'bar' })
    expect(plugin).toMatchObject({ id: 'draw', foo: 'bar' })
    expect(typeof plugin.load).toBe('function')
  })

  test('the fixed id cannot be overridden by options', () => {
    expect(createPlugin({ id: 'other' }).id).toBe('draw')
  })

  test('defaults options to an empty object', () => {
    expect(() => createPlugin()).not.toThrow()
  })

  test('load dynamically imports the manifest', async () => {
    await expect(createPlugin().load()).resolves.toBe(manifest)
  })
})
