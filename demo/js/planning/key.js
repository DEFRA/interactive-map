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
  label: 'Flood zones with climate change (2070 to 2125)',
  group: 'model-data',
  requires: ['floodzones', 'climatechange'],
  colourKey: 'floodZoneClimateChange',
  svgType: 'fill',
  symbolDescription: 'Symbol description',
},{
  id: 'floodZoneClimateChangeNoData',
  label: 'Climate change data unavailable',
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
  label: 'Flood extent by depth',
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
  {
    id: 'model-data',
    label: 'Flood model data',
    conditionalLabels: [
      { requires: ['floodzones'], label: 'Flood zones', visuallyHidden: true },
      { requires: ['surfacewater'], label: 'Surface water' },
    ]
  },
  { id: 'map-features', label: 'Map features' },
]

/* -------------------------------
   Render helpers
-------------------------------- */

let visibleDatasets = []
let visibleMapFeatures = []
let mapStyleId = 'outdoor'

function toggleKeyItemVisibility (e) {
  if (e.dataset != null) {
    visibleDatasets = e.dataset.split('-').filter(Boolean)
  }
  if (e.mapFeatures != null) {
    visibleMapFeatures = e.mapFeatures.split(',').filter(Boolean)
  }
  const visibleItems = visibleDatasets.concat(visibleMapFeatures)

  document.querySelectorAll('.fmp-key__item').forEach(keyItem => {
    const requires = keyItem.dataset.requires.split(',')
    const excludes = keyItem.dataset.excludes ? keyItem.dataset.excludes.split(',').filter(Boolean) : []
    const allRequiresMet = requires.every(part => visibleItems.includes(part))
    const noExcludesPresent = excludes.every(part => !visibleItems.includes(part))
    keyItem.classList.toggle('fmp-key--hidden', !(allRequiresMet && noExcludesPresent))
  })

  document.querySelectorAll('.fmp-key__subheading').forEach(subheading => {
    const requires = subheading.dataset.requires.split(',')
    const allRequiresMet = requires.every(part => visibleItems.includes(part))
    subheading.classList.toggle('fmp-key--hidden', !allRequiresMet)
  })

  let anyVisible = false
  document.querySelectorAll('.fmp-key__group').forEach(section => {
    const groupItems = document.querySelectorAll(`.fmp-key__item[data-group="${section.dataset.group}"]`)
    const hasVisible = Array.from(groupItems).some(el => !el.classList.contains('fmp-key--hidden'))
    section.classList.toggle('fmp-key--hidden', !hasVisible)
    if (hasVisible) {
      anyVisible = true
    }
  })

  const emptyEl = document.querySelector('.fmp-key__empty')
  if (emptyEl) {
    emptyEl.classList.toggle('fmp-key--hidden', anyVisible)
  }

  keyGroups.forEach(group => {
    if (!group.conditionalLabels) {
      return
    }
    const headingEl = document.getElementById(`fmp-key-heading-${group.id}`)
    if (!headingEl) {
      return
    }
    const match = group.conditionalLabels.find(cond => cond.requires.every(part => visibleItems.includes(part)))
    const noHeading = !!match?.visuallyHidden
    headingEl.textContent = match ? match.label : group.label
    headingEl.classList.toggle('govuk-visually-hidden', noHeading)

    const groupEl = headingEl.closest('.fmp-key__group')
    if (groupEl) {
      groupEl.querySelectorAll('.fmp-key__item').forEach(item => {
        item.classList.remove('fmp-key__item--first')
        item.classList.remove('fmp-key__item--last')
      })
      if (noHeading) {
        const visibleItems = [...groupEl.querySelectorAll('.fmp-key__item:not(.fmp-key--hidden)')]
        if (visibleItems[0]) visibleItems[0].classList.add('fmp-key__item--first')
        if (visibleItems.at(-1)) visibleItems.at(-1).classList.add('fmp-key__item--last')
      }
    }
  })
}

function updateKeyColours (newMapStyleId = mapStyleId) {
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
    <p class="fmp-key__empty fmp-key--hidden">No key items to display</p>
    ${keyGroups.map(group => {
      const subheading = keyItems.find(item => item.group === group.id && item.itemType === 'subheading')
      const items = keyItems.filter(item => item.group === group.id && !item.itemType)
      return `
        <section class="fmp-key__group fmp-key--hidden" aria-labelledby="fmp-key-heading-${group.id}" data-group="${group.id}">
          <h3 class="govuk-heading-s fmp-key__heading" id="fmp-key-heading-${group.id}">${group.label}</h3>
          ${subheading ? `<p class="govuk-body-s fmp-key__subheading fmp-key--hidden" data-requires="${subheading.requires.join(',')}">${subheading.label}</p>` : ''}
          <dl class="fmp-key">
            ${items.map(item => `
              <div class="fmp-key__item fmp-key--hidden" data-id="${item.id}" data-group="${item.group}" data-requires="${item.requires.join(',')}" data-excludes="${(item.excludes || []).join(',')}">
                <dt>
                  <svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' aria-hidden='true' focusable='false'>
                    ${getSvgContent(item.colourKey, item.svgType, mapStyleId)}
                  </svg>
                  <span class="govuk-visually-hidden">${item.symbolDescription}</span>
                </dt>
                <dd>${item.label}</dd>
              </div>
            `).join('')}
          </dl>
        </section>
      `
    }).join('')}
  `
}

export {
  renderKeyHTML,
  toggleKeyItemVisibility,
  updateKeyColours
}
