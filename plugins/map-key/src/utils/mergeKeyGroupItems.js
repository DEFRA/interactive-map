export const mergeKeyGroupItems = (groups, items) => {
  if (!groups) {
    return items
  }
  return items.map((item) => {
    const { id } = item
    if (groups[id]) {
      return { ...item, ...groups[id] }
    }
    return item
  })
}
