import { importLayerAdapter } from './importLayerAdapter.js'
import LayerAdapter from './esriLayerAdapter.js'

jest.mock('./esriLayerAdapter.js', () => ({
  __esModule: true,
  default: jest.fn()
}))

describe('importLayerAdapter (Esri engine package)', () => {
  it('returns the Esri adapter', async () => {
    await expect(importLayerAdapter()).resolves.toBe(LayerAdapter)
  })
})
