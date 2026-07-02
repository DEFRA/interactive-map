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
  mousePointer: { light: BLUE, dark: WHITE },
  mousePointerHalo: { light: WHITE, dark: BLACK },
  drawPointer: { light: BLUE, dark: WHITE },
  drawPointerHalo: { light: WHITE, dark: BLACK },
  editStroke: { light: BLUE, dark: WHITE },
  editFill: { light: LIGHT_BLUE, dark: LIGHT_WHITE },
  editVertex: { light: BLUE, dark: WHITE },
  editMidpoint: { light: BLUE, dark: WHITE },
  editHalo: { light: WHITE, dark: BLACK },
  editActive: { light: BLACK, dark: WHITE },
  splitInvalid: BLUE,
  splitValid: BLUE,
  shapeStroke: RED,
  shapeFill: MID_ORANGE,
  snapVertex: MID_ORANGE,
  snapMidpoint: GREEN,
  snapEdge: MID_BLUE
}

export const SIZES = {
  mousePointerRadius: 4,
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

export const KEYBOARD = {
  nudgeAmount: 1,
  stepAmount: 5
}
