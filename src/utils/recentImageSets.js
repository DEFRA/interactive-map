// The current map size and style, and the one before it — layers still show the previous one's
// images until every plugin has switched over to the current one's
const KEPT_SETS = 2

/**
 * Records which image ids were registered for each map size and style, keeping the most
 * recently registered ones and reporting which ids only older ones used. A map provider drops
 * those images, so its symbol images can't build up as the map size or style changes.
 */
export class RecentImageSets {
  sets = new Map() // key → Set of imageIds, least recently registered first

  /**
   * Records image ids registered for a map size and style.
   *
   * @param {string} key - identifies the map size and style, e.g. `${mapStyle.id}|${pixelRatio}`
   * @param {string[]} imageIds
   * @returns {string[]} ids no longer used by any kept size and style
   */
  add (key, imageIds) {
    const ids = this.sets.get(key) ?? new Set()
    this.sets.delete(key)
    this.sets.set(key, ids)
    imageIds.forEach((imageId) => ids.add(imageId))

    const staleIds = new Set()
    while (this.sets.size > KEPT_SETS) {
      const [oldestKey, oldestIds] = this.sets.entries().next().value
      this.sets.delete(oldestKey)
      oldestIds.forEach((imageId) => staleIds.add(imageId))
    }
    this.sets.forEach((keptIds) => keptIds.forEach((imageId) => staleIds.delete(imageId)))
    return Array.from(staleIds)
  }
}
