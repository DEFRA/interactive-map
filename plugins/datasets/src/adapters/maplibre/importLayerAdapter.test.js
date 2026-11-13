import { importLayerAdapter } from './importLayerAdapter.js'
import LayerAdapter from './maplibreLayerAdapter.js'

jest.mock('./maplibreLayerAdapter.js', () => ({
  __esModule: true,
  default: jest.fn()
}))

describe('importLayerAdapter (MapLibre engine package)', () => {
  it('returns the MapLibre adapter', async () => {
    await expect(importLayerAdapter()).resolves.toBe(LayerAdapter)
  })
})
