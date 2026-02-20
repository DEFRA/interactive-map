// /plugins/draw-ml/manifest.js
import { initialState, actions } from './reducer.js'
import { DrawInit } from './DrawInit.jsx'
import { newPolygon } from './api/newPolygon.js'
import { newLine } from './api/newLine.js'
import { editFeature } from './api/editFeature.js'
import { addFeature } from './api/addFeature.js'
import { deleteFeature } from './api/deleteFeature.js'
import { split } from './api/split.js'
import { merge } from './api/merge.js'

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
    id: 'drawAddPoint',
    label: 'Add point',
    variant: 'primary',
    hiddenWhen: ({ appState, pluginState }) => !['draw_polygon', 'draw_line'].includes(pluginState.mode) || appState.interfaceType !== 'touch',
    ...createButtonSlots(true)
  },{
    id: 'drawCancel',
    label: 'Cancel',
    variant: 'tertiary',
    hiddenWhen: ({ pluginState }) => !pluginState.mode,
    ...createButtonSlots(true)
  },{
    id: 'drawMenu',
    label: 'Menu',
    iconId: 'menu',
    variant: 'tertiary',
    hiddenWhen: ({ pluginState }) => !['draw_polygon', 'draw_line', 'edit_vertex'].includes(pluginState.mode),
    menuItems: [{
      id: 'drawUndo',
      label: 'Undo',
      iconId: 'undo',
      hiddenWhen: ({ pluginState }) => !['draw_polygon', 'draw_line', 'edit_vertex'].includes(pluginState.mode),
      enableWhen: ({ pluginState }) => pluginState.undoStackLength > 0,
    },{
      id: 'drawSnap',
      label: 'Snap to feature',
      iconId: 'magnet',
      hiddenWhen: ({ pluginState }) => !pluginState.mode || !pluginState.hasSnapLayers,
      pressedWhen: ({ pluginState }) => !!pluginState.snap,
    },{
      id: 'drawDeletePoint',
      label: 'Delete point',
      iconId: 'trash',
      enableWhen: ({ pluginState }) => pluginState.selectedVertexIndex >= 0 && pluginState.numVertecies > (pluginState.tempFeature?.geometry?.type === 'Polygon' ? 3 : 2),
      hiddenWhen: ({ pluginState }) => !(['simple_select', 'edit_vertex'].includes(pluginState.mode)),
    }],
    ...createButtonSlots(true)
  },{
    id: 'drawDone',
    label: 'Done',
    variant: 'primary',
    hiddenWhen: ({ pluginState }) => !['draw_polygon', 'draw_line', 'edit_vertex'].includes(pluginState.mode),
    enableWhen: ({ pluginState }) => pluginState.numVertecies >= (pluginState.mode === 'draw_polygon' ? 3 : 2),
    ...createButtonSlots(true)
  }],

  keyboardShortcuts: [{
    id: 'drawStart',
    group: 'Drawing',
    title: 'Edit vertex',
    command: '<kbd>Spacebar</kbd></dd>'
  }],

  icons: [{
    id: 'menu',
    svgContent: '<path d="m6 9 6 6 6-6"/>'
  },{
    id: 'undo',
    svgContent: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>'
  },{
    id: 'check',
    svgContent: '<path d="M20 6 9 17l-5-5"/>'
  },{
    id: 'magnet',
    svgContent: '<path d="m12 15 4 4"/><path d="M2.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.029-6.029a1 1 0 1 1 3 3l-6.029 6.029a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.365-6.367A1 1 0 0 0 8.716 4.282z"/><path d="m5 8 4 4"/>'
  },{
    id: 'trash',
    svgContent: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'
  }],

  api: {
    newPolygon,
    newLine,
    editFeature,
    addFeature,
    deleteFeature,
    split,
    merge
  }
}