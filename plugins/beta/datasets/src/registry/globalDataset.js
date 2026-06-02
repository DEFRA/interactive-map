let globalState = {}

export const attachGlobalState = (globalStateRef) => {
  globalState = globalStateRef
}

// TODO - remove this once testing finishes
window.getGlobalState = () => Object.freeze(globalState)

const calculateLocalOpacity = (opacityValue, parentOpacityValue) => {
  console.log('Calculating local opacity with', { opacityValue, parentOpacityValue, globalOpacity: globalState.opacity })
  if (opacityValue === undefined) {
    if (parentOpacityValue === undefined) {
      return globalState.opacity
    }
    return parentOpacityValue
  }
  return opacityValue
}

const multiplyOpacities = (opacityValue = 1, parentOpacityValue = 1) => {
  return Math.round((opacityValue * parentOpacityValue * globalState.opacity + Number.EPSILON) * 100) / 100
}

export const calculateOpacity = (opacityValue, parentOpacityValue) => {
  switch (globalState.opacityMode) {
    case 'global':
      return globalState.opacity
    case 'multiply':
      return multiplyOpacities(opacityValue, parentOpacityValue)
    case 'dataset':
    default:
      return calculateLocalOpacity(opacityValue, parentOpacityValue)
  }
}
