const PRIMARY_LIGHT = 'rgba(29,112,184,1)'
const PRIMARY_DARK = '#ffffff'

export const DEFAULTS = {
  editStroke: { light: PRIMARY_LIGHT, dark: PRIMARY_DARK },
  editFill: { light: 'rgba(29,112,184,0.1)', dark: 'rgba(255,255,255,0.1)' },
  editVertex: { light: PRIMARY_LIGHT, dark: PRIMARY_DARK },
  editMidpoint: { light: PRIMARY_LIGHT, dark: PRIMARY_DARK },
  editHalo: { light: PRIMARY_DARK, dark: 'rgba(11,12,12,1)' },
  editActive: { light: 'rgba(11,12,12,1)', dark: PRIMARY_DARK },
  splitInvalid: PRIMARY_LIGHT,
  splitValid: PRIMARY_LIGHT,
  shapeStroke: 'rgba(212,53,28,1)',
  shapeFill: 'rgba(212,53,28,0.5)',
  strokeWidth: 2,
  snapVertex: 'rgba(212,53,28,0.5)',
  snapMidpoint: 'rgba(40,161,151,1)',
  snapEdge: 'rgba(29,112,184,0.5)',
  snapRadius: 10
}
