import { getFocusOptions } from './getFocusOptions.js'

describe('getFocusOptions', () => {
  it('lets the browser scroll to the focused element for keyboard users', () => {
    expect(getFocusOptions('keyboard')).toEqual({ preventScroll: false })
  })

  it.each(['pointer', 'touch', undefined])('prevents the page scrolling for %s', (interfaceType) => {
    expect(getFocusOptions(interfaceType)).toEqual({ preventScroll: true })
  })
})
