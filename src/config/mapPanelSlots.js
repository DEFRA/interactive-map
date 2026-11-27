// Layout refs of the slots whose panels sit over the map. Panels in other slots are modal, beside
// the map, or hold buttons or little content.

// The side columns. The safe zone leaves out a panel here that's too small to narrow it.
export const SIDE_PANEL_SLOT_REFS = ['leftTopRef', 'leftBottomRef', 'rightTopRef', 'rightBottomRef']

// The side columns and the drawer, which is always within the safe zone's bottom inset
export const MAP_PANEL_SLOT_REFS = [...SIDE_PANEL_SLOT_REFS, 'drawerRef']
