import { isMac } from '../../utils/isMac.js'

// getInfo uses Ctrl on Windows/Linux (Alt+letter is reserved for menu mnemonics there) and Alt/Option on Mac — keep in sync with keyboardShortcuts.js's `infoKeyHtml`.
const infoModifier = isMac() ? 'Alt' : 'Ctrl'

export const keyboardMappings = {
  keydown: {
    ArrowUp: 'panUp',
    ArrowDown: 'panDown',
    ArrowLeft: 'panLeft',
    ArrowRight: 'panRight',
    '+': 'zoomIn',
    '=': 'zoomIn',
    '-': 'zoomOut',
    _: 'zoomOut'
  },

  keyup: {
    '?': 'showKeyboardControls',
    'Alt+ArrowRight': 'highlightNextLabel',
    'Alt+ArrowLeft': 'highlightNextLabel',
    'Alt+ArrowUp': 'highlightNextLabel',
    'Alt+ArrowDown': 'highlightNextLabel',
    'Alt+Enter': 'highlightLabelAtCenter',
    [`${infoModifier}+i`]: 'getInfo',
    [`${infoModifier}+I`]: 'getInfo',
    Escape: 'clearSelection'
  }
}
