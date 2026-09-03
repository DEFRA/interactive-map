import createDrawPlugin from '/plugins/beta/draw-es/src/index.js';
import createFramePlugin from '/plugins/beta/frame/src/index.js'
import { SiteBoundary, siteBoundary } from './siteBoundary.js'
import { terms } from './terms.js'

export const drawPlugin = createDrawPlugin()

export const framePlugin = createFramePlugin()

const PRIMARY_DROP_DOWN_ID = 'geometryActions'
const SECONDARY_DROP_DOWN_ID = 'geometryActionsSecondary'
const SUMMARY_BUTTON_ID = 'get-summary'

let updateDrawState = () => {}

const attachUpdateDrawStateMethod = (interactiveMap, onEditPolygon) => () => {
  const { isEditing, isComplete, isSquare } = siteBoundary
  // Hide the draw menu when editing
  interactiveMap.toggleButtonState(PRIMARY_DROP_DOWN_ID, 'hidden', isEditing || isComplete)
  interactiveMap.toggleButtonState(SECONDARY_DROP_DOWN_ID, 'hidden', !isComplete)
  // Hide the 'get-summary' button when the polygon is not complete
  interactiveMap.toggleButtonState(SUMMARY_BUTTON_ID, 'hidden', !isComplete)
  // Only enable the upload button when there is no polygon and we are not editing
  interactiveMap.toggleButtonState('uploadShape', 'disabled', !siteBoundary.isEmpty)

  if (onEditPolygon) {
    // Handles showing and hiding other interactiveMap panels and layers when the user is editing a polygon
    onEditPolygon(isEditing)
  }

  if (!isEditing) {
    // Disable the edit and delete buttons when there is no polygon
    interactiveMap.toggleButtonState('editShape', 'disabled', !isComplete)
    interactiveMap.toggleButtonState('deleteShape', 'disabled', !isComplete)
    // Disable the add buttons when there is a polygon
    interactiveMap.toggleButtonState('addPolygon', 'disabled', isComplete)
    interactiveMap.toggleButtonState('addSquare', 'disabled', isComplete)
  }
}

const drawMenuItems = {
  addPolygon: {
    iconSvgContent: '<path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/><path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/>',
    onClick: () => {
      drawPlugin.newPolygon(siteBoundary.id)
      siteBoundary.state = SiteBoundary.EDITING
      siteBoundary.type = SiteBoundary.POLYGON
      updateDrawState()
    }
  },
  addSquare: {
    iconSvgContent: '<rect width="18" height="18" x="3" y="3" rx="2"/>',
    onClick: () => {
      framePlugin.addFrame(siteBoundary.id, { aspectRatio: 1 })
      siteBoundary.state = SiteBoundary.EDITING
      siteBoundary.type = SiteBoundary.SQUARE
      updateDrawState()
    }
  },
  uploadShape: {
    iconSvgContent: '<line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="7,8 12,3 17,8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="5,17 5,19 19,19 19,17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    onClick: () => (globalThis.location.href = '/upload')
  },
  editShape: {
    iconSvgContent: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    isDisabled: true,
    onClick: () => {
      if (siteBoundary.isSquare) {
        drawPlugin.deleteFeature(siteBoundary.id)
        framePlugin.editFeature(siteBoundary.feature)
      } else {
        drawPlugin.editFeature(siteBoundary.id)
      }
      siteBoundary.state = SiteBoundary.EDITING
      updateDrawState()
    }
  },
  deleteShape: {
    iconSvgContent: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    isDisabled: true,
    onClick: () => {
      drawPlugin.deleteFeature(siteBoundary.id)
      siteBoundary.feature = null
      updateDrawState()
    }
  }
}

export const attachDrawPlugin = (interactiveMap, onEditPolygon) => {
  updateDrawState = attachUpdateDrawStateMethod(interactiveMap, onEditPolygon)
  const onCancelEditing = () => {
    siteBoundary.state = siteBoundary.feature ? SiteBoundary.COMPLETE : SiteBoundary.EMPTY
    updateDrawState()
  }

  interactiveMap.on('map:ready', ({ view }) => {
    siteBoundary.mapView = view
    const dropDownButtonOptions = {
      label: terms.labels.drawMenuTitle,
      variant: 'primary',
      mobile: { slot: 'bottom-right', order: 1 },
      tablet: { slot: 'top-middle', order: 1 },
      desktop: { slot: 'top-middle', order: 1 },
      menuItems: Object.entries(drawMenuItems).map(([id, item]) => ({ ...item, id, label: terms.labels[id] }))
    }

    // Add the draw plugin menu
    // Add the primary dropdown button
    interactiveMap.addButton(PRIMARY_DROP_DOWN_ID, dropDownButtonOptions)
    // Add a 2nd button with the same menu, but styled as a secondary button,
    // to be shown in place of the primary one when the 'get-summary' button is active
    interactiveMap.addButton(SECONDARY_DROP_DOWN_ID, { ...dropDownButtonOptions, variant: 'secondary' })

    // Add the get summary button (AKA goto results page)
    interactiveMap.addButton(SUMMARY_BUTTON_ID, {
      label: 'Get summary report',
      variant: 'primary',
      onClick: () => {
        window.location = `/results?encodedPolygon=${siteBoundary.encodedPolygon}`
      },
      mobile: { slot: 'actions', showLabel: true },
      tablet: { slot: 'actions', showLabel: true },
      desktop: { slot: 'actions', showLabel: true },
    })
  })

  interactiveMap.on('draw:ready', () => {
    updateDrawState()
    if (siteBoundary.feature) {
      drawPlugin.addFeature(siteBoundary.feature)
    }
  })

  interactiveMap.on('draw:done', ({ newFeature: feature }) => {
    siteBoundary.feature = feature
    siteBoundary.type = SiteBoundary.POLYGON
    updateDrawState()
  })

  interactiveMap.on('draw:updated', (feature) => {
    console.log('draw:updated', feature)
    // check the size here and warn the user if it is too big
  })
  interactiveMap.on('frame:updated', (feature) => {
    console.log('frame:updated', feature?.geometry?.coordinates?.[0])
    // check the size here and warn the user if it is too big
  })

  interactiveMap.on('draw:cancelled', onCancelEditing)
  interactiveMap.on('frame:cancel', () => {
    if (siteBoundary.feature) {
      drawPlugin.addFeature(siteBoundary.feature) // Add back the existing feature
    }
    onCancelEditing()
  })

  interactiveMap.on('draw:deleted', () => {
    siteBoundary.feature = null
    updateDrawState()
  })

  interactiveMap.on('draw:add', (feature) => {
    console.log('draw:add', feature)
  })

  interactiveMap.on('frame:done', (feature) => {
    drawPlugin.addFeature(feature)
    siteBoundary.feature = feature
    siteBoundary.type = SiteBoundary.SQUARE
    updateDrawState()
  })
}
