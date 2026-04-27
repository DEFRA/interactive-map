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
    'Alt+k': 'showKeyboardControls',
    'Alt+K': 'showKeyboardControls',
    'Alt+ArrowRight': 'highlightNextLabel',
    'Alt+ArrowLeft': 'highlightNextLabel',
    'Alt+ArrowUp': 'highlightNextLabel',
    'Alt+ArrowDown': 'highlightNextLabel',
    'Alt+Enter': 'highlightLabelAtCenter',
    'Alt+i': 'getInfo',
    'Alt+I': 'getInfo',
    Escape: 'clearSelection'
  }
}
