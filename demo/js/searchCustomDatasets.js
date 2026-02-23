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
const buildGridrefRequest = (query) => {
  let bodyData

  if (query.includes(',')) {
    const parts = query.split(',')
    const easting = Number(parts[0]?.trim())
    const northing = Number(parts[1]?.trim())
    bodyData = (!isNaN(easting) && !isNaN(northing))
      ? [{ easting, northing }]
      : [{ gridref: query }]
  } else {
    bodyData = [{ gridref: query }]
  }

  return {
    url: `${process.env.FARMING_API_URL}/convert-to-wgs84`,
    options: {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    }
  }
}

const parseGridrefResults = (json, query) => {
  if (!json?.[0]) return []

  const { coordinates, bounds } = json[0]
  const isEastingNorthing = query.includes(',')

  const formattedQuery = isEastingNorthing
    ? query
        .split(',')
        .map(part => part.trim().replace(/\s+/g, ''))
        .join(', ')
    : formatGridRef(query)

  return [{
    id: formattedQuery,
    point: coordinates,
    bounds: [bounds.min_lon, bounds.min_lat, bounds.max_lon, bounds.max_lat],
    text: formattedQuery,
    marked: `<mark>${formattedQuery}</mark>${!isEastingNorthing ? ' (Grid reference)' : ''}`,
    type: 'gridref'
  }]
}

const buildParcelRequest = (query) => {
  const sanitisedQuery = query.replace(/ /g,'')
  const url = `${process.env.FARMING_API_URL}/parcel/{query}`
  return {
    url: url.replace('{query}', encodeURIComponent(sanitisedQuery)),
    options: {
      method: 'GET'
    }
  }
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

const searchCustomDatasets = [{
  name: 'parcel',
  includeRegex: /^[A-Z]{2}\s?\d{4}\s?\d{4}$/i,
  buildRequest: buildParcelRequest,
  parseResults: parseParcelResults,
  exclusive: true,
},{
  name: 'gridref',
  includeRegex: /^(?:[A-Za-z]{2}\s*(?:\d{3}\s*\d{3}|\d{4}\s*\d{4}|\d{5}\s*\d{5})|\d+\s*,?\s*\d+)$/i,
  buildRequest: buildGridrefRequest,
  parseResults: parseGridrefResults
}]

export {
  searchCustomDatasets
}