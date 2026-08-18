import createPlugin from './index.js'

jest.mock('./mapKey.scss', () => {})
jest.mock('./manifest.js', () => ({ manifest: { InitComponent: 'MapKeyInit', panels: [] } }))

describe('createPlugin', () => {
  it('returns the mapKey id', () => {
    expect(createPlugin().id).toBe('mapKey')
  })

  it('id cannot be overridden by options', () => {
    expect(createPlugin({ id: 'other' }).id).toBe('mapKey')
  })

  it('returns the default noKeyItemText', () => {
    expect(createPlugin().noKeyItemText).toBe('No features displayed')
  })

  it('allows noKeyItemText to be overridden', () => {
    expect(createPlugin({ noKeyItemText: 'Nothing here' }).noKeyItemText).toBe('Nothing here')
  })

  it('merges additional options into the returned object', () => {
    expect(createPlugin({ custom: true }).custom).toBe(true)
  })

  it('load() resolves to the manifest', async () => {
    const result = await createPlugin().load()
    expect(result).toEqual({ InitComponent: 'MapKeyInit', panels: [] })
  })
})
