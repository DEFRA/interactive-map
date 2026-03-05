import { getSafeZoneInset } from './getSafeZoneInset'

describe('getSafeZoneInset', () => {
  let mainRef, insetRef, leftRef, rightRef, actionsRef, footerRef
  let originalGetComputedStyle

  beforeAll(() => { originalGetComputedStyle = window.getComputedStyle })
  afterAll(() => { window.getComputedStyle = originalGetComputedStyle })

  beforeEach(() => {
    mainRef = { current: { offsetWidth: 800, offsetHeight: 600, offsetLeft: 0 } }
    insetRef = { current: { offsetWidth: 100, offsetHeight: 50, offsetTop: 50, offsetLeft: 20 } }
    leftRef = { current: { offsetWidth: 50, offsetLeft: 20, offsetTop: 10 } }
    rightRef = { current: { offsetWidth: 50, offsetLeft: 730 } }
    actionsRef = { current: { offsetTop: 520 } }
    footerRef = { current: { offsetTop: 550 } }

    // CSS var mock
    window.getComputedStyle = jest.fn().mockReturnValue({ getPropertyValue: () => '10' })
  })

  it('returns undefined if any ref.current is null', () => {
    const result = getSafeZoneInset({
      mainRef: { current: null },
      insetRef,
      leftRef,
      rightRef,
      actionsRef,
      footerRef
    })
    expect(result).toBeUndefined()
  })

  it('portrait mode shifts inset below itself when it does NOT have enough vertical room', () => {
    // Mock layout
    mainRef.current.offsetWidth = 200
    mainRef.current.offsetHeight = 200
    insetRef.current.offsetWidth = 100
    insetRef.current.offsetHeight = 50
    insetRef.current.offsetTop = 50
    insetRef.current.offsetLeft = 20

    leftRef.current.offsetWidth = 50
    leftRef.current.offsetLeft = 10
    leftRef.current.offsetTop = 10

    rightRef.current.offsetWidth = 50
    rightRef.current.offsetLeft = 140

    actionsRef.current.offsetTop = 150
    footerRef.current.offsetTop = 180

    const dividerGap = 10

    const result = getSafeZoneInset({ mainRef, insetRef, leftRef, rightRef, actionsRef, footerRef })

    // Compute expected values exactly as function would
    const availableHeight = actionsRef.current.offsetTop - insetRef.current.offsetTop - dividerGap // 150 - 50 - 10 = 90
    const leftOffset = leftRef.current.offsetLeft + leftRef.current.offsetWidth + dividerGap // 10 + 50 + 10 = 70
    const rightOffset = leftRef.current.offsetLeft + rightRef.current.offsetWidth + dividerGap // 10 + 50 + 10 = 70
    const availableWidth = mainRef.current.offsetWidth - (leftOffset + rightOffset) // 200 - (70+70) = 60
    const insetOverlapWidth = insetRef.current.offsetWidth - leftOffset + leftRef.current.offsetLeft // 100 - 70 + 10 = 40
    const isLandscape = availableWidth - insetOverlapWidth > availableHeight - insetRef.current.offsetHeight // 60-40 > 90-50 => 20>40 false

    const topOffset = leftRef.current.offsetTop + (!isLandscape && insetRef.current.offsetHeight > 0 ? insetRef.current.offsetHeight + dividerGap : 0) // 10 + 50 +10 = 70
    const combinedLeftOffset = isLandscape ? Math.max(insetRef.current.offsetWidth, leftRef.current.offsetWidth) + leftRef.current.offsetLeft + dividerGap : rightOffset // isLandscape=false -> 70
    const actionsOffset = mainRef.current.offsetHeight - actionsRef.current.offsetTop // 200-150=50
    const footerOffset = mainRef.current.offsetHeight - footerRef.current.offsetTop // 200-180=20
    const hasRoom = insetOverlapWidth < availableWidth / 2 && insetRef.current.offsetHeight < availableHeight / 2 // 40 < 60/2? 40<30 false

    const expectedTop = hasRoom ? insetRef.current.offsetTop : topOffset // false -> topOffset = 70
    const expectedLeft = mainRef.current.offsetLeft + (hasRoom ? rightOffset : combinedLeftOffset) // 0+70=70
    const expectedRight = rightOffset // 70
    const expectedBottom = Math.max(actionsOffset, footerOffset) + dividerGap // max(50,20)+10 = 60

    expect(result.top).toBe(expectedTop)
    expect(result.left).toBe(expectedLeft)
    expect(result.right).toBe(expectedRight)
    expect(result.bottom).toBe(expectedBottom)
  })

  it('landscape mode places inset beside panel when enough room', () => {
    mainRef.current.offsetWidth = 1000
    insetRef.current.offsetWidth = 200
    insetRef.current.offsetHeight = 50

    const result = getSafeZoneInset({ mainRef, insetRef, leftRef, rightRef, actionsRef, footerRef })

    const dividerGap = 10
    const leftOffset = leftRef.current.offsetLeft + leftRef.current.offsetWidth + dividerGap
    const rightOffset = leftRef.current.offsetLeft + rightRef.current.offsetWidth + dividerGap
    const availableWidth = mainRef.current.offsetWidth - (leftOffset + rightOffset)
    const insetOverlapWidth = insetRef.current.offsetWidth - leftOffset + leftRef.current.offsetLeft
    const availableHeight = actionsRef.current.offsetTop - insetRef.current.offsetTop - dividerGap
    const isLandscape = availableWidth - insetOverlapWidth > availableHeight - insetRef.current.offsetHeight

    const topOffset = leftRef.current.offsetTop + (!isLandscape && insetRef.current.offsetHeight > 0 ? insetRef.current.offsetHeight + dividerGap : 0)
    const combinedLeftOffset = isLandscape ? Math.max(insetRef.current.offsetWidth, leftRef.current.offsetWidth) + leftRef.current.offsetLeft + dividerGap : rightOffset
    const actionsOffset = mainRef.current.offsetHeight - actionsRef.current.offsetTop
    const footerOffset = mainRef.current.offsetHeight - footerRef.current.offsetTop
    const hasRoom = insetOverlapWidth < availableWidth / 2 && insetRef.current.offsetHeight < availableHeight / 2
    const top = hasRoom ? insetRef.current.offsetTop : topOffset
    const combinedLeft = mainRef.current.offsetLeft + (hasRoom ? rightOffset : combinedLeftOffset)
    const bottom = Math.max(actionsOffset, footerOffset) + dividerGap

    expect(result.top).toBe(top)
    expect(result.left).toBe(combinedLeft)
    expect(result.right).toBe(rightOffset)
    expect(result.bottom).toBe(bottom)
  })

  it('portrait mode with zero inset height leaves top unchanged', () => {
    insetRef.current.offsetHeight = 0
    mainRef.current.offsetWidth = 500
    insetRef.current.offsetWidth = 100

    const result = getSafeZoneInset({ mainRef, insetRef, leftRef, rightRef, actionsRef, footerRef })
    expect(result.top).toBe(insetRef.current.offsetTop)
  })

  it('calculates correct bottom using max of actions and footer offsets', () => {
    mainRef.current.offsetHeight = 600
    actionsRef.current.offsetTop = 500
    footerRef.current.offsetTop = 550

    const result = getSafeZoneInset({ mainRef, insetRef, leftRef, rightRef, actionsRef, footerRef })

    const dividerGap = 10
    const expectedBottom = Math.max(mainRef.current.offsetHeight - actionsRef.current.offsetTop,
                                    mainRef.current.offsetHeight - footerRef.current.offsetTop) + dividerGap
    expect(result.bottom).toBe(expectedBottom)
  })
})