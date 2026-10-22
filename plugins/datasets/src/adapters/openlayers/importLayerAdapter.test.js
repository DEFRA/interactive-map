import { importLayerAdapter } from './importLayerAdapter.js'
import LayerAdapter from './openlayersLayerAdapter.js'

jest.mock('./openlayersLayerAdapter.js', () => ({
  __esModule: true,
  default: jest.fn()
}))

describe('importLayerAdapter (OpenLayers engine package)', () => {
  it('returns the OpenLayers adapter', async () => {
    await expect(importLayerAdapter()).resolves.toBe(LayerAdapter)
  })
})
