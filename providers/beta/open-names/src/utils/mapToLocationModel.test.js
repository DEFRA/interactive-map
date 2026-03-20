import { mapToLocationModel } from './mapToLocationModel.js'

describe('mapToLocationModel', () => {
  it('maps all fields correctly', () => {
    const raw = {
      ID: '123',
      NAME1: 'Springfield',
      POPULATED_PLACE: 'Downtown',
      COUNTY_UNITARY: 'Shelby',
      REGION: 'Midlands',
      GEOMETRY_X: 10.5,
      GEOMETRY_Y: 20.5
    }

    const result = mapToLocationModel(raw)

    expect(result).toEqual({
      id: '123',
      place: 'Springfield, Downtown, Shelby, Midlands',
      county: 'Shelby',
      coordinates: [10.5, 20.5]
    })
  })

  it('handles missing optional fields', () => {
    const raw = {
      ID: '456',
      NAME1: 'Smallville',
      REGION: 'Eastlands',
      GEOMETRY_X: 1,
      GEOMETRY_Y: 2
    }

    const result = mapToLocationModel(raw)

    expect(result).toEqual({
      id: '456',
      place: 'Smallville, Eastlands',
      county: '',
      coordinates: [1, 2]
    })
  })

  it('handles missing ID', () => {
    const raw = {
      NAME1: 'Nowhere',
      REGION: 'Unknown',
      GEOMETRY_X: 0,
      GEOMETRY_Y: 0
    }

    const result = mapToLocationModel(raw)

    expect(result).toEqual({
      id: '',
      place: 'Nowhere, Unknown',
      county: '',
      coordinates: [0, 0]
    })
  })
})
