import { getDatasetRegistry, setDatasetRegistry } from './getDatasetRegistry.js'

afterEach(() => {
  setDatasetRegistry(null)
})

describe('getDatasetRegistry', () => {
  it('returns null before any registry is set', () => {
    expect(getDatasetRegistry()).toBeNull()
  })

  it('returns the registry after setDatasetRegistry is called', () => {
    const registry = { keyItems: jest.fn() }
    setDatasetRegistry(registry)
    expect(getDatasetRegistry()).toBe(registry)
  })

  it('returns null after being reset to null', () => {
    setDatasetRegistry({ keyItems: jest.fn() })
    setDatasetRegistry(null)
    expect(getDatasetRegistry()).toBeNull()
  })
})
