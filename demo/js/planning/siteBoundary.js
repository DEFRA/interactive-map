// import { getQueryParam, setQueryParam } from './queryParams.js'
// import { checkParamsForPolygon, encodePolygon } from '../../../../server/services/shape-utils.js'

const WEST = 0
const SOUTH = 1
const EAST = 2
const NORTH = 3

// const getPolygonFromUrl = () => {
//   try {
//     const encodedPolygon = getQueryParam('encodedPolygon')
//     const queryStringPolygon = getQueryParam('polygon')
//     if (!(encodedPolygon || queryStringPolygon)) {
//       return null
//     }
//     const { polygon: polygonString } = checkParamsForPolygon({ encodedPolygon, polygon: queryStringPolygon, encode: false })
//     return [JSON.parse(polygonString)]
//   } catch (_error) {
//     return null
//   }
// }
const FRAME_MAX_ZOOM = 22

export class SiteBoundary {
  constructor (id = 'boundary') {
    this._feature = null
    this._temporaryFeature = null
    this._id = id
    this._state = SiteBoundary.EMPTY
    this._type = null
    this._maxZoom = 20
    this._mapView = null
    // initialise the feature from the coordinates in the url, if there is one
    //this.coordinates = getPolygonFromUrl()
    this.coordinates = null
  }

  // possible states
  static EMPTY = 'empty'
  static EDITING = 'editing'
  static COMPLETE = 'complete'
  // possible types
  static POLYGON = 'polygon'
  static SQUARE = 'square'

  get type () { return this._type }
  set type (newType) { this._type = newType }

  get frameMaxZoom () { return FRAME_MAX_ZOOM }
  get id () { return this._id }

  get state () { return this._state }
  set state (newState) { this._state = newState }

  get maxZoom () { return this._maxZoom }
  set maxZoom (newMaxZoom) { this._maxZoom = newMaxZoom }
  resetZoom () {
    if (this.mapView?.constraints) {
      this.mapView.constraints.maxZoom = this.maxZoom
    }
  }

  zoomOnSquare () {
    if (this.mapView?.constraints) {
      // Zoom in to avoid huge frames being requested by default
      this.mapView.constraints.maxZoom = this.frameMaxZoom
      this.mapView.goTo({ center: this.mapView.center, zoom: this.frameMaxZoom, duration: 200 })
    }
  }

  get mapView () { return this._mapView }
  set mapView (newMapView) {
    this._mapView = newMapView
    this.maxZoom = newMapView?.constraints?.maxZoom || this._maxZoom
  }

  get isSquare () { return this.type === SiteBoundary.SQUARE }
  get isPolygon () { return this.type === SiteBoundary.POLYGON }
  get isEmpty () { return this.state === SiteBoundary.EMPTY }
  get isEditing () { return this.state === SiteBoundary.EDITING }
  get isComplete () { return this.state === SiteBoundary.COMPLETE }

  get feature () { return this._feature }
  set feature (feature) {
    // setQueryParam('polygon', null)
    if (!feature?.geometry?.coordinates) {
      this._feature = null
      this.state = SiteBoundary.EMPTY
      // setQueryParam('encodedPolygon', null)
      return
    }
    // round the coordinates to 2 decimal places
    const coordinates = feature.geometry.coordinates[0].map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100])
    feature.geometry.coordinates = [coordinates]

    const { id } = this
    const properties = { ...feature.properties, id }

    // set the feature and update the state and query param
    this._feature = { ...feature, id, properties }
    this.state = SiteBoundary.COMPLETE
    // setQueryParam('encodedPolygon', this.encodedPolygon)
  }

  get temporaryFeature () { return this._temporaryFeature }
  set temporaryFeature (feature) {
    if (!feature?.geometry?.coordinates) {
      this._temporaryFeature = null
      return
    }
    this._temporaryFeature = feature
  }

  get coordinates () {
    return this._feature?.geometry?.coordinates
  }

  // get encodedPolygon () {
  //   return this.coordinates ? encodePolygon(this.coordinates[0]) : null
  // }

  get extents () {
    const { coordinates } = this
    if (!coordinates) {
      return null
    }
    return coordinates[0].reduce((acc, [x, y]) => {
      acc[WEST] = Math.min(acc[WEST], x)
      acc[SOUTH] = Math.min(acc[SOUTH], y)
      acc[EAST] = Math.max(acc[EAST], x)
      acc[NORTH] = Math.max(acc[NORTH], y)
      return acc
    }, [Infinity, Infinity, -Infinity, -Infinity])
  }

  set coordinates (coordinates) {
    if (coordinates) {
      this.state = SiteBoundary.COMPLETE
      this.type = SiteBoundary.POLYGON
      this._feature = {
        id: this._id,
        type: 'feature',
        properties: { id: this._id },
        geometry: {
          type: 'Polygon',
          coordinates
        }
      }
    } else {
      this.feature = null
    }
  }
}

Object.freeze(SiteBoundary)

export const siteBoundary = new SiteBoundary()
