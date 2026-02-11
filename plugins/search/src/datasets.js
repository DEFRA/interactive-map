// src/plugins/search/datasets.js
import { parseOsNamesResults } from './utils/parseOsNamesResults.js'

export function createDatasets({ customDatasets = [], osNamesURL, crs }) {
  
  const defaultDatasets = [{
    name: 'osNames',
    urlTemplate: osNamesURL,
    parseResults: (json, query) => parseOsNamesResults(json, query, crs),
    includeRegex: /^[a-zA-Z0-9\s,-]+$/,
    excludeRegex: /^(?:[a-z]{2}\s*(?:\d{3}\s*\d{3}|\d{4}\s*\d{4}|\d{5}\s*\d{5})|\d+\s*,?\s*\d+)$/i // NOSONAR - complexity unavoidable for gridref/coordinate matching
  }]

  return [...defaultDatasets, ...customDatasets]
}
