export function stringToKebab (str) {
  return str?.replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}
