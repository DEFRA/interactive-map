export const buildKeyState = (datasets) => {
  const seenGroups = new Set()
  const items = []
  datasets.forEach(dataset => {
    if (dataset.sublayers?.length) {
      items.push({ type: 'sublayers', dataset })
      return
    }
    if (dataset.groupLabel) {
      if (seenGroups.has(dataset.groupLabel)) {
        return
      }
      seenGroups.add(dataset.groupLabel)
      items.push({
        type: 'group',
        groupLabel: dataset.groupLabel,
        datasets: datasets.filter(d => !d.sublayers?.length && d.groupLabel === dataset.groupLabel)
      })
      return
    }
    items.push({ type: 'flat', dataset })
  })
  return items
}
