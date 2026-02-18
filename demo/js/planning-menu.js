import { getQueryParam, setQueryParam } from './planning-utils.js'

/* ==========================================================================
   Menu utilities
   ========================================================================== */

/* -------------------------------
   Menu button configuration
-------------------------------- */

var menuItems = [{
  id: 'shape-btn',
  label: 'Draw shape',
  disabled: feature => !!feature,
  svg: `
    <path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/>
    <path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/>
  `
},{
  id: 'square-btn',
  label: 'Draw square',
  disabled: feature => !!feature,
  svg: `<rect width="18" height="18" x="3" y="3" rx="2"/>`
},{
  id: 'edit-btn',
  label: 'Edit area',
  disabled: feature => !feature,
  svg: `
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
    <path d="m15 5 4 4"/>
  `
},{
  id: 'delete-btn',
  label: 'Delete area',
  disabled: feature => !feature,
  svg: `
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M3 6h18"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  `
}]

/* -------------------------------
   Dataset configuration
-------------------------------- */

var datasetsConfig = [{
  type: 'radios',
  legend: 'Datasets',
  name: 'datasets',
  items: [
    { id: 'floodzones', value: 'floodzones', label: 'Flood zones 2 and 3', fieldsets: ['datasets', 'scenario'] },
    { id: 'surfacewater', value: 'surfacewater', label: 'Surface water', fieldsets: ['datasets', 'likelihood'] },
    { id: 'none', value: 'none', label: 'None', fieldsets: ['datasets'] }
  ]
},{
  type: 'radios',
  legend: 'Climate change',
  name: 'scenario',
  items: [
    { id: 'presentday', value: 'presentday', label: 'Present day' },
    { id: 'climatechange', value: 'climatechange', label: '2070 to 2125' }
  ]
},{
  type: 'radios',
  legend: 'Annual likelihood of flooding',
  name: 'likelihood',
  items: [
    { id: 'high', value: 'high', label: '1 in 30' },
    { id: 'medium', value: 'medium', label: '1 in 100' },
    { id: 'low', value: 'low', label: '1 in 1000' }
  ]
},{
  type: 'checkboxes',
  legend: 'Map features',
  name: 'mapFeatures',
  items: [
    { id: 'waterstorage', value: 'waterstorage', label: 'Water storage' },
    { id: 'flooddefence', value: 'flooddefence', label: 'Flood defence' },
    { id: 'mainrivers', value: 'mainrivers', label: 'Main rivers' }
  ]
}]

/* -------------------------------
   Menu button handlers
-------------------------------- */

function isEnabled(button) {
  return button.getAttribute('aria-disabled') !== 'true'
}

function toggleButtonState(enabledButtons) {
  var buttons = document.querySelectorAll('.fmp-menu-button')
  buttons.forEach(button => {
    var key = button.id.slice(0, -4)
    button.setAttribute('aria-disabled', !enabledButtons.includes(key))
  })
}

function addMenuClickHandlers({ onDrawShape, onDrawFrame, onEdit, onDelete }) {
  document.addEventListener('click', e => {
    var shapeBtn = e.target.closest('#shape-btn')
    var squareBtn = e.target.closest('#square-btn')
    var editBtn = e.target.closest('#edit-btn')
    var deleteBtn = e.target.closest('#delete-btn')

    if (shapeBtn && isEnabled(shapeBtn)) { toggleButtonState([]); onDrawShape?.(); return }
    if (squareBtn && isEnabled(squareBtn)) { toggleButtonState([]); onDrawFrame?.(); return }
    if (editBtn && isEnabled(editBtn)) { toggleButtonState([]); onEdit?.(); return }
    if (deleteBtn && isEnabled(deleteBtn)) { onDelete?.(); toggleButtonState(['shape','square']); return }
  })
}

/* -------------------------------
   Dataset change handler
-------------------------------- */

function addDatasetChangeHandler() {
  function toggleFieldsetsVisibility(activeFieldsets) {
    if (!activeFieldsets) {
      return
    }

    var allFieldsets = Array.from(document.querySelectorAll('.fmp-datasets fieldset[data-name]'))

    allFieldsets.forEach(function(fs) {
      var isFieldsetVisible = fs.style.display !== 'none'

      // Show fieldset and check first radio
      if (activeFieldsets.includes(fs.dataset.name) && !isFieldsetVisible) {
        fs.style.display = 'block'
        var firstRadio = fs.querySelector('input[type="radio"]')
        if (firstRadio) {
          firstRadio.checked = true
        }
      }

      // Hide fieldset and uncheck all radios
      if (!activeFieldsets.includes(fs.dataset.name) && isFieldsetVisible) {
        fs.style.display = 'none'
        var radios = fs.querySelectorAll('input[type="radio"]')
        radios.forEach(r => r.checked = false)
      }
    })
  }

  function update(e) {
    if (!e.target.classList.contains('govuk-radios__input') && !e.target.closest('.fmp-datasets')) {
      return
    }

    var radio = e.target
    var datasetName = radio.closest('fieldset').dataset.name
    var dataSet = datasetsConfig.find(ds => ds.name === datasetName)
    var activeFieldsets = dataSet.items.find(item => item.id === radio.id).fieldsets
    
    toggleFieldsetsVisibility(activeFieldsets)

    var checkedIds = Array.from(document.querySelectorAll('.fmp-datasets input[type="radio"]'))
      .filter(radio => radio.checked)
      .map(radio => radio.id)

    setQueryParam('dataset', checkedIds.join('-'))
  }

  document.addEventListener('change', update)
}

