/**
 * A cache of rasterised ImageData by image id, holding up to maxSize entries and dropping the
 * least recently used — at worst that means rasterising an image again. Callers asking for the
 * same image while it's being rasterised share that one rasterisation.
 *
 * @param {number} maxSize
 * @returns {{ get: (imageId: string) => ImageData|undefined, rasteriseOnce: (imageId: string, rasterise: () => Promise<ImageData>) => Promise<ImageData> }}
 */
export const createImageDataCache = (maxSize) => {
  const cache = new Map() // imageId → ImageData, least recently used first
  const pending = new Map() // imageId → Promise<ImageData>

  const get = (imageId) => {
    const imageData = cache.get(imageId)
    if (imageData) {
      cache.delete(imageId)
      cache.set(imageId, imageData)
    }
    return imageData
  }

  const set = (imageId, imageData) => {
    cache.set(imageId, imageData)
    if (cache.size > maxSize) {
      cache.delete(cache.keys().next().value)
    }
  }

  const rasteriseOnce = (imageId, rasterise) => {
    if (!pending.has(imageId)) {
      const rasterising = rasterise()
        .then((imageData) => {
          set(imageId, imageData)
          return imageData
        })
        .finally(() => pending.delete(imageId))
      pending.set(imageId, rasterising)
    }
    return pending.get(imageId)
  }

  return { get, rasteriseOnce }
}
