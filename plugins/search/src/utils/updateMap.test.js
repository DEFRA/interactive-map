// src/plugins/search/utils/updateMap.test.js

import { updateMap } from './updateMap.js'

describe('updateMap', () => {
  let mapProvider
  let markers
  const bounds = { north: 1, south: 0 }
  const point = { lat: 10, lng: 20 }

  beforeEach(() => {
    mapProvider = {
      fitToBounds: jest.fn()
    }

    markers = {
      add: jest.fn()
    }
  })

  it('fits the map to bounds and adds a marker when showMarker is true', () => {
    updateMap({
      mapProvider,
      bounds,
      point,
      markers,
      showMarker: true,
      markerOptions: { background: 'red' }
    })

    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(bounds)
    expect(markers.add).toHaveBeenCalledWith(
      'search',
      point,
      { background: 'red' }
    )
  })

  it('fits the map to bounds and does not add a marker when showMarker is false', () => {
    updateMap({
      mapProvider,
      bounds,
      point,
      markers,
      showMarker: false,
      markerOptions: { background: 'blue' }
    })

    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(bounds)
    expect(markers.add).not.toHaveBeenCalled()
  })
})
