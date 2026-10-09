import { showResult } from './showResult.js'
import { updateMap } from './updateMap.js'

jest.mock('./updateMap.js')

describe('showResult', () => {
  it('focuses the map with the result message, moves the map and emits the match', () => {
    const services = { focusMap: jest.fn(), eventBus: { emit: jest.fn() } }
    const suggestion = { text: 'Carlisle, Cumbria', bounds: 'b', point: 'p' }
    showResult({ suggestion, query: 'carlisle', services, mapProvider: 'map', markers: 'markers', showMarker: true })

    expect(services.focusMap).toHaveBeenCalledWith({ message: 'Map moved to carlisle' })
    expect(updateMap).toHaveBeenCalledWith(expect.objectContaining({ mapProvider: 'map', bounds: 'b', point: 'p' }))
    expect(services.eventBus.emit).toHaveBeenCalledWith('search:match', { query: 'carlisle', ...suggestion })
  })
})
