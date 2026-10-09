import { stringToKebab } from './stringToKebab.js'

// Shared by MapButton (aria-controls) and Panel (its own root id) so they can't drift apart.
export const getPanelElementId = (idPrefix, panelId) => `${idPrefix}-panel-${stringToKebab(panelId)}`
