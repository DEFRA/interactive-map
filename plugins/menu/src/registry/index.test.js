import { getDatasetRegistry, patternRegistry } from './index.js'

describe('registry/index', () => {
  it('exports getDatasetRegistry as a function', () => {
    expect(typeof getDatasetRegistry).toBe('function')
  })

  it('exports patternRegistry', () => {
    expect(patternRegistry).toBeDefined()
  })
})
