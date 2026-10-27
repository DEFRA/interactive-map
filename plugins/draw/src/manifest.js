import { initialState, actions } from './reducer.js'
import { DrawInit } from './DrawInit.jsx'
import { newPolygon } from './api/newPolygon.js'
import { newLine } from './api/newLine.js'
import { newPoint } from './api/newPoint.js'
import { editFeature } from './api/editFeature.js'
import { addFeature } from './api/addFeature.js'
import { setStyle } from './api/setStyle.js'
import { deleteFeature } from './api/deleteFeature.js'
import { split } from './api/split.js'
import { merge } from './api/merge.js'
import { setGeometry } from './api/setGeometry.js'
import { recheckGeometry } from './api/recheckGeometry.js'
import { isMac } from '../../../src/utils/isMac.js'
import { APPLICATION_MODE_ID } from './defaults.js'
import { needsDrawTarget } from './utils/needsDrawTarget.js'
import { isShapeDrawMode, isCheckedMode } from './utils/drawModes.js'

// edit_point behaves like edit_vertex for Done/Undo, but stays out of drawDeletePoint and mergeShapes (neither applies to a single coordinate).

// Show the platform-appropriate undo modifier (⌘ on macOS, Ctrl elsewhere).
const undoCommand = isMac() ? '<kbd>Command</kbd> + <kbd>Z</kbd>' : '<kbd>Ctrl</kbd> + <kbd>Z</kbd>'
// Show the platform-appropriate label for the Alt modifier — macOS keyboards and
// menus call it Option, not Alt.
const altKeyHtml = isMac() ? '<kbd>Option</kbd>' : '<kbd>Alt</kbd>'

// Undo, Snap and Delete point sit together in the middle of the top row
const TOOLBAR_SLOT = 'top-middle'

// Done waits on a slow check (SLOW_CHECK_MS) while editing, or once a drawn shape is held.
// A check on a shape still being drawn doesn't hold up Done, so it reads "Done".
const isWaitingOnCheck = ({ mode, checkSlow, holding }) => checkSlow && (holding || !isShapeDrawMode(mode))

const createButtonSlots = (showLabel, slot = 'actions') => ({
  mobile: { slot, showLabel },
  tablet: { slot, showLabel },
  desktop: { slot, showLabel }
})

