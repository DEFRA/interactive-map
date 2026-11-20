import { getViewResolutionConfig, ZOOM_ALIGNMENT } from './zoom.js'
import { TILE_GRID_RESOLUTIONS, UK_VIEW_RESOLUTIONS, WORLD_LOD_RESOLUTIONS, WORLD_DEFAULT_MIN_ZOOM, WORLD_DEFAULT_MAX_ZOOM } from '../defaults.js'

describe('getViewResolutionConfig', () => {
  it('returns UK tile grid config', () => {
    const config = getViewResolutionConfig(ZOOM_ALIGNMENT.UK)
    expect(config.resolutions).toBe(UK_VIEW_RESOLUTIONS)
    expect(config.defaultMinZoom).toBe(0)
    expect(config.maxZoom).toBe(TILE_GRID_RESOLUTIONS.length - 1)
  })

  it('uses the OS tile grid levels for UK zooms, then carries on past its finest level to zoom 22', () => {
    const { resolutions } = getViewResolutionConfig(ZOOM_ALIGNMENT.UK)
    expect(resolutions.slice(0, TILE_GRID_RESOLUTIONS.length)).toEqual(TILE_GRID_RESOLUTIONS)
    expect(resolutions).toHaveLength(23)
    expect(resolutions[20]).toBe(TILE_GRID_RESOLUTIONS[13] / 2 ** 7)
  })

  it('returns world LOD config', () => {
    const config = getViewResolutionConfig(ZOOM_ALIGNMENT.WORLD)
    expect(config.resolutions).toBe(WORLD_LOD_RESOLUTIONS)
    expect(config.defaultMinZoom).toBe(WORLD_DEFAULT_MIN_ZOOM)
    expect(config.maxZoom).toBe(WORLD_DEFAULT_MAX_ZOOM)
  })

  it('falls back to UK config for unknown alignment', () => {
    const config = getViewResolutionConfig(undefined)
    expect(config.resolutions).toBe(UK_VIEW_RESOLUTIONS)
  })
})
