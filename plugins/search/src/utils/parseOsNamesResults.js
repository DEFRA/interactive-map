// src/plugins/search/osNamesUtils.js
import OsGridRef from 'geodesy/osgridref.js'

const POINT_BUFFER = 500
const MAX_RESULTS = 8

const isPostcode = (value) => {
  value = value.replaceAll(/\s/g, '')
  const regex = /^(([A-Z]{1,2}\d[A-Z\d]?|ASCN|STHL|TDCU|BBND|[BFS]IQQ|PCRN|TKCA) ?\d[A-Z]{2}|BFPO ?\d{1,4}|(KY\d|MSR|VG|AI)[ -]?\d{4}|[A-Z]{2} ?\d{2}|GE ?CX|GIR ?0A{2}|SAN ?TA1)$/i
  return regex.test(value)
}

const removeNonEngland = (results) =>
  results.filter(r => r.GAZETTEER_ENTRY.COUNTRY.toLowerCase() === 'england')

const removeDuplicates = (results) =>
  Array.from(new Map(results.map(r => [r.GAZETTEER_ENTRY.ID, r])).values())

const removeTenuousResults = (results, query) => {
  const words = query.toLowerCase().replaceAll(',', '').split(' ')
  return results.filter(l => words.some(w => l.GAZETTEER_ENTRY.NAME1.toLowerCase().includes(w) || isPostcode(query)))
}

const markString = (string, find) => {
  const clean = find.replaceAll(/\s+/g, '')
  // Create a pattern where whitespace is optional between every character
  // e.g. "ab12cd" -> "a\s* b\s* 1\s* 2\s* c\s* d"
  const spacedPattern = clean.split('').join('\\s*')
  const reg = new RegExp(`(${spacedPattern})`, 'i')
  return string.replace(reg, '<mark>$1</mark>')
}

// Public functions

const bounds = (crs, { MBR_XMIN, MBR_YMIN, MBR_XMAX, MBR_YMAX, GEOMETRY_X, GEOMETRY_Y }) => {
  let minX, minY, maxX, maxY

  // Use either MBR or buffered point depending on what's provided
  if (MBR_XMIN != null) {
    minX = MBR_XMIN
    minY = MBR_YMIN
    maxX = MBR_XMAX
    maxY = MBR_YMAX
  } else {
    minX = GEOMETRY_X - POINT_BUFFER
    minY = GEOMETRY_Y - POINT_BUFFER
    maxX = GEOMETRY_X + POINT_BUFFER
    maxY = GEOMETRY_Y + POINT_BUFFER
  }

  // If CRS is already EPSG:27700 (OSGB), just return the raw values
  if (crs === 'EPSG:27700') {
    return [minX, minY, maxX, maxY]
  }

  // If CRS is EPSG:4326, convert OSGB → WGS84 lat/lon
  if (crs === 'EPSG:4326') {
    const minLL = (new OsGridRef(minX, minY)).toLatLon();
    const maxLL = (new OsGridRef(maxX, maxY)).toLatLon();

    return [minLL.lon, minLL.lat, maxLL.lon, maxLL.lat].map(n => Math.round(n * 1e6) / 1e6)
  }

  throw new Error(`Unsupported CRS: ${crs}`)
}

const point = (crs, { GEOMETRY_X, GEOMETRY_Y }) => {

  // EPSG:27700 → return raw OSGB grid coordinates (meters)
  if (crs === 'EPSG:27700') {
    return [GEOMETRY_X, GEOMETRY_Y]
  }

  // EPSG:4326 → convert OSGB to WGS84 lat/lon
  if (crs === 'EPSG:4326') {
    const p = (new OsGridRef(GEOMETRY_X, GEOMETRY_Y)).toLatLon()
    return [Math.round(p.lon * 1e6) / 1e6, Math.round(p.lat * 1e6) / 1e6]
  }

  throw new Error(`Unsupported CRS: ${crs}`)
}

const label = (query, { NAME1, COUNTY_UNITARY, DISTRICT_BOROUGH, POSTCODE_DISTRICT, LOCAL_TYPE }) => {
  const qualifier = `${!['City', 'Postcode'].includes(LOCAL_TYPE) ? POSTCODE_DISTRICT + ', ' : ''}${LOCAL_TYPE !== 'City' ? (COUNTY_UNITARY || DISTRICT_BOROUGH) : ''}`
  const text = `${NAME1}${qualifier ? ', ' + qualifier : ''}`
  return {
    text,
    marked: markString(text, query)
  }
}

const parseOsNamesResults = (json, query, crs) => {
  if (!json || json.error || json.header?.totalresults === 0) {
    return []
  }
  let results = json.results
  results = removeTenuousResults(results, query)
  results = removeDuplicates(results)
  results = removeNonEngland(results)
  results = results.slice(0, MAX_RESULTS)

  return results.map(l => ({
    id: l.GAZETTEER_ENTRY.ID,
    bounds: bounds(crs, l.GAZETTEER_ENTRY),
    point: point(crs, l.GAZETTEER_ENTRY),
    ...label(query, l.GAZETTEER_ENTRY),
    type: 'os-names'
  }))
}

export {
  parseOsNamesResults
}