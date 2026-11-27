// Draw and edit mode groupings shared by the framework-agnostic plugin layer. The adapters
// keep their own sets, since they sit on the other side of the adapter contract.
//
// Each set is written out in full and only ever read with .has() — spreading a Set
// ([...aSet]) can silently misbehave under a loose-mode Babel build (see OLDrawManager.js's emit()).

// New shapes drawn vertex by vertex, finished with Done
const SHAPE_DRAW_MODES = new Set(['draw_polygon', 'draw_line'])

// Modes that place vertices at the crosshair. Edit modes aren't included: users of every
// input type select a vertex or midpoint directly.
const DRAWING_MODES = new Set(['draw_polygon', 'draw_line', 'draw_point'])

// Existing features being reshaped (edit_point relocates a point's one coordinate)
const EDIT_MODES = new Set(['edit_vertex', 'edit_point'])

// Modes with a Done button, whose committed changes are checked (onGeometryChange)
const CHECKED_MODES = new Set(['draw_polygon', 'draw_line', 'edit_vertex', 'edit_point'])

// Every active draw/edit session
const SESSION_MODES = new Set(['draw_polygon', 'draw_line', 'draw_point', 'edit_vertex', 'edit_point'])

export const isShapeDrawMode = (mode) => SHAPE_DRAW_MODES.has(mode)
export const isDrawingMode = (mode) => DRAWING_MODES.has(mode)
export const isEditMode = (mode) => EDIT_MODES.has(mode)
export const isCheckedMode = (mode) => CHECKED_MODES.has(mode)
export const isSessionMode = (mode) => SESSION_MODES.has(mode)
