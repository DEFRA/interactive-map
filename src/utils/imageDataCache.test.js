import { createImageDataCache } from './imageDataCache.js'

const imageData = (width) => ({ width, height: width })

describe('createImageDataCache', () => {
  it('caches a rasterised image under its id', async () => {
    const cache = createImageDataCache(2)
    const rasterise = jest.fn(async () => imageData(10))
    const first = await cache.rasteriseOnce('a', rasterise)
    expect(cache.get('a')).toBe(first)
  })

  it('shares one rasterisation between callers asking for the same image at once', async () => {
    const cache = createImageDataCache(2)
    const rasterise = jest.fn(async () => imageData(10))
    const [first, second] = await Promise.all([cache.rasteriseOnce('a', rasterise), cache.rasteriseOnce('a', rasterise)])
    expect(rasterise).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('tries again after a failed rasterisation, rather than sharing the failure', async () => {
    const cache = createImageDataCache(2)
    const failure = new Error('image failed to load')
    await expect(cache.rasteriseOnce('a', jest.fn().mockRejectedValue(failure))).rejects.toBe(failure)
    await expect(cache.rasteriseOnce('a', jest.fn(async () => imageData(10)))).resolves.toEqual(imageData(10))
  })

  it('drops the least recently used image once full', async () => {
    const cache = createImageDataCache(2)
    await cache.rasteriseOnce('a', async () => imageData(1))
    await cache.rasteriseOnce('b', async () => imageData(2))
    cache.get('a') // a is now the most recently used
    await cache.rasteriseOnce('c', async () => imageData(3))
    expect(cache.get('a')).toEqual(imageData(1))
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toEqual(imageData(3))
  })
})
