import { initialState, actions } from './reducer.js'
import { DrawInit } from './DrawInit.jsx'
import { newPolygon } from './api/newPolygon.js'
import { newLine } from './api/newLine.js'
import { newPoint } from './api/newPoint.js'
import { editFeature } from './api/editFeature.js'
import { addFeature } from './api/addFeature.js'
import { setStyle } from './api/setStyle.js'
import { reorderFeature } from './api/reorderFeature.js'
import { deleteFeature } from './api/deleteFeature.js'
import { split } from './api/split.js'
import { merge } from './api/merge.js'
import { isMac } from '../../../src/utils/isMac.js'

const DRAW_ACTIONS_SLOT = 'top-middle'

// edit_point behaves like edit_vertex for Done/Menu/Undo, but stays out of drawDeletePoint and mergeShapes (neither applies to a single coordinate).
const EDIT_MODES = new Set(['edit_vertex', 'edit_point'])
// .has(), not spread — [...aSet] can silently misbehave under a loose-mode Babel build (see OLDrawManager.js's emit()).
const isEditMode = (mode) => EDIT_MODES.has(mode)

// Show the platform-appropriate undo modifier (⌘ on macOS, Ctrl elsewhere).
const undoCommand = isMac() ? '<kbd>Command</kbd> + <kbd>Z</kbd>' : '<kbd>Ctrl</kbd> + <kbd>Z</kbd>'

const createButtonSlots = (showLabel) => ({
  mobile: { slot: 'actions', showLabel },
  tablet: { slot: 'actions', showLabel },
  desktop: { slot: 'actions', showLabel }
})

export const manifest = {
  reducer: {
    initialState,
    actions
  },

  InitComponent: DrawInit,

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
      hiddenWhen: ({ appState, pluginState }) =>
        !['draw_polygon', 'draw_line', 'draw_point'].includes(pluginState.mode) || appState.interfaceType !== 'touch',
      // Disabled while placing at the crosshair would be vetoed (validatePlacement) —
      // driven live so the button never looks active when a tap would do nothing.
      enableWhen: ({ pluginState }) => pluginState.canAddPoint,
      ...createButtonSlots(true)
    },
    {
      id: 'drawDone',
      label: 'Done',
      variant: 'primary',
      exclusiveSlot: true,
      hiddenWhen: ({ pluginState }) => !(['draw_polygon', 'draw_line'].includes(pluginState.mode) || isEditMode(pluginState.mode)),
      enableWhen: ({ pluginState }) => {
        const { mode, geometryValid } = pluginState
        // Min-vertices, area and self-intersection are all enforced by the validation
        // rules via geometryValid, so the gate is simply "is the geometry valid now".
        return (['draw_polygon', 'draw_line'].includes(mode) || isEditMode(mode)) && geometryValid
      },
      ...createButtonSlots(true)
    },
    {
      id: 'drawMenu',
      label: ({ pluginState }) => isEditMode(pluginState.mode) ? 'Edit actions' : 'Draw actions',
      iconId: 'menu',
      exclusiveSlot: true,
      // draw_point belongs here too — it has no Undo (nothing to undo before a single-click
      // commit, gated separately below) and no delete-vertex, but it DOES support snapping,
      // and the Snap toggle is a menuItem living inside this same button.
      hiddenWhen: ({ pluginState }) => !(['draw_polygon', 'draw_line', 'draw_point'].includes(pluginState.mode) || isEditMode(pluginState.mode)),
      menuItems: [
        {
          id: 'drawUndo',
          label: 'Undo',
          iconId: 'undo',
          hiddenWhen: ({ pluginState }) => !(['draw_polygon', 'draw_line'].includes(pluginState.mode) || isEditMode(pluginState.mode)),
          enableWhen: ({ pluginState }) => {
            if (['draw_polygon', 'draw_line'].includes(pluginState.mode)) {
              return pluginState.numVertices > 0
            }
            return pluginState.undoStackLength > 0
          }
        },
        {
          id: 'drawSnap',
          label: 'Snap to feature',
          iconId: 'magnet',
          hiddenWhen: ({ pluginState }) => !pluginState.mode || !pluginState.hasSnapLayers,
          pressedWhen: ({ pluginState }) => !!pluginState.snap
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
          hiddenWhen: ({ pluginState }) => pluginState.mode !== 'edit_vertex'
        }
      ],
      mobile: { slot: DRAW_ACTIONS_SLOT },
      tablet: { slot: DRAW_ACTIONS_SLOT },
      desktop: { slot: DRAW_ACTIONS_SLOT }
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
    command: '<kbd>Alt</kbd> + <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> or <kbd>→</kbd>'
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
    id: 'menu',
    svgContent: '<path d="m6 9 6 6 6-6"/>'
  }, {
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
    reorderFeature,
    deleteFeature,
    split,
    merge
  }
}
