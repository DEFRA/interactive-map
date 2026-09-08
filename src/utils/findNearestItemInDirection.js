import { spatialNavigate } from './spatialNavigate.js'

/**
 * Item-list-shaped counterpart to spatialNavigate's raw pixel-array contract: given a list of
 * items each carrying screen coordinates, finds the id of whichever one is spatially nearest
 * to the current item in the given direction. Used to move roving-tabindex focus in a listbox
 * spatially (Alt+Arrow) rather than sequentially (plain Arrow/Home/End) — the same items list
 * already built for sequential navigation works here unchanged, whether it holds map features
 * or (in future) something else entirely, as long as each item carries x/y.
 *
 * Items missing x/y are skipped — they have no screen position to navigate by. If none of the
 * items have coordinates, or the list is empty, currentId is returned unchanged.
 *
 * @param {Array<{id: string, x?: number, y?: number}>} items
 * @param {string|null} currentId
 * @param {'ArrowUp'|'ArrowDown'|'ArrowLeft'|'ArrowRight'} direction
 * @returns {string|null} The id to move to — currentId unchanged if nothing qualifies.
 */
export function findNearestItemInDirection (items, currentId, direction) {
  const positioned = items.filter(item => item.x != null && item.y != null)
  if (!positioned.length) {
    return currentId
  }
  const pixels = positioned.map(item => [item.x, item.y])
  const currentIndex = positioned.findIndex(item => item.id === currentId)
  const start = currentIndex === -1 ? pixels[0] : pixels[currentIndex]
  const nextIndex = spatialNavigate(start, pixels, direction)
  return positioned[nextIndex]?.id ?? currentId
}
