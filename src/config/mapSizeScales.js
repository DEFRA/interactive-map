// Scale factor per app map size — applied to the map's pixel ratio, marker/symbol sizes and the
// draw UI. Kept in its own module (re-exported by appConfig.js) so plugins can share the one
// table without importing appConfig's UI components.
export const scaleFactor = {
  small: 1,
  medium: 1.5,
  large: 2
}

// Scale for a map size, falling back to 1 for an unknown or unset size
export const getMapSizeScale = (mapSize) => scaleFactor[mapSize] ?? 1
