// Takes a raw GAZETTEER_ENTRY and maps it to location structure
export function mapToLocationModel ({ ID, NAME1, POPULATED_PLACE, COUNTY_UNITARY, REGION, GEOMETRY_X, GEOMETRY_Y }) {
  return {
    id: ID || '',
    place: `${NAME1}${POPULATED_PLACE ? ', ' + POPULATED_PLACE : ''}${COUNTY_UNITARY ? ', ' + COUNTY_UNITARY : ''}, ${REGION}`,
    county: COUNTY_UNITARY || '',
    coordinates: [GEOMETRY_X, GEOMETRY_Y]
  }
}
