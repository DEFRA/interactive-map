import { pollUntil, patchSourceData } from './sourceData.js'

describe('pollUntil', () => {
  beforeEach(() => {
    global.requestAnimationFrame = jest.fn()
  })

  test('stops when checkFn returns null', () => {
    const onSuccess = jest.fn()
    pollUntil(() => null, onSuccess)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(global.requestAnimationFrame).not.toHaveBeenCalled()
  })

  test('calls onSuccess when checkFn returns a truthy value', () => {
    const onSuccess = jest.fn()
    pollUntil(() => 'ready', onSuccess)
    expect(onSuccess).toHaveBeenCalledWith('ready')
  })

  test('reschedules via requestAnimationFrame until the value becomes available', () => {
    const values = [undefined, 'ready']
    let i = 0
    global.requestAnimationFrame = jest.fn((cb) => cb())
    const onSuccess = jest.fn()

    pollUntil(() => values[i++], onSuccess)

    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith('ready')
  })
})

describe('patchSourceData', () => {
  test('ignores a nullish source', () => {
    expect(() => patchSourceData(null)).not.toThrow()
  })

  test('ignores a source that already exposes _data.features', () => {
    const existing = { features: [] }
    const source = { _data: existing }
    patchSourceData(source)
    expect(source._data).toBe(existing)
  })

  test('installs a _data accessor that normalizes assigned values', () => {
    const source = {}
    patchSourceData(source)

    expect(source._data).toEqual({ type: 'FeatureCollection', features: [] })

    const fc = { type: 'FeatureCollection', features: [{ id: 1 }] }
    source._data = fc
    expect(source._data).toBe(fc)

    source._data = 'nonsense'
    expect(source._data).toEqual({ type: 'FeatureCollection', features: [] })

    source._data = { features: 'not-array' }
    expect(source._data).toEqual({ type: 'FeatureCollection', features: [] })
  })
})
