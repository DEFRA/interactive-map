import { getViewResolutionConfig, ZOOM_ALIGNMENT } from './zoom.js'
import { TILE_GRID_RESOLUTIONS, WORLD_LOD_RESOLUTIONS, WORLD_DEFAULT_MIN_ZOOM, WORLD_DEFAULT_MAX_ZOOM } from '../defaults.js'

describe('getViewResolutionConfig', () => {
  it('returns UK tile grid config', () => {
    const config = getViewResolutionConfig(ZOOM_ALIGNMENT.UK)
    expect(config.resolutions).toBe(TILE_GRID_RESOLUTIONS)
    expect(config.defaultMinZoom).toBe(0)
    expect(config.maxZoom).toBe(TILE_GRID_RESOLUTIONS.length - 1)
  })

  it('returns world LOD config', () => {
    const config = getViewResolutionConfig(ZOOM_ALIGNMENT.WORLD)
    expect(config.resolutions).toBe(WORLD_LOD_RESOLUTIONS)
    expect(config.defaultMinZoom).toBe(WORLD_DEFAULT_MIN_ZOOM)
    expect(config.maxZoom).toBe(WORLD_DEFAULT_MAX_ZOOM)
  })

  it('falls back to UK config for unknown alignment', () => {
    const config = getViewResolutionConfig(undefined)
    expect(config.resolutions).toBe(TILE_GRID_RESOLUTIONS)
  })
})
