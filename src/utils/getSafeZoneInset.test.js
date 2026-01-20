import { getSafeZoneInset } from './getSafeZoneInset'

describe('getSafeZoneInset', () => {
  let mainRef, insetRef, rightRef, footerRef, actionsRef
  let originalGetComputedStyle

  beforeAll(() => { originalGetComputedStyle = window.getComputedStyle })
  afterAll(() => { window.getComputedStyle = originalGetComputedStyle })

  beforeEach(() => {
    mainRef = { current: { offsetWidth: 800, offsetHeight: 600, offsetLeft: 0 } }
    insetRef = { current: { offsetWidth: 100, offsetHeight: 50, offsetTop: 50, offsetLeft: 20 } }
    rightRef = { current: { offsetWidth: 50, offsetLeft: 0 } }
    footerRef = { current: { offsetTop: 550 } }
    actionsRef = { current: { offsetTop: 520 } }

    // Mock CSS var --divider-gap = 10
    window.getComputedStyle = jest.fn().mockReturnValue({ getPropertyValue: () => '10' })
  })

  const runScenario = ({ isLandscape, insetHeight }) => {
    insetRef.current.offsetHeight = insetHeight

    // Manipulate dimensions to influence landscape heuristic
    if (isLandscape) {
      mainRef.current.offsetWidth = 1000
      insetRef.current.offsetWidth = 400
    } else {
      mainRef.current.offsetWidth = 600
      insetRef.current.offsetWidth = 100
    }

    return getSafeZoneInset({ mainRef, insetRef, rightRef, footerRef, actionsRef })
  }

  it('topOffset adds 0 when portrait and height = 0', () => {
    const result = runScenario({ isLandscape: false, insetHeight: 0 })
    expect(result.top).toBe(insetRef.current.offsetTop)
  })

  it('landscape returns left = rightOffset when there is enough room', () => {
    const result = runScenario({ isLandscape: true, insetHeight: 50 })
    expect(result.top).toBe(insetRef.current.offsetTop)
    expect(result.left).toBe(80) // rightOffset = 20 + 50 + 10
    expect(result.left).toBe(result.right) // left equals returned rightOffset
  })

  it('landscape returns left = rightOffset even when inset height = 0', () => {
    const result = runScenario({ isLandscape: true, insetHeight: 0 })
    expect(result.top).toBe(insetRef.current.offsetTop)
    expect(result.left).toBe(80)
    expect(result.left).toBe(result.right)
  })

  it('portrait shifts inset below itself when it does NOT have enough vertical room', () => {
    // Force a portrait overflow case
    mainRef.current.offsetWidth = 200
    insetRef.current.offsetWidth = 100
    insetRef.current.offsetHeight = 50
    insetRef.current.offsetTop = 50
    window.getComputedStyle = jest.fn().mockReturnValue({ getPropertyValue: () => '10' })

    const result = getSafeZoneInset({ mainRef, insetRef, rightRef, footerRef, actionsRef })

    // topOffset = 50 + 50 + 10 = 110
    expect(result.top).toBe(110)
    // left = rightOffset = 20 + 50 + 10 = 80
    expect(result.left).toBe(80)
    expect(result.right).toBe(80)
  })
})
