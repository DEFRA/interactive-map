export function mergeManifests (base = {}, override = {}) {
  const mergeById = (baseArr = [], overrideArr = []) => {
    if (!Array.isArray(baseArr)) {
      baseArr = []
    }
    if (!Array.isArray(overrideArr)) {
      overrideArr = []
    }
    const map = new Map(baseArr.map(item => [item.id, item]))
    overrideArr.forEach(item => {
      if (!item?.id) {
        return
      }
      if (map.has(item.id)) {
        map.set(item.id, { ...map.get(item.id), ...item })
      } else {
        map.set(item.id, item)
      }
    })
    return Array.from(map.values())
  }

  const result = { ...base, ...override }

  if (base.buttons || override.buttons) {
    result.buttons = mergeById(base.buttons, override.buttons)
  }
  if (base.panels || override.panels) {
    result.panels = mergeById(base.panels, override.panels)
  }
  if (base.controls || override.controls) {
    result.controls = mergeById(base.controls, override.controls)
  }
  if (base.icons || override.icons) {
    result.icons = mergeById(base.icons, override.icons)
  }

  return result
}
