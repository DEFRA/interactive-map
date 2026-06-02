let globalState = {}

export const attachGlobalState = (globalStateRef) => {
  globalState = globalStateRef
}

// TODO - remove this once testing finishes
window.getGlobalState = () => Object.freeze(globalState)

const calculateLocalOpacity = (opacityValue, parentOpacityValue) => {
  if (opacityValue === undefined) {
    return parentOpacityValue === undefined ? globalState.opacity : parentOpacityValue
  }
  return opacityValue
}

const multiplyOpacities = (opacityValue, parentOpacityValue) => {
  const local = opacityValue === undefined ? 1 : opacityValue
  const parent = parentOpacityValue === undefined ? 1 : parentOpacityValue
  return Math.round((local * parent * globalState.opacity + Number.EPSILON) * 100) / 100
}

export const calculateOpacity = (opacityValue, parentOpacityValue) => {
  switch (globalState.opacityMode) {
    case 'global':
      return globalState.opacity
    case 'multiply':
      return multiplyOpacities(opacityValue, parentOpacityValue)
    case 'local':
    default:
      return calculateLocalOpacity(opacityValue, parentOpacityValue)
  }
}
