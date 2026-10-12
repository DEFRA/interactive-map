import { supportsModuleWorkers } from './detectModuleWorker.js'

describe('supportsModuleWorkers', () => {
  const originalWorker = globalThis.Worker

  afterEach(() => {
    globalThis.Worker = originalWorker
  })

  it('returns false when Worker is not available', () => {
    delete globalThis.Worker
    expect(supportsModuleWorkers()).toBe(false)
  })

  it('returns true when the Worker constructor reads the type option', () => {
    globalThis.Worker = function (url, options) {
      if (options.type !== 'module') {
        throw new Error('unexpected type')
      }
      throw new TypeError('Invalid URL')
    }
    expect(supportsModuleWorkers()).toBe(true)
  })

  it('terminates the worker if construction succeeds', () => {
    const terminate = jest.fn()
    globalThis.Worker = function (url, options) {
      return { type: options.type, terminate }
    }
    expect(supportsModuleWorkers()).toBe(true)
    expect(terminate).toHaveBeenCalled()
  })

  it('returns false when the Worker constructor ignores the type option', () => {
    globalThis.Worker = function () {
      throw new TypeError('Invalid URL')
    }
    expect(supportsModuleWorkers()).toBe(false)
  })
})
