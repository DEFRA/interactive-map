import VectorSource from 'ol/source/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'

const PROJECTION = 'EPSG:27700'

// No coordinate transformation: data and map both use BNG.
const format = new GeoJSON({ dataProjection: PROJECTION, featureProjection: PROJECTION })

/**
 * Wraps an OL VectorSource with a GeoJSON-oriented API keyed by feature ID.
 * All GeoJSON in and out uses EPSG:27700 coordinates (BNG easting/northing).
 */
export const createFeatureStore = () => {
  const source = new VectorSource()

  return {
    /** The underlying VectorSource, passed to OL interactions and layers. */
    source,

    /** Get the raw OL Feature by ID, or null. */
    getOL (id) {
      return source.getFeatureById(String(id)) ?? null
    },

    /** Add or replace a GeoJSON feature. Returns the OL Feature. */
    add (geojsonFeature) {
      const existing = this.getOL(geojsonFeature.id)
      if (existing) {
        source.removeFeature(existing)
      }
      const olFeature = format.readFeature(geojsonFeature)
      source.addFeature(olFeature)
      return olFeature
    },

    /** Get a GeoJSON feature by ID, or null. */
    get (id) {
      const feature = this.getOL(id)
      return feature ? format.writeFeatureObject(feature) : null
    },

    /** Remove a feature by ID. */
    remove (id) {
      const feature = this.getOL(id)
      if (feature) {
        source.removeFeature(feature)
      }
    },

    /** Remove all features. */
    clear () {
      source.clear()
    },

    /** Convert an OL Feature to a GeoJSON object. */
    toGeoJSON (olFeature) {
      return format.writeFeatureObject(olFeature)
    },

    /** Convert a GeoJSON object to an OL Feature (no side effects). */
    fromGeoJSON (geojsonFeature) {
      return format.readFeature(geojsonFeature)
    }
  }
}
