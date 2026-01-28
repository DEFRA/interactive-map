import OsGridRef, { LatLon } from 'geodesy/osgridref.js'
import { mapToLocationModel } from './utils/mapToLocationModel.js'

// Default url for simple config
const URL = 'https://api.os.uk/search/names/v1/nearest?point={easting},{northing}&radius=1000&fq=local_type:Airfield%20local_type:Airport%20local_type:Bus_Station%20local_type:Chemical_Works%20local_type:City%20local_type:Coach_Station%20local_type:Electricity_Distribution%20local_type:Electricity_Production%20local_type:Further_Education%20local_type:Gas_Distribution_or_Storage%20local_type:Hamlet%20local_type:Harbour%20local_type:Helicopter_Station%20local_type:Heliport%20local_type:Higher_or_University_Education%20local_type:Hill_Or_Mountain%20local_type:Hospice%20local_type:Hospital%20local_type:Medical_Care_Accommodation%20local_type:Named_Road%20local_type:Non_State_Primary_Education%20local_type:Non_State_Secondary_Education%20local_type:Other_Settlement%20local_type:Passenger_Ferry_Terminal%20local_type:Port_Consisting_of_Docks_and_Nautical_Berthing%20local_type:Postcode%20local_type:Primary_Education%20local_type:Railway_Station%20local_type:Road_User_Services%20local_type:Secondary_Education%20local_type:Section_Of_Named_Road%20local_type:Section_Of_Numbered_Road%20local_type:Special_Needs_Education%20local_type:Suburban_Area%20local_type:Town%20local_type:Urban_Greenspace%20local_type:Vehicular_Ferry_Terminal%20local_type:Vehicular_Rail_Terminal%20local_type:Village%20local_type:Waterfall%20'

export const reverseGeocode = async (url = URL, transformRequest, crs, zoom, coord) => {
  let bng = coord

  if (crs === 'EPSG:4326') {
    try {
      bng = (new LatLon(coord[1], coord[0])).toOsGrid()
      bng = [bng.easting, bng.northing].map(c => Math.round(c))
    } catch (err) {
      console.log(err)
      return null
    }
  }

  url = url.replace('{easting}', Math.round(bng[0])).replace('{northing}', Math.round(bng[1]))
  let request = new Request(url, { method: 'GET' })

  if (transformRequest) {
    try {
      request = await transformRequest(request)
    } catch (err) {
      console.log('Error transforming request:', err)
      return null
    }
  }

  const response = await fetch(request)
  const json = await response.json()
  const model = mapToLocationModel(json.results[0].GAZETTEER_ENTRY)

  if (crs === 'EPSG:4326') {
    const osGridRef = new OsGridRef(model.coordinates[0], model.coordinates[1])
    const latLon = osGridRef.toLatLon()
    model.coordinates = [latLon.lat, latLon.lon]
  }

  const message = `Approximate centre ${model?.place}`
  return json.results ? message : null
}
