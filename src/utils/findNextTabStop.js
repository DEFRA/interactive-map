export function findTabStop ({ el, direction, root = document }) {
  const focusableEls = root.querySelectorAll('input, button, select, textarea, a[href]')
  const list = Array.prototype.filter.call(focusableEls, item => {
    return item.tabIndex >= 0 && !!item.offsetParent
  })
  const index = list.indexOf(el)
  return list[direction === 'next' ? index + 1 : index - 1] || list[0]
}
