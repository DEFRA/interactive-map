/* -------------------------------
   Key configuration
-------------------------------- */

const keyItems = [{
  id: 'floodzone2',
  label: 'Flood zone 2',
  datasetGroup: 'floodzones',
  symbolDescription: 'Symbol description',
  svgContent: `
    <rect x="1" y="1" width="18" height="18" rx="2" ry="2" fill="#2b8cbe" stroke="#2b8cbe" stroke-width="2" stroke-linejoin="round"></rect>
  `
},{
  id: 'floodzone3',
  label: 'Flood zone 3',
  datasetGroup: 'floodzones',
  symbolDescription: 'Symbol description',
  svgContent: `
    <rect x="1" y="1" width="18" height="18" rx="2" ry="2" fill="#003078" stroke="#003078" stroke-width="2" stroke-linejoin="round"></rect>
  `
},{
  id: 'floodextent',
  label: 'Flood extent',
  datasetGroup: 'surfacewater',
  symbolDescription: 'Symbol description',
  svgContent: `
    <rect x="1" y="1" width="18" height="18" rx="2" ry="2" fill="#2b8cbe" stroke="#2b8cbe" stroke-width="2" stroke-linejoin="round"></rect>
  `
},{
  id: 'waterstorage',
  label: 'Water storage',
  datasetGroup: 'waterstorage',
  symbolDescription: 'Symbol description',
  svgContent: `
    <path d="M19 2.862v14.275c0 1.028-.835 1.862-1.862 1.862H2.863c-1.028 0-1.862-.835-1.862-1.862V2.862C1.001 1.834 1.836 1 2.863 1h14.275C18.166 1 19 1.835 19 2.862z" fill="transparent" stroke="#12393d"/>
    <path d="M19 6.924L6.924 19" stroke="#12393d"/>
    <path d="M.924 6.924L13 19" stroke="#12393d"/>
    <path d="M12.924 1L1 12.924" stroke="#12393d"/>
    <path d="M7,1l11.924,11.924" stroke="#12393d"/>
  `
},{
  id: 'flooddefence',
  label: 'Flood defence',
  datasetGroup: 'flooddefence',
  symbolDescription: 'Symbol description',
  svgContent: `
    <rect x="2" y="9" width="18" height="4" fill="#f47738" stroke="#f47738" stroke-linejoin="round"></rect>
  `
},{
  id: 'mainrivers',
  label: 'Main rivers',
  datasetGroup: 'mainrivers',
  symbolDescription: 'Symbol description',
  svgContent: `
    <rect x="2" y="9" width="18" height="4" fill="#12393d" stroke="#12393d" stroke-linejoin="round"></rect>
  `
}]

/* -------------------------------
   Render helpers
-------------------------------- */

let visibleDatasets = []
let visibleMapFeatures = []

function toggleKeyItemVisibility (e) {
  visibleDatasets = e.dataset ? [e.dataset?.split('-')[0]] : visibleDatasets
  visibleMapFeatures = e.mapFeatures ? e.mapFeatures.split(',') : visibleMapFeatures
  const visibleItems = visibleDatasets.concat(visibleMapFeatures)
  
  document.querySelectorAll('.fmp-key__item').forEach(keyItem => {
    keyItem.style.display = visibleItems.includes(keyItem.dataset.datasetgroup) ? 'flex' : 'none'
  })
}

function renderKeyHTML() {
  return `
    <ul class="fmp-key">
      ${keyItems.map(item => `
        <li class="fmp-key__item" data-datasetgroup="${item.datasetGroup}" style="display: none">
          <svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' aria-hidden='true' focusable='false'>
            ${item.svgContent}
          </svg>
          <span class="fmp-key__item-label">${item.label}</span>
          <span class="govuk-visually-hidden">
            ${item.symbolDescription}
          </span>
        </li>
      `).join('')}
    </ul>
  `
}

export {
  renderKeyHTML,
  toggleKeyItemVisibility
}