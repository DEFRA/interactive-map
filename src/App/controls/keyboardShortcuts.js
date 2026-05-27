// src/controls/keyboardShortcuts.js
import { altKeyHtml } from '../../utils/platform.js'

export const coreShortcuts = [
  {
    id: 'showKeyboardHelp',
    title: 'Show keyboard help',
    command: `${altKeyHtml} + <kbd>K</kbd>`,
    context: 'global',
    enabled: true
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
