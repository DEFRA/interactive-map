import { initialState, actions } from './reducer.js'
import { DrawInit } from './DrawInit.jsx'
import { newPolygon } from './api/newPolygon.js'
import { newLine } from './api/newLine.js'
import { editFeature } from './api/editFeature.js'
import { addFeature } from './api/addFeature.js'
import { deleteFeature } from './api/deleteFeature.js'

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
      hiddenWhen: ({ pluginState }) => !pluginState.mode,
      ...createButtonSlots(true)
    },
    {
      id: 'drawAddPoint',
      label: 'Add point',
      variant: 'primary',
      hiddenWhen: ({ appState, pluginState }) =>
        !['draw_polygon', 'draw_line'].includes(pluginState.mode) || appState.interfaceType !== 'touch',
      ...createButtonSlots(true)
    },
    {
      id: 'drawDone',
      label: 'Done',
      variant: 'primary',
      hiddenWhen: ({ pluginState }) =>
        !['draw_polygon', 'draw_line', 'edit_vertex'].includes(pluginState.mode),
      enableWhen: ({ pluginState }) => {
        if (pluginState.mode === 'draw_polygon') return pluginState.numVertecies >= 3
        if (pluginState.mode === 'draw_line') return pluginState.numVertecies >= 2
        if (pluginState.mode === 'edit_vertex') return true
        return false
      },
      ...createButtonSlots(true)
    },
    {
      id: 'drawMenu',
      label: 'Menu',
      iconId: 'menu',
      hiddenWhen: ({ pluginState }) =>
        !['draw_polygon', 'draw_line', 'edit_vertex'].includes(pluginState.mode),
      menuItems: [
        {
          id: 'drawUndo',
          label: 'Undo',
          iconId: 'undo',
          hiddenWhen: ({ pluginState }) =>
            !['draw_polygon', 'draw_line', 'edit_vertex'].includes(pluginState.mode),
          enableWhen: ({ pluginState }) => pluginState.undoStackLength > 0
        },
        {
          id: 'drawDeletePoint',
          label: 'Delete point',
          iconId: 'trash',
          enableWhen: ({ pluginState }) =>
            pluginState.selectedVertexIndex >= 0 && pluginState.numVertecies > 2,
          hiddenWhen: ({ pluginState }) => pluginState.mode !== 'edit_vertex'
        }
      ],
      mobile: { slot: 'bottom-right' },
      tablet: { slot: 'top-middle' },
      desktop: { slot: 'top-middle' }
    }
  ],

  icons: [
    {
      id: 'menu',
      svgContent: '<path d="m6 9 6 6 6-6"/>'
    },
    {
      id: 'undo',
      svgContent: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>'
    },
    {
      id: 'trash',
      svgContent: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'
    }
  ],

  api: {
    newPolygon,
    newLine,
    editFeature,
    addFeature,
    deleteFeature
  }
}
