import { supportsModuleWorkers } from './detectModuleWorker.js'

describe('supportsModuleWorkers', () => {
  const originalCSS = globalThis.CSS
  const originalWorker = globalThis.Worker

  afterEach(() => {
    globalThis.CSS = originalCSS
    globalThis.Worker = originalWorker
  })

  it('returns true when calc(infinity) is supported', () => {
    globalThis.CSS = { supports: jest.fn(() => true) }
    expect(supportsModuleWorkers()).toBe(true)
    expect(globalThis.CSS.supports).toHaveBeenCalledWith('width', 'calc(infinity * 1px)')
  })

  it('returns false when calc(infinity) is not supported', () => {
    globalThis.CSS = { supports: jest.fn(() => false) }
    expect(supportsModuleWorkers()).toBe(false)
  })

  it('returns false when CSS.supports is not available', () => {
    delete globalThis.CSS
    expect(supportsModuleWorkers()).toBe(false)
    globalThis.CSS = {}
    expect(supportsModuleWorkers()).toBe(false)
  })

  it('does not create a worker', () => {
    globalThis.CSS = { supports: () => true }
    globalThis.Worker = jest.fn()
    supportsModuleWorkers()
    expect(globalThis.Worker).not.toHaveBeenCalled()
  })
})
