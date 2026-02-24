/**
 * @jest-environment jsdom
 */
import { parseOsNamesResults, point } from './parseOsNamesResults.js'
import OsGridRef from 'geodesy/osgridref.js'

// Mock OsGridRef so we can control toLatLon outputs
jest.mock('geodesy/osgridref.js', () => {
  return jest.fn().mockImplementation((x, y) => ({
    x,
    y,
    toLatLon: () => ({ lat: y / 1e5, lon: x / 1e5 }) // deterministic lat/lon
  }))
})

describe('osNamesUtils', () => {
  const sampleEntry = {
    GAZETTEER_ENTRY: {
      ID: 1,
      NAME1: 'London',
      COUNTY_UNITARY: 'Greater London',
      DISTRICT_BOROUGH: 'Camden',
      POSTCODE_DISTRICT: 'WC1',
      LOCAL_TYPE: 'Town',
      MBR_XMIN: 1000,
      MBR_YMIN: 2000,
      MBR_XMAX: 3000,
      MBR_YMAX: 4000,
      GEOMETRY_X: 1500,
      GEOMETRY_Y: 2500
    }
  }

  test('returns empty array for null/invalid/error results', () => {
    expect(parseOsNamesResults(null, 'x', 'EPSG:27700')).toEqual([])
    expect(parseOsNamesResults({ error: true }, 'x', 'EPSG:27700')).toEqual([])
    expect(parseOsNamesResults({ header: { totalresults: 0 } }, 'x', 'EPSG:27700')).toEqual([])
  })

  test('removes tenuous results when query does not match', () => {
    const results = [
      { GAZETTEER_ENTRY: { ...sampleEntry.GAZETTEER_ENTRY, NAME1: 'Bristol', ID: 2 } }
    ]
    const json = { results }
    const output = parseOsNamesResults(json, 'London', 'EPSG:27700')
    expect(output).toHaveLength(0)
  })

  test('removes duplicate IDs', () => {
    const dup = { ...sampleEntry, GAZETTEER_ENTRY: { ...sampleEntry.GAZETTEER_ENTRY } }
    const json = { results: [sampleEntry, dup] }
    const output = parseOsNamesResults(json, 'London', 'EPSG:27700')
    expect(output).toHaveLength(1)
  })

  test('limits results to MAX_RESULTS', () => {
    const manyResults = Array.from({ length: 10 }, (_, i) => ({
      GAZETTEER_ENTRY: { ...sampleEntry.GAZETTEER_ENTRY, ID: i }
    }))
    const json = { results: manyResults }
    const output = parseOsNamesResults(json, 'London', 'EPSG:27700')
    expect(output).toHaveLength(8)
  })

  test('bounds returns raw OSGB values for EPSG:27700', () => {
    const json = { results: [sampleEntry] }
    const output = parseOsNamesResults(json, 'London', 'EPSG:27700')
    expect(output[0].bounds).toEqual([
      sampleEntry.GAZETTEER_ENTRY.MBR_XMIN,
      sampleEntry.GAZETTEER_ENTRY.MBR_YMIN,
      sampleEntry.GAZETTEER_ENTRY.MBR_XMAX,
      sampleEntry.GAZETTEER_ENTRY.MBR_YMAX
    ])
    expect(output[0].point).toEqual([
      sampleEntry.GAZETTEER_ENTRY.GEOMETRY_X,
      sampleEntry.GAZETTEER_ENTRY.GEOMETRY_Y
    ])
  })

  test('bounds converts to WGS84 for EPSG:4326', () => {
    const json = { results: [sampleEntry] }
    const output = parseOsNamesResults(json, 'London', 'EPSG:4326')
    const expectedBounds = [
      Math.round(1000 / 1e5 * 1e6) / 1e6,
      Math.round(2000 / 1e5 * 1e6) / 1e6,
      Math.round(3000 / 1e5 * 1e6) / 1e6,
      Math.round(4000 / 1e5 * 1e6) / 1e6
    ]
    expect(output[0].bounds).toEqual(expectedBounds)
    const expectedPoint = [
      Math.round(1500 / 1e5 * 1e6) / 1e6,
      Math.round(2500 / 1e5 * 1e6) / 1e6
    ]
    expect(output[0].point).toEqual(expectedPoint)
  })

  test('label generates marked text', () => {
    const json = { results: [sampleEntry] }
    const output = parseOsNamesResults(json, 'London', 'EPSG:27700')
    expect(output[0].text).toContain('London')
    expect(output[0].marked).toContain('<mark>')
  })

  test('handles MBR_XMIN null by using buffered GEOMETRY_X/Y', () => {
    const entry = {
      GAZETTEER_ENTRY: { ...sampleEntry.GAZETTEER_ENTRY, MBR_XMIN: null, MBR_YMIN: null }
    }
    const json = { results: [entry] }
    const output = parseOsNamesResults(json, 'London', 'EPSG:27700')
    expect(output[0].bounds).toEqual([
      entry.GAZETTEER_ENTRY.GEOMETRY_X - 500,
      entry.GAZETTEER_ENTRY.GEOMETRY_Y - 500,
      entry.GAZETTEER_ENTRY.GEOMETRY_X + 500,
      entry.GAZETTEER_ENTRY.GEOMETRY_Y + 500
    ])
  })

  test('label falls back to DISTRICT_BOROUGH when COUNTY_UNITARY is absent', () => {
    const entry = { GAZETTEER_ENTRY: { ...sampleEntry.GAZETTEER_ENTRY, COUNTY_UNITARY: null } }
    const output = parseOsNamesResults({ results: [entry] }, 'London', 'EPSG:27700')
    expect(output[0].text).toContain(sampleEntry.GAZETTEER_ENTRY.DISTRICT_BOROUGH)
  })

  test('label omits qualifier for City type', () => {
    const entry = { GAZETTEER_ENTRY: { ...sampleEntry.GAZETTEER_ENTRY, LOCAL_TYPE: 'City' } }
    const output = parseOsNamesResults({ results: [entry] }, 'London', 'EPSG:27700')
    expect(output[0].text).toBe('London')
  })

  test('throws error for unsupported CRS', () => {
    const entry = { GAZETTEER_ENTRY: { ...sampleEntry.GAZETTEER_ENTRY } }
    const json = { results: [entry] }
    expect(() => parseOsNamesResults(json, 'London', 'EPSG:9999')).toThrow('Unsupported CRS')
  })

  test('point function throws error for unsupported CRS', () => {
    const coords = { GEOMETRY_X: 1500, GEOMETRY_Y: 2500 }
    expect(() => point('EPSG:9999', coords)).toThrow('Unsupported CRS: EPSG:9999')
  })
})