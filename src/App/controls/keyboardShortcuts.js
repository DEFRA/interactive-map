// src/controls/keyboardShortcuts.js

export const coreShortcuts = [
  {
    id: 'showKeyboardHelp',
    title: 'Show keyboard help',
    command: '<kbd>Alt</kbd> + <kbd>K</kbd>',
    context: 'global',
    enabled: true
  },
  {
    id: 'selectControl',
    title: 'Select a map control',
    command: '<kbd>Tab</kbd> or <kbd>Shift</kbd> + <kbd>Tab</kbd>',
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
    command: '<kbd>Alt</kbd> + <kbd>Enter</kbd>',
    enabled: false,
    requiredConfig: ['readMapText']
  },
  {
    id: 'highlightNextLabel',
    title: 'Highlight nearby label',
    command: '<kbd>Alt</kbd> + <kbd>→</kbd>, <kbd>←</kbd>, <kbd>↑</kbd> or <kbd>↓</kbd>',
    enabled: false,
    requiredConfig: ['readMapText']
  }
]
