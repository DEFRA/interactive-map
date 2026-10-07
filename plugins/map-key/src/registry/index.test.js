import { getDatasetRegistry } from './index.js'

describe('registry/index', () => {
  it('exports getDatasetRegistry as a function', () => {
    expect(typeof getDatasetRegistry).toBe('function')
  })
})
