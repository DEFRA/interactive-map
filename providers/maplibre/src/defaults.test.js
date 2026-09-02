import { DEFAULTS, supportedShortcuts } from './defaults.js'

describe('DEFAULTS', () => {
  it('keeps animationDuration below the 500ms core debounce time', () => {
    expect(DEFAULTS.animationDuration).toBeLessThan(500)
  })

  it('exposes coordinatePrecision', () => {
    expect(DEFAULTS.coordinatePrecision).toBe(7)
  })
})

describe('supportedShortcuts', () => {
  it('lists the keyboard shortcuts this provider supports', () => {
    expect(supportedShortcuts).toEqual([
      'showKeyboardHelp',
      'selectControl',
      'moveLarge',
      'nudgeMap',
      'zoomLarge',
      'nudgeZoom',
      'highlightLabelAtCenter',
      'highlightNextLabel'
    ])
  })
})
