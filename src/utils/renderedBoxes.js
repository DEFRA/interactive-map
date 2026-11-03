/**
 * The boxes of what an element's children show. Plugin controls are wrapped in an element with no
 * box of its own (display: contents), so a wrapper's boxes are those of what's shown inside it.
 *
 * @param {Element} [element]
 * @returns {DOMRect[]}
 */
export const renderedBoxes = (element) => Array.from(element?.children ?? []).flatMap(child => {
  if (child.hidden) {
    return []
  }
  if (child.getClientRects().length > 0) {
    return [child.getBoundingClientRect()]
  }
  return child.classList.contains('im-c-control-wrapper') ? renderedBoxes(child) : []
})

/**
 * A top row column's height. One with only hidden items still has its bottom padding, which would
 * push the side column below it down, so it counts as empty.
 *
 * @param {Element} col
 * @returns {number}
 */
export const topColHeight = (col) => col.children.length > 0 && renderedBoxes(col).length === 0 ? 0 : col.offsetHeight
