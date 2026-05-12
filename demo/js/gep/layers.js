import VectorImageLayer from 'ol/layer/VectorImage.js'
import VectorSource from 'ol/source/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import TileGrid from 'ol/tilegrid/TileGrid.js'
import { tile as tileStrategy } from 'ol/loadingstrategy.js'
import { Style, Stroke, Fill } from 'ol/style.js'
import { createCanvasPattern } from './utils.js'

const PATTERN_ID = 'diagonal-cross-hatch'
const STROKE_COLOUR = '#1565C0'

let layer

const format = new GeoJSON({
  featureProjection: 'EPSG:27700',
  dataProjection: 'EPSG:27700'
})

function addFieldParcelsLayer(map) {
  const tileGrid = new TileGrid({
    extent: [0, 0, 700000, 1300000],
    resolutions: map.getView().getResolutions(),
    tileSize: 512
  })

  const source = new VectorSource({
    format,
    url: function(extent) {
      return `${process.env.FARMING_API_URL}/api/collections/parcels/items?crs=27700&bbox-crs=27700&bbox=${extent.join(',')}&limit=1000`
    },
    strategy: tileStrategy(tileGrid)
  })

  layer = new VectorImageLayer({
    source,
    style: new Style({
      stroke: new Stroke({ color: STROKE_COLOUR, width: 2 }),
      fill: new Fill({ color: 'rgba(21,101,192,0.1)' })
    }),
    minZoom: 10
  })

  map.addLayer(layer)

  createCanvasPattern(PATTERN_ID, STROKE_COLOUR).then(function(pattern) {
    if (pattern) {
      layer.setStyle(new Style({
        stroke: new Stroke({ color: STROKE_COLOUR, width: 2 }),
        fill: new Fill({ color: pattern })
      }))
    }
  })
}

function setLayerVisibility(visible) {
  if (layer) {
    layer.setVisible(visible)
  }
}

function renderLayersHTML() {
  return `
    <div class="im-c-datasets-layers">
      <div class="im-c-datasets-layers__item govuk-checkboxes govuk-checkboxes--small im-c-datasets-layers__item--checked" data-module="govuk-checkboxes">
        <div class="govuk-checkboxes__item">
          <input class="govuk-checkboxes__input" id="field-parcels-toggle" name="layers" type="checkbox" value="field-parcels" checked>
          <label class="im-c-datasets-layers__item-label govuk-label govuk-checkboxes__label" for="field-parcels-toggle">Field parcels</label>
        </div>
      </div>
    </div>
  `
}

function addLayerChangeHandler() {
  document.addEventListener('change', function(e) {
    if (e.target.id === 'field-parcels-toggle') {
      const visible = e.target.checked
      setLayerVisibility(visible)
      const keyItem = document.getElementById('field-parcels-key-item')
      const keyEmpty = document.getElementById('field-parcels-key-empty')
      if (keyItem) {
        keyItem.style.display = visible ? '' : 'none'
      }
      if (keyEmpty) {
        keyEmpty.style.display = visible ? 'none' : ''
      }
    }
  })
}

export { addFieldParcelsLayer, renderLayersHTML, addLayerChangeHandler }
