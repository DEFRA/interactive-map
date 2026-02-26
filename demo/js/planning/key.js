import { COLOURS } from './colours.js'

/* -------------------------------
   SVG generators
-------------------------------- */

function fillSvg (colour) {
  return `<rect x="1" y="1" width="18" height="18" rx="2" ry="2" fill="${colour}" stroke="${colour}" stroke-width="2" stroke-linejoin="round"></rect>`
}

function lineSvg (colour) {
  return `<rect x="2" y="9" width="18" height="4" fill="${colour}" stroke="${colour}" stroke-linejoin="round"></rect>`
}

function hatchedSvg (colour) {
  return `
    <path d="M19 2.862v14.275c0 1.028-.835 1.862-1.862 1.862H2.863c-1.028 0-1.862-.835-1.862-1.862V2.862C1.001 1.834 1.836 1 2.863 1h14.275C18.166 1 19 1.835 19 2.862z" fill="transparent" stroke="${colour}"/>
    <path d="M19 6.924L6.924 19" stroke="${colour}"/>
    <path d="M.924 6.924L13 19" stroke="${colour}"/>
    <path d="M12.924 1L1 12.924" stroke="${colour}"/>
    <path d="M7,1l11.924,11.924" stroke="${colour}"/>
  `
}

function dottedSvg (colour) {
  return `
    <path d="M19 2.862v14.275c0 1.028-.835 1.862-1.862 1.862H2.863c-1.028 0-1.862-.835-1.862-1.862V2.862C1.001 1.834 1.836 1 2.863 1h14.275C18.166 1 19 1.835 19 2.862z" fill="none" stroke="${colour}"/>
    <ellipse cx="6.5" cy="6.5" rx="1.5" ry="1.5" fill="${colour}"/>
    <ellipse cx="6.5" cy="13.5" rx="1.5" ry="1.5" fill="${colour}"/>
    <ellipse cx="13.5" cy="6.5" rx="1.5" ry="1.5" fill="${colour}"/>
    <ellipse cx="13.5" cy="13.5" rx="1.5" ry="1.5" fill="${colour}"/>
  `
}

function getSvgContent (colourKey, svgType, styleId) {
  const colourSet = COLOURS[colourKey]
  const colour = colourSet[styleId] ?? colourSet['outdoor']
  switch (svgType) {
    case 'line': return lineSvg(colour)
    case 'hatched': return hatchedSvg(colour)
    case 'dotted': return dottedSvg(colour)
    default: return fillSvg(colour)
  }
}

/* -------------------------------
   Key configuration
-------------------------------- */

const keyItems = [{
  id: 'floodZone2',
  label: 'Flood zone 2',
  group: 'model-data',
  requires: ['floodzones'],
  colourKey: 'floodZone2',
  svgType: 'fill',
  symbolDescription: 'Symbol description',
},{
  id: 'floodZone3',
  label: 'Flood zone 3',
  group: 'model-data',
  requires: ['floodzones'],
  colourKey: 'floodZone3',
  svgType: 'fill',
  symbolDescription: 'Symbol description',
},{
  id: 'floodZoneClimateChange',
  label: 'Flood zones 2070 to 2125',
  group: 'model-data',
  requires: ['floodzones', 'climatechange'],
  colourKey: 'floodZoneClimateChange',
  svgType: 'fill',
  symbolDescription: 'Symbol description',
},{
  id: 'floodZoneClimateChangeNoData',
  label: 'Flood zones 2070 to 2125 missing data',
  group: 'model-data',
  requires: ['floodzones', 'climatechange'],
  colourKey: 'floodZoneClimateChangeNoData',
  svgType: 'dotted',
  symbolDescription: 'Symbol description',
},{
  id: 'floodExtent',
  label: 'Flood extent',
  group: 'model-data',
  requires: ['surfacewater'],
  excludes: ['bydepth'],
  colourKey: 'extent',
  svgType: 'fill',
  symbolDescription: 'Symbol description',
},{
  id: 'subheading-bydepth',
  label: 'Surface water flood extent',
  group: 'model-data',
  itemType: 'subheading',
  requires: ['surfacewater', 'bydepth'],
},{
  id: 'depth-gt2300mm',
  label: 'Above 2300mm',
  group: 'model-data',
  requires: ['surfacewater', 'bydepth'],
  colourKey: '>2300mm',
  svgType: 'fill',
  symbolDescription: 'Symbol description',
},{
  id: 'depth-1200-2300mm',
  label: '1200mm to 2300mm',
  group: 'model-data',
  requires: ['surfacewater', 'bydepth'],
  colourKey: '1200-2300mm',
  svgType: 'fill',
  symbolDescription: 'Symbol description',
},{
  id: 'depth-900-1200mm',
  label: '900mm to 1200mm',
  group: 'model-data',
  requires: ['surfacewater', 'bydepth'],
  colourKey: '900-1200mm',
  svgType: 'fill',
  symbolDescription: 'Symbol description',
},{
  id: 'depth-600-900mm',
  label: '600mm to 900mm',
  group: 'model-data',
  requires: ['surfacewater', 'bydepth'],
  colourKey: '600-900mm',
  svgType: 'fill',
  symbolDescription: 'Symbol description',
},{
  id: 'depth-300-600mm',
  label: '300mm to 600mm',
  group: 'model-data',
  requires: ['surfacewater', 'bydepth'],
  colourKey: '300-600mm',
  svgType: 'fill',
  symbolDescription: 'Symbol description',
},{
  id: 'depth-150-300mm',
  label: '150mm to 300mm',
  group: 'model-data',
  requires: ['surfacewater', 'bydepth'],
  colourKey: '150-300mm',
  svgType: 'fill',
  symbolDescription: 'Symbol description',
},{
  id: 'depth-lt150mm',
  label: 'Below 150mm',
  group: 'model-data',
  requires: ['surfacewater', 'bydepth'],
  colourKey: '<150mm',
  svgType: 'fill',
  symbolDescription: 'Symbol description',
},{
  id: 'waterStorage',
  label: 'Water storage',
  group: 'map-features',
  requires: ['waterstorage'],
  colourKey: 'waterStorage',
  svgType: 'hatched',
  symbolDescription: 'Symbol description',
},{
  id: 'floodDefence',
  label: 'Flood defence',
  group: 'map-features',
  requires: ['flooddefence'],
  colourKey: 'floodDefences',
  svgType: 'line',
  symbolDescription: 'Symbol description',
},{
  id: 'mainRivers',
  label: 'Main rivers',
  group: 'map-features',
  requires: ['mainrivers'],
  colourKey: 'mainRivers',
  svgType: 'line',
  symbolDescription: 'Symbol description',
}]