/* -------------------------------
   Query parsing
-------------------------------- */

function parseDatasetQuery(value) {
  return value.split('-').filter(Boolean)
}

var datasetQuery = getQueryParam('dataset', 'floodzones-presentday')
var datasetState = parseDatasetQuery(datasetQuery)

var featuresQuery = getQueryParam('features', '')
var featureState = featuresQuery ? featuresQuery.split(',').filter(Boolean) : []

/* -------------------------------
   Render helpers
-------------------------------- */

function hideMenu(interactiveMap) {
  var menu = document.querySelector('#map-panel-menu')
  if (menu?.getAttribute('aria-modal') === 'true') {
    interactiveMap.hidePanel('menu')
  }
}

function renderMenu(feature) {
  return `
    <div class="fmp-menu">
      <h3 class="govuk-heading-s" id="boundary-heading">
        Get a boundary report
      </h3>
      <ul class="fmp-menu-list" aria-labelledby="boundary-heading" role="menu">
        ${menuItems.map(item => `
          <li class="fmp-menu-item" role="presentation">
            <button
              id="${item.id}"
              class="govuk-body-s fmp-menu-button"
              aria-disabled="${item.disabled(feature)}"
            >
              <svg xmlns="http://www.w3.org/2000/svg"
                   width="24" height="24"
                   viewBox="0 0 24 24"
                   fill="none"
                   stroke="currentColor"
                   stroke-width="2"
                   stroke-linecap="round"
                   stroke-linejoin="round"
                   aria-hidden="true"
                   focusable="false">
                ${item.svg}
              </svg>
              <span class="fmp-menu-button__label">${item.label}</span>
            </button>
          </li>
        `).join('')}
      </ul>
    </div>
  `
}

function renderRadios({ legend, name, items, visible, checkedValue }) {
  return `
    <fieldset class="govuk-fieldset" ${visible ? '' : 'style="display:none"'} ${name ? `data-name="${name}"` : ''}>
      <legend class="govuk-fieldset__legend"><h3 class="govuk-heading-s">${legend}</h3></legend>
      <div class="govuk-radios govuk-radios--small" data-module="govuk-radios">
        ${items.map(i => `
          <div class="govuk-radios__item">
            <input class="govuk-radios__input" id="${i.id}" name="${name}" type="radio" value="${i.value}" ${i.value === checkedValue ? 'checked' : ''}>
            <label class="govuk-label govuk-radios__label" for="${i.id}">${i.label}</label>
          </div>
        `).join('')}
      </div>
    </fieldset>
  `
}

function renderCheckboxes({ legend, name, items }) {
  return `
    <fieldset class="govuk-fieldset">
      <legend class="govuk-fieldset__legend"><h3 class="govuk-heading-s">${legend}</h3></legend>
      <div class="govuk-checkboxes govuk-checkboxes--small" data-module="govuk-checkboxes">
        ${items.map(i => `
          <div class="govuk-checkboxes__item">
            <input class="govuk-checkboxes__input" id="${i.id}" name="${name}" type="checkbox" value="${i.value}" ${featureState.includes(i.id) ? 'checked' : ''}>
            <label class="govuk-label govuk-checkboxes__label" for="${i.id}">${i.label}</label>
          </div>
        `).join('')}
      </div>
    </fieldset>
  `
}

function renderDatasets() {
  return `
    <div class="fmp-datasets">
      ${datasetsConfig.map(section => {
        if (section.type === 'radios') {
          var checked = datasetState.find(id => section.items.some(i => i.value === id))
          return renderRadios({ ...section, visible: !!checked, checkedValue: checked })
        }
        return renderCheckboxes(section)
      }).join('')}
    </div>
  `
}

function renderMenuHTML(feature) {
  var html = `
    ${renderMenu(feature)}
    ${renderDatasets()}
  `
  addDatasetChangeHandler()
  return html
}

/* -------------------------------
   Public API
-------------------------------- */

export {
  addMenuClickHandlers,
  toggleButtonState,
  renderMenuHTML,
  hideMenu
}