export const manifest = {
  reducer: {
    initialState,
    actions
  },

  InitComponent: DrawInit,

  // While drawing or editing, hide everything except draw's own items (kept automatically) and these
  applicationModes: {
    [APPLICATION_MODE_ID]: { include: ['mapStyles', 'mapControls', 'scaleBar'] }
  },

  buttons: [
    {
      id: 'drawCancel',
      label: 'Cancel',
      variant: 'tertiary',
      exclusiveSlot: true,
      hiddenWhen: ({ pluginState }) => !pluginState.mode,
      ...createButtonSlots(true)
    },
    {
      id: 'drawAddPoint',
      label: 'Add point',
      variant: 'primary',
      exclusiveSlot: true,
      // Shown with the crosshair, using the same needsDrawTarget rule. Not shown for keyboard (Enter places).
      hiddenWhen: ({ appState, pluginState }) => !needsDrawTarget({ appState, pluginState }),
      // Disabled while placing at the crosshair would be vetoed (validatePlacement) —
      // driven live so the button never looks active when a tap would do nothing.
      enableWhen: ({ pluginState }) => pluginState.canAddPoint,
      ...createButtonSlots(true)
    },
    {
      id: 'drawDone',
      label: ({ pluginState }) => (isWaitingOnCheck(pluginState) ? 'Checking…' : 'Done'),
      busyWhen: ({ pluginState }) => isWaitingOnCheck(pluginState),
      variant: 'primary',
      exclusiveSlot: true,
      // Also shown while a new point waits on its check, to read "Checking…"
      hiddenWhen: ({ pluginState }) => !isCheckedMode(pluginState.mode) && !pluginState.holding,
      enableWhen: ({ pluginState }) => {
        const { mode, validationStatus, previewValid, holding } = pluginState
        // validationStatus is the latest commit-level check (built-in rules + onGeometryChange);
        // previewValid is the live check of a shape being edited. A shape being drawn can be
        // finished while its check is pending: it's held until the check settles.
        const canFinish = validationStatus === 'valid' || (validationStatus === 'pending' && isShapeDrawMode(mode))
        return isCheckedMode(mode) && canFinish && previewValid && !holding
      },
      ...createButtonSlots(true)
    },
    {
      // Undo, Snap and Delete point render in this order in TOOLBAR_SLOT. While draw has exclusive
      // control, core hides everything around them that isn't on the keep list.
      id: 'drawUndo',
      label: 'Undo',
      iconId: 'undo',
      // Hidden for draw_point — nothing to undo before a single-click commit.
      hiddenWhen: ({ pluginState }) => !isCheckedMode(pluginState.mode),
      enableWhen: ({ pluginState }) => {
        if (pluginState.holding) {
          return false
        }
        if (isShapeDrawMode(pluginState.mode)) {
          return pluginState.numVertices > 0
        }
        return pluginState.undoStackLength > 0
      },
      ...createButtonSlots(false, TOOLBAR_SLOT)
    },
    {
      id: 'drawSnap',
      label: 'Snap',
      iconId: 'magnet',
      hiddenWhen: ({ pluginState }) => !pluginState.mode || !pluginState.hasSnapLayers || !!pluginState.holding,
      pressedWhen: ({ pluginState }) => !!pluginState.snap,
      ...createButtonSlots(true, TOOLBAR_SLOT)
    },
    {
      id: 'drawDeletePoint',
      label: 'Delete point',
      iconId: 'trash',
      enableWhen: ({ pluginState }) => {
        if (pluginState.selectedVertexIndex < 0) { return false }
        const isPolygon = pluginState.feature?.geometry?.type === 'Polygon'
        return isPolygon ? pluginState.numVertices > 3 : pluginState.numVertices > 2 // NOSONAR
      },
      // Deliberately excluded from edit_point — deleting a point's one coordinate is deleting
      // the whole feature (deleteFeature's job), not a per-vertex action.
      hiddenWhen: ({ pluginState }) => pluginState.mode !== 'edit_vertex',
      ...createButtonSlots(false, TOOLBAR_SLOT)
    }
  ],

  keyboardShortcuts: [{
    id: 'drawAddPoint',
    group: 'Drawing',
    title: 'Add point (draw)',
    command: '<kbd>Enter</kbd>'
  }, {
    id: 'drawSelectPoint',
    group: 'Drawing',
    title: 'Select nearest point (edit)',
    command: '<kbd>Spacebar</kbd>'
  }, {
    id: 'drawSelectAdjacentPoint',
    group: 'Drawing',
    title: 'Select adjacent point (edit)',
    command: `${altKeyHtml} + <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> or <kbd>→</kbd>`
  }, {
    id: 'drawMovePoint',
    group: 'Drawing',
    title: 'Move point (edit)',
    command: '<kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> or <kbd>→</kbd>'
  }, {
    id: 'drawNudgePoint',
    group: 'Drawing',
    title: 'Nudge point (edit)',
    command: '<kbd>Shift</kbd> + <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> or <kbd>→</kbd>'
  }, {
    id: 'drawDeletePoint',
    group: 'Drawing',
    title: 'Delete point (edit)',
    command: '<kbd>Delete</kbd>'
  }, {
    id: 'drawUndo',
    group: 'Drawing',
    title: 'Undo',
    command: undoCommand
  }],

  icons: [{
    id: 'undo',
    svgContent: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>'
  }, {
    id: 'magnet',
    svgContent: '<path d="m12 15 4 4"/><path d="M2.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.029-6.029a1 1 0 1 1 3 3l-6.029 6.029a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.365-6.367A1 1 0 0 0 8.716 4.282z"/><path d="m5 8 4 4"/>'
  }, {
    id: 'trash',
    svgContent: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'
  }],

  api: {
    newPolygon,
    newLine,
    newPoint,
    editFeature,
    addFeature,
    setStyle,
    deleteFeature,
    split,
    merge,
    setGeometry,
    recheckGeometry
  }
}
