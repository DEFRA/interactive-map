const pointData = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { category: 'prehistoric' },
    geometry: { coordinates: [-2.4558622, 54.5617135], type: 'Point' }
  }, {
    type: 'Feature',
    properties: { category: 'roman' },
    geometry: { coordinates: [-2.439823, 54.5525437], type: 'Point' }
  },
  {
    type: 'Feature',
    properties: { category: 'medieval' },
    geometry: { coordinates: [-2.4481939, 54.5575261], type: 'Point' }
  }]
}

export const datasets = [
  {
    id: 'land-covers',
    label: 'Land covers',
    geojson: `${process.env.FARMING_API_URL}/api/collections/parcels/items?sbi=106325052`, // 106200212
    query: {},
    maxFeatures: 50000, // Optional: evict distant features when exceeded
    minZoom: 10,
    maxZoom: 24,
    showInKey: true,
    showInMenu: true,
    sublayers: [{
      id: '130-131',
      label: 'Permanent grassland',
      filter: ['in', ['get', 'dominant_land_cover'], ['literal', ['130', '131']]], // 'dominant_land_cover = "130"'
      showInMenu: true,
      style: {
        stroke: { outdoor: '#00897B', dark: '#ffffff' },
        fillPattern: 'diagonal-cross-hatch',
        fillPatternForegroundColor: { outdoor: '#00897B', dark: '#ffffff' },
        fillPatternBackgroundColor: 'transparent'
      }
    }, {
      id: '332',
      label: 'Woodland',
      filter: ['==', ['get', 'dominant_land_cover'], '332'],
      showInMenu: true,
      style: {
        stroke: { outdoor: '#2E7D32', dark: '#ffffff' },
        fillPattern: 'dot',
        fillPatternForegroundColor: { outdoor: '#2E7D32', dark: '#ffffff' },
        fillPatternBackgroundColor: 'transparent'
      }
    }, {
      id: '110',
      label: 'Arable',
      filter: ['==', ['get', 'dominant_land_cover'], '110'],
      showInMenu: true,
      style: {
        stroke: { outdoor: '#6D4C41', dark: '#ffffff' },
        fillPattern: 'horizontal-hatch',
        fillPatternForegroundColor: { outdoor: '#6D4C41', dark: '#ffffff' },
        fillPatternBackgroundColor: 'transparent'
      }
    }, {
      id: '379',
      label: 'Farmyards',
      visibility: 'hidden',
      filter: ['==', ['get', 'dominant_land_cover'], '379'],
      showInMenu: true,
      style: {
        stroke: { outdoor: '#6A1B9A', dark: '#ffffff' },
        fillPattern: 'forward-diagonal-hatch',
        fillPatternForegroundColor: { outdoor: '#6A1B9A', dark: '#ffffff' },
        fillPatternBackgroundColor: 'transparent'
      }
    }, {
      id: 'other',
      label: 'Others',
      filter: ['!', ['in', ['get', 'dominant_land_cover'], ['literal', ['110', '130', '131', '332', '379']]]],
      showInMenu: true,
      style: {
        stroke: { outdoor: '#1565C0', dark: '#ffffff' },
        fill: 'rgba(0,0,255,0.1)',
        fillPattern: 'vertical-hatch',
        fillPatternForegroundColor: { outdoor: '#1565C0', dark: '#ffffff' }
        // fillPatternBackgroundColor: 'transparent'
      }
    }]
  },
  {
    id: 'existing-fields',
    label: 'Existing fields',
    // groupLabel: 'Test group',
    filter: ['all', ['==', ['get', 'sbi'], '106223377'], ['==', ['get', 'is_dominant_land_cover'], true]],
    tiles: ['https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges/{z}/{x}/{y}'],
    sourceLayer: 'field_parcels_filtered',
    minZoom: 10,
    maxZoom: 24,
    showInKey: true,
    showInMenu: true,
    style: {
      stroke: { outdoor: '#1565C0', dark: '#ffffff' },
      strokeWidth: 2,
      fill: 'rgba(21,101,192,0.1)',
      symbolDescription: { outdoor: 'blue outline', dark: 'white outline' }
    }
  }, {
    id: 'historic-monuments',
    label: 'Historic monuments',
    geojson: pointData,
    minZoom: 10,
    maxZoom: 24,
    showInKey: true,
    showInMenu: true,
    style: {
      symbol: 'square',
      symbolGraphic: 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z' // Historic monument
    },
    sublayers: [{
      id: 'prehistoric',
      label: 'Prehistoric',
      filter: ['in', ['get', 'category'], 'prehistoric'],
      showInMenu: true,
      style: {
        symbolBackgroundColor: '#00897B'
      }
    }, {
      id: 'roman',
      label: 'Roman',
      filter: ['in', ['get', 'category'], 'roman'],
      showInMenu: true,
      style: {
        symbolBackgroundColor: '#ca3535'
      }
    }, {
      id: 'medieval',
      label: 'Medieval',
      filter: ['in', ['get', 'category'], 'medieval'],
      showInMenu: true,
      style: {
        symbolBackgroundColor: '#1565C0'
      }
    }]
  }, {
    id: 'hedge-control',
    label: 'Hedge control',
    // groupLabel: 'Test group',
    tiles: ['https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges/{z}/{x}/{y}'],
    sourceLayer: 'hedge_control',
    minZoom: 10,
    maxZoom: 24,
    showInKey: true,
    showInMenu: true,
    visibility: 'hidden',
    style: {
      stroke: '#b58840',
      fill: 'transparent',
      strokeWidth: 4,
      symbolDescription: { outdoor: 'blue outline' },
      keySymbolShape: 'line'
    }
  }]

export const expectedMenuConfig = [
  {
    id: 'land-covers',
    label: 'Land covers',
    visibleWhen: true,
    type: 'checkbox',
    items: [
      { id: '130-131', label: 'Permanent grassland', checked: true },
      { id: '332', label: 'Woodland', checked: true },
      { id: '110', label: 'Arable', checked: true },
      { id: '379', label: 'Farmyards', checked: false },
      { id: 'other', label: 'Others', checked: true }
    ]
  },
  {
    type: 'divider',
    visibleWhen: true,
    items: [
      { id: 'existing-fields', label: 'Existing fields', checked: true }
    ]
  },
  {
    id: 'historic-monuments',
    label: 'Historic monuments',
    visibleWhen: true,
    type: 'checkbox',
    items: [
      { id: 'prehistoric', label: 'Prehistoric', checked: true },
      { id: 'roman', label: 'Roman', checked: true },
      { id: 'medieval', label: 'Medieval', checked: true }
    ]
  },
  {
    type: 'divider',
    visibleWhen: true,
    items: [
      { id: 'hedge-control', label: 'Hedge control', checked: false }
    ]
  }
]