const keyGroups = [
  { id: 'model-data', label: 'Flood model data' },
  { id: 'map-features', label: 'Map features' },
]

/* -------------------------------
   Render helpers
-------------------------------- */

let visibleDatasets = []
let visibleMapFeatures = []
let mapStyleId = 'outdoor'

function toggleKeyItemVisibility (e) {
  if (e.dataset != null) visibleDatasets = e.dataset.split('-').filter(Boolean)
  if (e.mapFeatures != null) visibleMapFeatures = e.mapFeatures.split(',').filter(Boolean)
  const visibleItems = visibleDatasets.concat(visibleMapFeatures)

  document.querySelectorAll('.fmp-key__item').forEach(keyItem => {
    const requires = keyItem.dataset.requires.split(',')
    const excludes = keyItem.dataset.excludes ? keyItem.dataset.excludes.split(',').filter(Boolean) : []
    const allRequiresMet = requires.every(part => visibleItems.includes(part))
    const noExcludesPresent = excludes.every(part => !visibleItems.includes(part))
    keyItem.style.display = (allRequiresMet && noExcludesPresent) ? 'flex' : 'none'
  })

  let anyVisible = false
  document.querySelectorAll('.fmp-key__heading').forEach(heading => {
    const groupItems = document.querySelectorAll(`.fmp-key__item[data-group="${heading.dataset.group}"]`)
    const hasVisible = Array.from(groupItems).some(el => el.style.display !== 'none')
    heading.style.display = hasVisible ? '' : 'none'
    if (hasVisible) anyVisible = true
  })

  const emptyEl = document.querySelector('.fmp-key__empty')
  if (emptyEl) emptyEl.style.display = anyVisible ? 'none' : ''
}

function updateKeyColours (newMapStyleId) {
  mapStyleId = newMapStyleId
  keyItems.forEach(item => {
    const el = document.querySelector(`.fmp-key__item[data-id="${item.id}"]`)
    if (!el) {
      return
    }
    const svg = el.querySelector('svg')
    if (svg) {
      svg.innerHTML = getSvgContent(item.colourKey, item.svgType, mapStyleId)
    }
  })
}

function renderKeyHTML () {
  return `
    <p class="fmp-key__empty" style="display: none">No key items to display</p>
    ${keyGroups.map(group => `
      <h3 class="fmp-key__heading" data-group="${group.id}" style="display: none">${group.label}</h3>
      <ul class="fmp-key">
        ${keyItems.filter(item => item.group === group.id).map(item => item.itemType === 'subheading' ? `
          <li class="fmp-key__item fmp-key__subheading" data-id="${item.id}" data-group="${item.group}" data-requires="${item.requires.join(',')}" data-excludes="" style="display: none">
            <p>${item.label}</p>
          </li>
        ` : `
          <li class="fmp-key__item" data-id="${item.id}" data-group="${item.group}" data-requires="${item.requires.join(',')}" data-excludes="${(item.excludes || []).join(',')}" style="display: none">
            <svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' aria-hidden='true' focusable='false'>
              ${getSvgContent(item.colourKey, item.svgType, mapStyleId)}
            </svg>
            <span class="fmp-key__item-label">${item.label}</span>
            <span class="govuk-visually-hidden">
              ${item.symbolDescription}
            </span>
          </li>
        `).join('')}
      </ul>
    `).join('')}
  `
}

export {
  renderKeyHTML,
  toggleKeyItemVisibility,
  updateKeyColours
}
