export const keyReducer = (state) => {
  const datasets = state.datasets || []
  const seenGroups = new Set()
  const items = []
  let hasGroups = false
  datasets.forEach(dataset => {
    if (!dataset.showInKey || dataset.visibility === 'hidden') {
      return
    }
    if (dataset.sublayers?.length) {
      const { sublayerVisibility = [] } = dataset
      if (Object.values(sublayerVisibility).some((value) => value !== 'hidden')) {
        hasGroups = true
        items.push({ type: 'sublayers', dataset })
      }
      return
    }
    if (dataset.groupLabel) {
      if (seenGroups.has(dataset.groupLabel)) {
        return
      }
      seenGroups.add(dataset.groupLabel)
      hasGroups = true
      items.push({
        type: 'group',
        groupLabel: dataset.groupLabel,
        datasets: datasets.filter(d => !d.sublayers?.length && d.groupLabel === dataset.groupLabel)
      })
      return
    }
    items.push({ type: 'flat', dataset })
  })
  return { ...state, key: { items, hasGroups } }
}
