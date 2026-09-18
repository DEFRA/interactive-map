import proj4 from 'proj4'
import { register } from 'ol/proj/proj4.js'

export const BNG_CRS = 'EPSG:27700'

// Register British National Grid with proj4 so OL can use it — a module-level side effect,
// so any module needing EPSG:27700 (openlayersProvider.js, the datasets adapter's
// layerBuilders.js) just imports this rather than duplicating the proj4.defs() string.
// Idempotent: proj4.defs()/register() are safe to call more than once with the same definition.
proj4.defs(BNG_CRS, '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs')
register(proj4)
