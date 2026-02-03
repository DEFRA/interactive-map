// /plugins/draw-ml/manifest.js
import { initialState, actions } from './reducer.js'
import { DrawInit } from './DrawInit.jsx'
import { newPolygon } from './api/newPolygon.js'
import { newLine } from './api/newLine.js'
import { editFeature } from './api/editFeature.js'
import { addFeature } from './api/addFeature.js'
import { deleteFeature } from './api/deleteFeature.js'

const createButtonSlots = (showLabel) => ({
  mobile:  { slot: 'actions', showLabel },
  tablet:  { slot: 'actions', showLabel },
  desktop: { slot: 'actions', showLabel }
})

export const manifest = {
  reducer: {
    initialState,
    actions
  },

  InitComponent: DrawInit,

  buttons: [{
    id: 'drawDone',
    label: 'Done',
    variant: 'primary',
    hiddenWhen: ({ appState, pluginState }) => !pluginState.mode || appState.interfaceType !== 'mouse' && pluginState.mode !== 'edit_vertex',
    enableWhen: ({ pluginState }) => !!pluginState.tempFeature,
    ...createButtonSlots(true)
  },{
    id: 'drawAddPoint',
    label: 'Add point',
    variant: 'primary',
    hiddenWhen: ({ appState, pluginState }) => !['draw_polygon', 'draw_line'].includes(pluginState.mode) || appState.interfaceType === 'mouse',
    ...createButtonSlots(true)
  },{
    id: 'drawUndo',
    label: 'Undo',
    iconId: 'undo',
    variant: 'tertiary',
    hiddenWhen: ({ pluginState }) => !['draw_polygon', 'draw_line', 'edit_vertex'].includes(pluginState.mode),
    enableWhen: ({ pluginState }) => pluginState.undoStackLength > 0,
    ...createButtonSlots(false)
  },{
    id: 'drawFinish',
    label: 'Finish shape',
    iconId: 'check',
    variant: 'tertiary',
    hiddenWhen: ({ pluginState }) => !['draw_polygon', 'draw_line'].includes(pluginState.mode),
    enableWhen: ({ pluginState }) => pluginState.numVertecies >= (pluginState.mode === 'draw_polygon' ? 3 : 2),
    ...createButtonSlots(false)
  },{
    id: 'drawDeletePoint',
    label: 'Delete point',
    iconId: 'close',
    variant: 'tertiary',
    enableWhen: ({ pluginState }) => pluginState.selectedVertexIndex >= 0 && pluginState.numVertecies > (pluginState.tempFeature?.geometry?.type === 'Polygon' ? 3 : 2),
    hiddenWhen: ({ pluginState }) => !(['simple_select', 'edit_vertex'].includes(pluginState.mode)),
    ...createButtonSlots(false)
  },{
    id: 'drawSnap',
    label: 'Snap to line',
    iconId: 'magnet',
    variant: 'tertiary',
    hiddenWhen: ({ pluginState }) => !pluginState.mode || !pluginState.hasSnapLayers,
    pressedWhen: ({ pluginState }) => !!pluginState.snap,
    ...createButtonSlots(false)
  },{
    id: 'drawCancel',
    label: 'Cancel',
    variant: 'tertiary',
    hiddenWhen: ({ pluginState }) => !pluginState.mode,
    ...createButtonSlots(true)
  }],

  keyboardShortcuts: [{
    id: 'drawStart',
    group: 'Drawing',
    title: 'Edit vertex',
    command: '<kbd>Spacebar</kbd></dd>'
  }],

  icons: [{
    id: 'check',
    svgContent: '<path d="M20 6 9 17l-5-5"/>'
  },{
    id: 'undo',
    svgContent: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>'
  },{
    id: 'magnet',
    svgContent: '<path d="m12 15 4 4"/><path d="M2.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.029-6.029a1 1 0 1 1 3 3l-6.029 6.029a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.365-6.367A1 1 0 0 0 8.716 4.282z"/><path d="m5 8 4 4"/>'
  }],

  api: {
    newPolygon,
    newLine,
    editFeature,
    addFeature,
    deleteFeature
  }
}