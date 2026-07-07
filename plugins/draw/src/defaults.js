const BLUE = 'rgba(29,112,184,1)'
const WHITE = '#ffffff'
const BLACK = 'rgba(11,12,12,1)'
const LIGHT_BLUE = 'rgba(29,112,184,0.1)'
const LIGHT_WHITE = 'rgba(255,255,255,0.1)'
const RED = 'rgba(212,53,28,1)'
const MID_ORANGE = 'rgba(212,53,28,0.5)'
const MID_BLUE = 'rgba(29,112,184,0.5)'
const GREEN = 'rgba(40,161,151,1)'

export const COLORS = {
  editStroke: { light: BLUE, dark: WHITE },
  editFill: { light: LIGHT_BLUE, dark: LIGHT_WHITE },
  editVertex: { light: BLUE, dark: WHITE },
  editMidpoint: { light: BLUE, dark: WHITE },
  editHalo: { light: WHITE, dark: BLACK },
  editActive: { light: BLACK, dark: WHITE },
  splitInvalid: BLUE,
  splitValid: BLUE,
  invalidStroke: BLUE,
  shapeStroke: RED,
  shapeFill: MID_ORANGE,
  snapVertex: MID_ORANGE,
  snapMidpoint: GREEN,
  snapEdge: MID_BLUE
}

export const SIZES = {
  strokeWidth: 2,
  vertexRadius: 6,
  midpointRadius: 4,
  vertexHaloRadius: 8,
  midpointHaloRadius: 6,
  touchTargetSize: 48,
  touchIndicatorRadius: 30
}

export const TOLERANCES = {
  snapRadius: 12
}

export const KEYBOARD = {
  nudgeAmount: 1,
  stepAmount: 5
}

// Scale factor applied to draw UI (touch targets, vertex handles) per app map size
export const MAP_SIZE_SCALES = {
  small: 1,
  medium: 1.5,
  large: 2
}
