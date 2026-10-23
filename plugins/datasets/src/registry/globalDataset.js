const calculateLocalOpacity = (globals, opacityValue, parentOpacityValue) => {
  if (opacityValue === undefined) {
    if (parentOpacityValue === undefined) {
      return globals.opacity
    }
    return parentOpacityValue
  }
  return opacityValue
}

const multiplyOpacities = (globals, opacityValue = 1, parentOpacityValue = 1) => {
  return Math.round((opacityValue * parentOpacityValue * globals.opacity + Number.EPSILON) * 100) / 100
}

export const calculateOpacity = (globals, opacityValue, parentOpacityValue) => {
  switch (globals.opacityMode) {
    case 'global':
      return globals.opacity
    case 'multiply':
      return multiplyOpacities(globals, opacityValue, parentOpacityValue)
    case 'dataset':
    default:
      return calculateLocalOpacity(globals, opacityValue, parentOpacityValue)
  }
}
