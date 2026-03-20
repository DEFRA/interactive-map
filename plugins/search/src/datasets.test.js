// src/plugins/search/datasets.test.js

import { createDatasets } from './datasets'
import * as parseModule from './utils/parseOsNamesResults.js'

describe('createDatasets', () => {
  const osNamesURL = 'https://example.com/osnames'
  const crs = 'EPSG:4326'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns only customDatasets if osNamesURL is not provided', () => {
    const custom = [
      { name: 'custom1', urlTemplate: 'https://custom.com' },
      { name: 'custom2', urlTemplate: 'https://custom2.com' }
    ]
    const datasets = createDatasets({ customDatasets: custom, crs })
    expect(datasets).toHaveLength(2)
    expect(datasets).toEqual(custom)
  })

  it('returns empty array if neither osNamesURL nor customDatasets are provided', () => {
    const datasets = createDatasets({ crs })
    expect(datasets).toEqual([])
  })

  it('returns default dataset with correct properties', () => {
    const datasets = createDatasets({ osNamesURL, crs })
    expect(datasets).toHaveLength(1)
    const ds = datasets[0]

    expect(ds.name).toBe('osNames')
    expect(ds.urlTemplate).toBe(osNamesURL)
    expect(ds.includeRegex).toEqual(/[a-zA-Z0-9]/)
    expect(ds.excludeRegex).toEqual(
      /^(?:[a-z]{2}\s*(?:\d{3}\s*\d{3}|\d{4}\s*\d{4}|\d{5}\s*\d{5})|\d+\s*,?\s*\d+)$/i
    )
    expect(typeof ds.parseResults).toBe('function')
  })

  it('merge custom datasets with default dataset', () => {
    const custom = [{ name: 'custom1', urlTemplate: 'https://custom.com' }]
    const datasets = createDatasets({ osNamesURL, crs, customDatasets: custom })
    expect(datasets).toHaveLength(2)
    expect(datasets[1]).toEqual(custom[0])
  })

  it('parseResults calls parseOsNamesResults with correct arguments', () => {
    const parseMock = jest.spyOn(parseModule, 'parseOsNamesResults').mockReturnValue('parsed')
    const datasets = createDatasets({ osNamesURL, crs })
    const json = { some: 'data' }
    const query = 'test query'

    const result = datasets[0].parseResults(json, query)
    expect(parseMock).toHaveBeenCalledWith(json, query, ['england', 'scotland', 'wales'], crs)
    expect(result).toBe('parsed')
    parseMock.mockRestore()
  })
})
