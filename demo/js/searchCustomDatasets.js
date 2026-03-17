// src/plugins/search/datasets/customGridrefDataset.js

const formatParcelId = (input) => {
  if (!input) {
    return null
  }

  // Trim, uppercase, and remove extra spaces
  const value = input.toUpperCase().replace(/\s+/g, '')

  // Match pattern: 2 letters + 4–10 digits
  const match = value.match(/^([A-Z]{2})(\d{4,10})$/)
  if (!match) {
    return null
  }

  const [, letters, digits] = match

  // Must have even number of digits (pairs for easting/northing)
  if (digits.length % 2 !== 0) {
    return null
  }

  const half = digits.length / 2
  const easting = digits.slice(0, half)
  const northing = digits.slice(half)

  // Format: AB1234 5678
  return `${letters}${easting} ${northing}`
}

const formatGridRef = (query) => {
  const trimmed = query.trim().toUpperCase()
  const match = trimmed.match(/^([A-Z]{2})(\d+)$/)
  if (!match) {
    return trimmed
  }

  const [, letters, numbers] = match
  const half = numbers.length / 2
  const easting = numbers.slice(0, half)
  const northing = numbers.slice(half)
  return `${letters} ${easting} ${northing}`
}

// Dataset-level buildRequest
const buildGridrefRequest = (query, crs = 'wgs84') => {
  const clean = query.trim()
  const params = new URLSearchParams({ output: crs })

  if (clean.includes(',')) {
    const parts = clean.split(',')
    const eastingStr = parts[0]?.trim()
    const northingStr = parts[1]?.trim()
    const easting = Number(eastingStr)
    const northing = Number(northingStr)
    if (!Number.isNaN(easting) && !Number.isNaN(northing) && eastingStr.length === northingStr.length) {
      params.set('easting', easting)
      params.set('northing', northing)
    } else {
      params.set('gridref', clean)
    }
  } else {
    params.set('gridref', clean)
  }

  return `${process.env.FARMING_API_URL}/gridref?${params}`
}

const parseGridrefResults = (json, query) => {
  if (!json) {
    return []
  }

  const clean = query.trim()
  const isWgs84 = 'lat' in json
  const isEastingNorthing = clean.includes(',')

  const formattedQuery = isEastingNorthing
    ? clean.split(',').map(part => part.trim().replace(/\s+/g, '')).join(', ')
    : formatGridRef(clean)

  const point = isWgs84
    ? [json.lon, json.lat]
    : [json.easting, json.northing]

  const bounds = isWgs84
    ? [json.bounds.min_lon, json.bounds.min_lat, json.bounds.max_lon, json.bounds.max_lat]
    : [json.bounds.min_easting, json.bounds.min_northing, json.bounds.max_easting, json.bounds.max_northing]

  return [{
    id: formattedQuery,
    point,
    bounds,
    text: formattedQuery,
    marked: `<mark>${formattedQuery}</mark> (Grid reference)`,
    type: 'gridref'
  }]
}

const buildParcelRequest = (query) => {
  const sanitisedQuery = query.replace(/ /g,'')
  const url = `${process.env.FARMING_API_URL}/parcel/{query}`
  return url.replace('{query}', encodeURIComponent(sanitisedQuery))
}

const parseParcelResults = (json, query) => {
  const formattedParcelId = formatParcelId(query)

  return json ? [{
    ...json,
    text: formattedParcelId,
    marked: `<mark>${formattedParcelId}</mark> (Field parcel)`,
    type: 'parcel'
  }] : []
}

const parcelSearch = {
  name: 'parcel',
  includeRegex: /^[A-Z]{2}\s?\d{4}\s?\d{4}$/i,
  buildRequest: buildParcelRequest,
  parseResults: parseParcelResults,
  exclusive: true,
}

const gridRefSearchETRS89 = {
  name: 'gridref',
  includeRegex: /^(?:[A-Za-z]{2}\s*(?:\d{3}\s*\d{3}|\d{4}\s*\d{4}|\d{5}\s*\d{5})|\d+\s*,\s*\d+)$/i,
  buildRequest: (query) => buildGridrefRequest(query, 'wgs84'),
  parseResults: parseGridrefResults
}

const gridRefSearchOSGB36 = {
  name: 'gridref',
  includeRegex: /^(?:[A-Za-z]{2}\s*(?:\d{3}\s*\d{3}|\d{4}\s*\d{4}|\d{5}\s*\d{5})|\d+\s*,\s*\d+)$/i,
  buildRequest: (query) => buildGridrefRequest(query, 'osgb36'),
  parseResults: parseGridrefResults
}

export {
  parcelSearch,
  gridRefSearchETRS89,
  gridRefSearchOSGB36
}