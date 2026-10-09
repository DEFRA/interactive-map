// src/controls/keyboardShortcuts.js
import { isMac } from '../../utils/isMac.js'

const altKeyHtml = isMac() ? '<kbd>Option</kbd>' : '<kbd>Alt</kbd>'
// getInfo uses Ctrl on Windows/Linux instead of Alt, which is reserved there for menu mnemonics.
const infoKeyHtml = isMac() ? '<kbd>Option</kbd>' : '<kbd>Ctrl</kbd>'

export const coreShortcuts = [
  {
    id: 'showKeyboardHelp',
    title: 'Show keyboard help',
    command: '<kbd>Shift</kbd> + <kbd>?</kbd>',
    context: 'global',
    enabled: true
  },
  {
    id: 'getInfo',
    title: 'Get current location and visible area',
    command: `${infoKeyHtml} + <kbd>I</kbd>`,
    enabled: true,
    // No visual equivalent, so hide the row from sighted users but keep it discoverable via assistive tech.
    visuallyHidden: true,
    // Only needs getCenter/getZoom, which every map provider implements, so no adapter needs to declare it.
    mapProviderAgnostic: true,
    requiredConfig: ['reverseGeocodeProvider']
  },
  {
    id: 'moveLarge',
    title: 'Move in large steps',
    command: '<kbd>←</kbd>, <kbd>↑</kbd>, <kbd>→</kbd> or <kbd>↓</kbd>',
    enabled: true
  },
  {
    id: 'nudgeMap',
    title: 'Nudge map',
    command: '<kbd>Shift</kbd> + <kbd>←</kbd>, <kbd>↑</kbd>, <kbd>→</kbd> or <kbd>↓</kbd>',
    enabled: false
  },
  {
    id: 'zoomLarge',
    title: 'Zoom in large steps',
    command: '<kbd>+</kbd> or <kbd>-</kbd>',
    enabled: true
  },
  {
    id: 'nudgeZoom',
    title: 'Nudge zoom',
    command: '<kbd>Shift</kbd> + <kbd>+</kbd> or <kbd>-</kbd>',
    enabled: false
  },
  {
    id: 'highlightLabelAtCenter',
    title: 'Highlight label at centre',
    command: `${altKeyHtml} + <kbd>Enter</kbd>`,
    enabled: false,
    requiredConfig: ['readMapText']
  },
  {
    id: 'highlightNextLabel',
    title: 'Highlight nearby label',
    command: `${altKeyHtml} + <kbd>→</kbd>, <kbd>←</kbd>, <kbd>↑</kbd> or <kbd>↓</kbd>`,
    enabled: false,
    requiredConfig: ['readMapText']
  }
]
