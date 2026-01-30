export const getBbox = (map) => {
  const bounds = map.getBounds()
  return `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`
}
