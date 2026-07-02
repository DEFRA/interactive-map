const PRIMARY_LIGHT = 'rgba(29,112,184,1)'
const PRIMARY_DARK = '#ffffff'
const EDIT_LIGHT_TINT = 'rgba(29,112,184,0.1)'
const EDIT_DARK_TINT = 'rgba(255,255,255,0.1)'
const SHAPE_STROKE_COLOR = 'rgba(212,53,28,1)'
const SHAPE_STROKE_TINT = 'rgba(212,53,28,0.5)'
const SNAP_MIDPOINT_COLOR = 'rgba(40,161,151,1)'

export const COLORS = {
  editStroke: { light: PRIMARY_LIGHT, dark: PRIMARY_DARK },
  editFill: { light: EDIT_LIGHT_TINT, dark: EDIT_DARK_TINT },
  editVertex: { light: PRIMARY_LIGHT, dark: PRIMARY_DARK },
  editMidpoint: { light: PRIMARY_LIGHT, dark: PRIMARY_DARK },
  editHalo: { light: PRIMARY_DARK, dark: 'rgba(11,12,12,1)' },
  editActive: { light: 'rgba(11,12,12,1)', dark: PRIMARY_DARK },
  splitInvalid: PRIMARY_LIGHT,
  splitValid: PRIMARY_LIGHT,
  shapeStroke: SHAPE_STROKE_COLOR,
  shapeFill: SHAPE_STROKE_TINT,
  snapVertex: SHAPE_STROKE_TINT,
  snapMidpoint: SNAP_MIDPOINT_COLOR,
  snapEdge: 'rgba(29,112,184,0.5)'
}

export const SIZES = {
  strokeWidth: 2,
  vertexRadius: 6,
  midpointRadius: 4,
  vertexHaloRadius: 8,
  touchTargetSize: 48,
  touchIndicatorRadius: 30
}

export const TOLERANCES = {
  snapRadius: 12
}
