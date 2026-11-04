import { renderHook } from '@testing-library/react'
import { useLayoutMeasurements } from './useLayoutMeasurements'
import { useResizeObserver } from './useResizeObserver.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { getSafeZoneInset } from '../../utils/getSafeZoneInset.js'

jest.mock('./useResizeObserver.js')
jest.mock('../store/appContext.js')
jest.mock('../store/mapContext.js')
jest.mock('../../utils/getSafeZoneInset.js')

const el = ({ rect, ...props } = {}) => {
  const e = document.createElement('div')
  e.style.setProperty = jest.fn()
  Object.entries(props).forEach(([k, v]) => Object.defineProperty(e, k, { value: v, configurable: true }))
  if (rect) {
    e.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, ...rect })
  }
  return e
}

// For firstElementChild-based reads (logo column width, attribution text natural width).
const appendChild = (parent, props = {}) => {
  const child = el(props)
  parent.appendChild(child)
  return child
}

const refs = (o = {}) => ({
  appContainerRef: { current: o.appContainer || el() },
  mainRef: { current: o.main === null ? null : el({ offsetHeight: 500, ...o.main }) },
  headerRef: { current: el(o.header) },
  bannerRef: { current: el(o.banner) },
  topRef: { current: o.top === null ? null : el({ offsetTop: 10, ...o.top }) },
  topLeftColRef: { current: el({ offsetHeight: 50, offsetWidth: 200, ...o.topLeftCol }) },
  topMiddleColRef: { current: el(o.topMiddleCol) },
  topRightColRef: { current: el({ offsetHeight: 40, offsetWidth: 180, ...o.topRightCol }) },
  leftRef: { current: el(o.left) },
  rightRef: { current: el(o.right) },
  bottomRef: { current: o.bottom === null ? null : el({ offsetTop: 400, ...o.bottom }) },
  bottomLeftColRef: { current: el(o.bottomLeftCol) },
  bottomRightColRef: { current: el(o.bottomRightCol) },
  bottomRightRef: { current: el({ offsetTop: 400, ...o.bottomRight }) },
  leftTopRef: { current: el({ offsetHeight: 0, ...o.leftTop }) },
  leftBottomRef: { current: el({ offsetHeight: 0, ...o.leftBottom }) },
  rightTopRef: { current: el({ offsetHeight: 0, ...o.rightTop }) },
  rightBottomRef: { current: el({ offsetHeight: 0, ...o.rightBottom }) },
  attributionsRef: { current: el({ offsetHeight: 16, rect: { top: 400 }, ...o.attributions }) },
  drawerRef: { current: el(o.drawer) },
  actionsRef: { current: el({ offsetTop: 450, ...o.actions }) }
})

const setup = (o = {}) => {
  const dispatch = jest.fn()
  const layoutRefs = refs(o.refs)
  useApp.mockReturnValue({ dispatch, breakpoint: 'desktop', layoutRefs, arePluginsEvaluated: true, ...o.app })
  useMap.mockReturnValue({ mapSize: { width: 800, height: 600 }, isMapReady: true, ...o.map })
  getSafeZoneInset.mockReturnValue({ top: 0, right: 0, bottom: 0, left: 0 })
  return { dispatch, layoutRefs }
}

describe('useLayoutMeasurements', () => {
  let rafSpy

  beforeEach(() => {
    jest.clearAllMocks()
    rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb())
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue: () => '8' })
  })

  afterEach(() => {
    rafSpy.mockRestore()
    jest.restoreAllMocks()
  })

  test('early return when required refs are null', () => {
    const { layoutRefs } = setup({ refs: { main: null, top: null, bottom: null } })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).not.toHaveBeenCalled()
  })

  test.each([
    ['fits on one line', 900, 900, false],
    ['is a pixel over from rounding', 901, 900, false],
    ['no longer fits on one line', 960, 900, true]
  ])('sets the top row wrapped class when the row %s', (_name, scrollWidth, clientWidth, isWrapped) => {
    const { layoutRefs } = setup({ refs: { top: { scrollWidth, clientWidth } } })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.topRef.current.classList.contains('im-o-app__top--wrapped')).toBe(isWrapped)
  })

  test('measures the top row without the wrapped class, so it can go back to one line', () => {
    const { layoutRefs } = setup()
    const top = layoutRefs.topRef.current
    top.classList.add('im-o-app__top--wrapped')
    const isWrappedWhenMeasured = jest.fn(() => top.classList.contains('im-o-app__top--wrapped'))
    Object.defineProperty(top, 'scrollWidth', { get: () => { isWrappedWhenMeasured(); return 0 } })
    renderHook(() => useLayoutMeasurements())
    expect(isWrappedWhenMeasured).toHaveReturnedWith(false)
    expect(top.classList.contains('im-o-app__top--wrapped')).toBe(false)
  })

  test('treats a top column whose children are all hidden as empty, ignoring its trailing padding', () => {
    const { layoutRefs } = setup({ refs: { topRightCol: { offsetHeight: 10 }, top: { offsetTop: 15 } } })
    // jsdom gives every element empty client rects, i.e. the same as display:none
    appendChild(layoutRefs.topRightColRef.current)
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--right-offset-top', '15px')
  })

  test('counts a control wrapper as rendered when anything inside it is', () => {
    const { layoutRefs } = setup({ refs: { topRightCol: { offsetHeight: 50 }, top: { offsetTop: 15 } } })
    const wrapper = document.createElement('div')
    wrapper.className = 'im-c-control-wrapper'
    layoutRefs.topRightColRef.current.appendChild(wrapper)
    appendChild(wrapper, { getClientRects: () => [{}] })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--right-offset-top', '65px')
  })

  test('treats a control wrapper with nothing rendered inside as hidden', () => {
    const { layoutRefs } = setup({ refs: { topRightCol: { offsetHeight: 10 }, top: { offsetTop: 15 } } })
    const wrapper = document.createElement('div')
    wrapper.className = 'im-c-control-wrapper'
    layoutRefs.topRightColRef.current.appendChild(wrapper)
    appendChild(wrapper)
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--right-offset-top', '15px')
  })

  test('treats a hidden wrapper as hidden, whatever is inside it', () => {
    const { layoutRefs } = setup({ refs: { topRightCol: { offsetHeight: 10 }, top: { offsetTop: 15 } } })
    const wrapper = document.createElement('div')
    wrapper.className = 'im-c-control-wrapper'
    wrapper.hidden = true
    layoutRefs.topRightColRef.current.appendChild(wrapper)
    appendChild(wrapper, { getClientRects: () => [{}] })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--right-offset-top', '15px')
  })

  test('measures a top column normally when any child is rendered', () => {
    const { layoutRefs } = setup({ refs: { topRightCol: { offsetHeight: 50 }, top: { offsetTop: 15 } } })
    appendChild(layoutRefs.topRightColRef.current)
    appendChild(layoutRefs.topRightColRef.current, { getClientRects: () => [{}] })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--right-offset-top', '65px')
  })

  // By default the left column runs from 60 (50 + 10) to main's bottom padding (500 - 400 - 0 = 100),
  // as nothing shows on its side of the bottom row. The right column runs from 50 (40 + 10) to a gap
  // above the attributions at 400 (500 - 400 + 8 = 108)
  test.each([
    ['--left-offset-top', '60px'],
    ['--left-offset-bottom', '100px'],
    ['--right-offset-top', '50px'],
    ['--right-offset-bottom', '108px']
  ])('ends each side column above its own side of the bottom row: %s', (name, expected) => {
    const { layoutRefs } = setup()
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith(name, expected)
  })

  test('ends the left column above the bottom-left column, and the right above the bottom-right buttons', () => {
    const { layoutRefs } = setup({
      refs: {
        bottom: { offsetTop: 250, offsetHeight: 150 },
        bottomLeftCol: { offsetHeight: 40, rect: { top: 360 } },
        bottomRight: { offsetHeight: 120, rect: { top: 260 } },
        attributions: { offsetHeight: 0 }
      }
    })
    renderHook(() => useLayoutMeasurements())
    const spy = layoutRefs.appContainerRef.current.style.setProperty
    expect(spy).toHaveBeenCalledWith('--left-offset-bottom', '148px') // 500 - 360 + 8
    expect(spy).toHaveBeenCalledWith('--right-offset-bottom', '248px') // 500 - 260 + 8
  })

  test('ends the right column above the bottom-right buttons themselves when the logo is taller', () => {
    // The bottom-right slot is nested in a positioned column, so it's measured from the page
    const { layoutRefs } = setup({
      refs: {
        bottomLeftCol: { offsetHeight: 60, rect: { top: 420 } },
        bottomRight: { offsetHeight: 40, rect: { top: 440 } },
        attributions: { offsetHeight: 0 }
      }
    })
    renderHook(() => useLayoutMeasurements())
    const spy = layoutRefs.appContainerRef.current.style.setProperty
    expect(spy).toHaveBeenCalledWith('--left-offset-bottom', '88px') // 500 - 420 + 8
    expect(spy).toHaveBeenCalledWith('--right-offset-bottom', '68px') // 500 - 440 + 8
  })

  // The bottom-right column the attributions dock beside, 115 in from the row's left
  const bottomRightCol = { offsetWidth: 192, rect: { left: 115 } }

  test('ends the left column above stacked attributions, which run the full width', () => {
    const { layoutRefs } = setup({ refs: { bottomRightCol } })
    appendChild(layoutRefs.attributionsRef.current, { scrollWidth: 250 }) // too wide to fit beside the logo
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--left-offset-bottom', '108px') // 500 - 400 + 8
  })

  // With a bottom-left column at the row's top (400), the left column runs from 60 to a gap above it:
  // offset bottom 500 - 400 + 8 = 108
  const actionsBar = (layoutRefs, props) => {
    const bar = appendChild(layoutRefs.actionsRef.current, props)
    bar.className = 'im-c-actions'
  }

  // Without the bar the left column ends 108 above main's bottom (500), at 392. Items reach down
  // to there unless a test says otherwise
  const slotItem = (slotRef, rect) => appendChild(slotRef.current, { getClientRects: () => [{}], rect: { bottom: 392, ...rect } })

  const bar = { offsetHeight: 60, rect: { top: 380, left: 300, right: 500 } }

  test.each([
    ['bottom sub-slot in line with the bar raises the column', 'leftBottom', { left: 8, right: 320 }, bar, '128px', 'none'], // 500 - 380 + 8
    ['top sub-slot in line with the bar is capped, column stays put', 'leftTop', { left: 8, right: 320 }, bar, '108px', '312px'], // bar top 380 - 8 - offset top 60
    ['sub-slot clear of the bar moves nothing', 'leftBottom', { left: 8, right: 250 }, bar, '108px', 'none'],
    ['sub-slot within the divider gap of the bar raises the column', 'leftBottom', { left: 8, right: 293 }, bar, '128px', 'none'], // 293 + 8 > bar left 300
    ['empty bar moves nothing', 'leftBottom', { left: 8, right: 320 }, { ...bar, offsetHeight: 0 }, '108px', 'none'],
    ['bar below the bottom row keeps the row clearance', 'leftBottom', { left: 8, right: 320 }, { ...bar, rect: { ...bar.rect, top: 420 } }, '108px', 'none']
  ])('%s', (_name, slot, itemRect, barProps, offsetBottom, topSlotMaxHeight) => {
    const { layoutRefs } = setup({ refs: { main: { rect: { bottom: 500 } }, bottomLeftCol: { offsetHeight: 10, rect: { top: 400 } } } })
    actionsBar(layoutRefs, barProps)
    slotItem(layoutRefs[`${slot}Ref`], itemRect)
    renderHook(() => useLayoutMeasurements())
    const spy = layoutRefs.appContainerRef.current.style.setProperty
    expect(spy).toHaveBeenCalledWith('--left-offset-bottom', offsetBottom)
    expect(spy).toHaveBeenCalledWith('--left-top-slot-max-height', topSlotMaxHeight)
  })

  test('leaves the column when a bottom sub-slot item in line with the bar ends above it', () => {
    const { layoutRefs } = setup({ refs: { main: { rect: { bottom: 500 } }, bottomLeftCol: { offsetHeight: 10, rect: { top: 400 } } } })
    actionsBar(layoutRefs, bar)
    slotItem(layoutRefs.leftBottomRef, { left: 8, right: 320, bottom: 300 }) // 300 < bar top 380 - 8
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--left-offset-bottom', '108px')
    expect(layoutRefs.appContainerRef.current.style.setProperty).not.toHaveBeenCalledWith('--left-offset-bottom', '128px')
  })

  test('doesn\'t cap a top sub-slot whose wide item ends above the bar and whose long item is beside it', () => {
    const { layoutRefs } = setup({ refs: { main: { rect: { bottom: 500 } }, bottomLeftCol: { offsetHeight: 10, rect: { top: 400 } } } })
    actionsBar(layoutRefs, bar)
    slotItem(layoutRefs.leftTopRef, { left: 8, right: 320, bottom: 300 })
    slotItem(layoutRefs.leftTopRef, { left: 8, right: 250, bottom: 392 })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--left-top-slot-max-height', 'none')
    expect(layoutRefs.appContainerRef.current.style.setProperty).not.toHaveBeenCalledWith('--left-top-slot-max-height', '312px')
  })

  test('measures the side columns without the bar\'s lift or cap, then sets them', () => {
    const { layoutRefs } = setup({ refs: { main: { rect: { bottom: 500 } }, bottomLeftCol: { offsetHeight: 10, rect: { top: 400 } } } })
    actionsBar(layoutRefs, bar)
    slotItem(layoutRefs.leftTopRef, { left: 8, right: 320 })
    slotItem(layoutRefs.leftBottomRef, { left: 8, right: 320 })
    renderHook(() => useLayoutMeasurements())
    const calls = (name) => layoutRefs.appContainerRef.current.style.setProperty.mock.calls.filter(([prop]) => prop === name).map(([, value]) => value)
    expect(calls('--left-offset-bottom')).toEqual(['108px', '128px'])
    expect(calls('--left-top-slot-max-height')).toEqual(['none', '312px'])
  })

  test('looks through control wrappers for what a sub-slot renders', () => {
    const { layoutRefs } = setup({ refs: { main: { rect: { bottom: 500 } }, bottomLeftCol: { offsetHeight: 10, rect: { top: 400 } } } })
    actionsBar(layoutRefs, bar)
    const wrapper = appendChild(layoutRefs.rightBottomRef.current)
    wrapper.className = 'im-c-control-wrapper'
    appendChild(wrapper, { getClientRects: () => [{}], rect: { left: 400, right: 760, bottom: 392 } })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--right-offset-bottom', '128px')
  })

  test.each([
    ['with the hidden attribute', { getClientRects: () => [{}], hidden: true }],
    // jsdom gives every element empty client rects, i.e. the same as display:none
    ['with display: none', {}]
  ])('ignores sub-slot items %s when checking the actions bar', (_name, props) => {
    const { layoutRefs } = setup({ refs: { main: { rect: { bottom: 500 } }, bottomLeftCol: { offsetHeight: 10, rect: { top: 400 } } } })
    actionsBar(layoutRefs, bar)
    appendChild(layoutRefs.rightTopRef.current, { rect: { left: 400, right: 760 }, ...props })
    appendChild(layoutRefs.rightBottomRef.current, { rect: { left: 400, right: 760 }, ...props })
    renderHook(() => useLayoutMeasurements())
    const spy = layoutRefs.appContainerRef.current.style.setProperty
    expect(spy).toHaveBeenCalledWith('--right-offset-bottom', '108px') // a gap above the attributions at 400
    expect(spy).toHaveBeenCalledWith('--right-top-slot-max-height', 'none')
  })

  test.each([
    ['both sub-slots render', true, true, '8px'],
    ['only the top sub-slot renders', true, false, '0px'],
    ['only the bottom sub-slot renders', false, true, '0px']
  ])('sets the sub-slot gap when %s', (_name, isTopRendered, isBottomRendered, expected) => {
    const { layoutRefs } = setup()
    // jsdom gives every element empty client rects, i.e. the same as display:none
    appendChild(layoutRefs.rightTopRef.current, isTopRendered ? { getClientRects: () => [{}] } : {})
    appendChild(layoutRefs.rightBottomRef.current, isBottomRendered ? { getClientRects: () => [{}] } : {})
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--right-slot-gap', expected)
  })

  test('copes with missing sub-slot and drawer elements', () => {
    const { layoutRefs } = setup()
    layoutRefs.leftTopRef.current = null
    layoutRefs.leftBottomRef.current = null
    layoutRefs.rightTopRef.current = null
    layoutRefs.rightBottomRef.current = null
    layoutRefs.drawerRef.current = null
    renderHook(() => useLayoutMeasurements())
    const spy = layoutRefs.appContainerRef.current.style.setProperty
    expect(spy).toHaveBeenCalledWith('--right-slot-gap', '0px')
    expect(spy).toHaveBeenCalledWith('--left-top-slot-max-height', 'none')
    expect(spy).toHaveBeenCalledWith('--drawer-max-height', 'none')
  })

  // Default column heights: left 340, right 342, both empty
  test.each([
    ['grows into the spare room left in the tighter side column', {}, '440px'], // 100 + 340
    ['stops short of the side column buttons', { rightBottom: { offsetHeight: 300 } }, '142px'], // 100 + (342 - 300)
    ['shrinks when the side column buttons no longer fit', { rightBottom: { offsetHeight: 400 } }, '42px'], // 100 + (342 - 400)
    ['shrinks by what runs past the bottom of main', { main: { rect: { bottom: 500 } }, actions: { offsetTop: 450, rect: { bottom: 540 } }, rightBottom: { offsetHeight: 300 } }, '102px'] // 142 - 40
  ])('drawer max height %s', (_name, refOverrides, expected) => {
    const { layoutRefs } = setup({ refs: { drawer: { offsetHeight: 100 }, ...refOverrides } })
    appendChild(layoutRefs.drawerRef.current, { getClientRects: () => [{}] })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--drawer-max-height', expected)
  })

  test('drawer has no max height when nothing in it renders', () => {
    const { layoutRefs } = setup({ refs: { drawer: { offsetHeight: 0 } } })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--drawer-max-height', 'none')
  })

  test('calculates the right column\'s top below the top row', () => {
    const { layoutRefs } = setup({ refs: { topRightCol: { offsetHeight: 80 }, top: { offsetTop: 15 } } })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--right-offset-top', '95px')
  })

  test.each([
    [
      'no actions (height 0) — sits above the attributions, ignoring the bottom-right slot',
      { main: { offsetHeight: 500 }, bottom: { offsetTop: 300, offsetHeight: 192 }, attributions: { offsetHeight: 16, rect: { top: 476 } }, actions: { offsetTop: 450, offsetHeight: 0 } },
      '32px' // attributions top 476; 500 - 476 + dividerGap (8) = 32
    ],
    [
      'a logo or bottom-left buttons — sits above the bottom-left column when it is higher than the attributions',
      { main: { offsetHeight: 500 }, bottom: { offsetTop: 300, offsetHeight: 192 }, bottomLeftCol: { offsetHeight: 40, rect: { top: 452 } }, attributions: { offsetHeight: 16, rect: { top: 476 } }, actions: { offsetTop: 450, offsetHeight: 0 } },
      '56px' // bottom-left column top 452; 500 - 452 + dividerGap (8) = 56
    ],
    [
      'actions floating above the row (tablet/desktop) — uses actionsOffset + dividerGap',
      { main: { offsetHeight: 500 }, bottom: { offsetTop: 440, offsetHeight: 52 }, attributions: { offsetHeight: 16, rect: { top: 476 } }, actions: { offsetTop: 408, offsetHeight: 60 } },
      '100px' // actionsOffset = 500 - 408 = 92, 92 + 8 = 100 > attributions (24) + 8
    ],
    [
      'drawer and actions below the row (mobile in-flow) — clears what is below the row',
      { main: { offsetHeight: 500 }, bottom: { offsetTop: 300, offsetHeight: 50 }, attributions: { offsetHeight: 0 }, actions: { offsetTop: 430, offsetHeight: 40 } },
      '158px' // nothing shown in the row, so its bottom: 500 - 350 = 150, + dividerGap (8) = 158 > actionsOffset (70) + 8
    ]
  ])('calculates --hint-bottom for %s', (_, refOverrides, expected) => {
    const { layoutRefs } = setup({ refs: refOverrides })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--hint-bottom', expected)
  })

  test('calculates --hint-bottom when actionsRef.current is null', () => {
    const { layoutRefs } = setup()
    layoutRefs.actionsRef.current = null
    renderHook(() => useLayoutMeasurements())
    // No actions: attributions top 400; 500 - 400 + dividerGap (8) = 108
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--hint-bottom', '108px')
  })

  test('clears inline banner panel widths on mobile', () => {
    const { layoutRefs } = setup({ app: { breakpoint: 'mobile' } })
    const panel = document.createElement('div')
    panel.className = 'im-c-panel--banner'
    panel.style.width = '250px'
    layoutRefs.bannerRef.current.appendChild(panel)
    renderHook(() => useLayoutMeasurements())
    expect(panel.style.width).toBe('')
  })

  test('uses widest parseable banner panel width, ignoring unparseable ones', () => {
    const { layoutRefs } = setup()
    const banner = layoutRefs.bannerRef.current
    const panel = (width) => {
      const p = document.createElement('div')
      p.className = 'im-c-panel--banner'
      p.style.width = width
      return p
    }
    banner.appendChild(panel('250px'))
    banner.appendChild(panel('auto')) // unparseable, filtered out
    banner.appendChild(panel('400px'))
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--banner-preferred-width', '400px')
  })

  test('falls back to default preferred width when banner element is absent', () => {
    const { layoutRefs } = setup()
    layoutRefs.bannerRef.current = null
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--banner-preferred-width', '8px')
  })

  test('docks the banner when the gutter is wide enough for the preferred width', () => {
    const { layoutRefs } = setup({ refs: { top: { offsetWidth: 1000 } } })
    renderHook(() => useLayoutMeasurements())
    // docked: primaryGap (8) + sideColWidth (0) + dividerGap (8)
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--banner-left', '16px')
  })

  test('treats a null leftRef current as 0 width in the banner gutter calc', () => {
    const { layoutRefs } = setup({ refs: { top: { offsetWidth: 1000 }, right: { offsetWidth: 20 } } })
    layoutRefs.leftRef.current = null
    renderHook(() => useLayoutMeasurements())
    // symmetricWidth(0, 20) = 20; docked: primaryGap (8) + sideColWidth (20) + dividerGap (8)
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--banner-left', '36px')
  })

  test('stacks a present banner below the top row when not docked', () => {
    const { layoutRefs } = setup({ refs: { banner: { offsetHeight: 30 } } })
    renderHook(() => useLayoutMeasurements())
    // bannerTop = top.offsetTop (10) + top.offsetHeight (0)
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--banner-top', '10px')
    // stacked: left column pushed below the banner (bannerTop 10 + bannerHeight 30 + dividerGap 8)
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--left-offset-top', '48px')
  })

  test('keeps attributions docked beside the logo when the natural text width fits', () => {
    const { layoutRefs } = setup({ refs: { bottom: { rect: { left: 0 } }, bottomRightCol } })
    appendChild(layoutRefs.attributionsRef.current, { scrollWidth: 150 }) // attribution text, fits
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.attributionsRef.current.classList.contains('im-o-app__attributions--stacked')).toBe(false)
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--attributions-left', '115px')
    // docked: attributions.offsetHeight (16) + dividerGap (8) - primaryGap (8) = 16 — the
    // bled attribution creeps 16px back up into the row, so bottom-right needs pushing clear
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--bottom-right-clearance', '16px')
  })

  test('stacks attributions onto their own row when the text is wider than the space beside the logo', () => {
    const { layoutRefs } = setup({ refs: { bottom: { rect: { left: 0 } }, bottomRightCol } })
    appendChild(layoutRefs.attributionsRef.current, { scrollWidth: 250 }) // attribution text, too wide to fit
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.attributionsRef.current.classList.contains('im-o-app__attributions--stacked')).toBe(true)
    // stacked is lifted by its own extra flex line, not a margin, so no clearance is needed here
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--bottom-right-clearance', '0px')
  })

  test('stacks the attributions, and doesn\'t offset them, when there\'s no bottom-right column', () => {
    const { layoutRefs } = setup()
    layoutRefs.bottomRightColRef.current = null
    appendChild(layoutRefs.attributionsRef.current, { scrollWidth: 150 })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.attributionsRef.current.classList.contains('im-o-app__attributions--stacked')).toBe(true)
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--attributions-left', '0px')
  })

  test('never gives bottom-right negative clearance when attributions is shorter than the bleed', () => {
    const { layoutRefs } = setup({ refs: { bottom: { rect: { left: 0 } }, bottomRightCol, attributions: { offsetHeight: 0 } } })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--bottom-right-clearance', '0px')
  })

  test('dispatches safe zone inset on desktop (post-batch RAF read only)', () => {
    const { dispatch, layoutRefs } = setup({ app: { breakpoint: 'desktop' } })
    getSafeZoneInset.mockReturnValue({ top: 10, right: 5, bottom: 15, left: 5 })
    renderHook(() => useLayoutMeasurements())
    expect(getSafeZoneInset).toHaveBeenCalledWith(layoutRefs)
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SAFE_ZONE_INSET', payload: { safeZoneInset: { top: 10, right: 5, bottom: 15, left: 5 } } })
  })

  test('dispatches safe zone inset on mobile', () => {
    const { dispatch } = setup({ app: { breakpoint: 'mobile' } })
    getSafeZoneInset.mockReturnValue({ top: 10, right: 5, bottom: 40, left: 5 })
    renderHook(() => useLayoutMeasurements())
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_SAFE_ZONE_INSET',
      payload: { safeZoneInset: { top: 10, right: 5, bottom: 40, left: 5 } }
    })
  })

  test('does not dispatch SET_SAFE_ZONE_INSET when getSafeZoneInset returns undefined', () => {
    const { dispatch } = setup()
    getSafeZoneInset.mockReturnValue(undefined)
    renderHook(() => useLayoutMeasurements())
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_SAFE_ZONE_INSET' }))
  })

  test('does not dispatch safe zone when arePluginsEvaluated is false', () => {
    const { dispatch } = setup({ app: { arePluginsEvaluated: false } })
    renderHook(() => useLayoutMeasurements())
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_SAFE_ZONE_INSET' }))
  })

  test('re-dispatches safe zone when arePluginsEvaluated becomes true', () => {
    setup({ app: { arePluginsEvaluated: false } })
    const { rerender } = renderHook(() => useLayoutMeasurements())
    const { dispatch } = setup({ app: { arePluginsEvaluated: true } })
    getSafeZoneInset.mockReturnValue({ top: 5, right: 5, bottom: 60, left: 5 })
    rerender()
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_SAFE_ZONE_INSET',
      payload: { safeZoneInset: { top: 5, right: 5, bottom: 60, left: 5 } }
    })
  })

  test('dispatches CLEAR_PLUGINS_EVALUATED when breakpoint changes', () => {
    setup()
    const { rerender } = renderHook(() => useLayoutMeasurements())
    const { dispatch } = setup({ app: { breakpoint: 'mobile' } })
    dispatch.mockClear()
    rerender()
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_PLUGINS_EVALUATED' })
  })

  test('dispatches CLEAR_PLUGINS_EVALUATED when isMapReady changes', () => {
    setup()
    const { rerender } = renderHook(() => useLayoutMeasurements())
    const { dispatch } = setup({ map: { isMapReady: false } })
    dispatch.mockClear()
    rerender()
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_PLUGINS_EVALUATED' })
  })

  test('dispatches CLEAR_PLUGINS_EVALUATED when isFullscreen changes', () => {
    setup({ app: { isFullscreen: false } })
    const { rerender } = renderHook(() => useLayoutMeasurements())
    const { dispatch } = setup({ app: { isFullscreen: true } })
    dispatch.mockClear()
    rerender()
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_PLUGINS_EVALUATED' })
  })

  test('dispatches CLEAR_PLUGINS_EVALUATED when appVisible changes', () => {
    setup({ app: { appVisible: false } })
    const { rerender } = renderHook(() => useLayoutMeasurements())
    const { dispatch } = setup({ app: { appVisible: true } })
    dispatch.mockClear()
    rerender()
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_PLUGINS_EVALUATED' })
  })

  test('recalculates layout when arePluginsEvaluated becomes true', () => {
    setup({ app: { arePluginsEvaluated: false } })
    const { rerender } = renderHook(() => useLayoutMeasurements())
    const { layoutRefs } = setup({ app: { arePluginsEvaluated: true } })
    layoutRefs.appContainerRef.current.style.setProperty.mockClear()
    rerender()
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalled()
  })

  test('sets up resize observer', () => {
    const { layoutRefs } = setup()
    renderHook(() => useLayoutMeasurements())
    expect(useResizeObserver).toHaveBeenCalledWith(
      [layoutRefs.bannerRef, layoutRefs.mainRef, layoutRefs.headerRef, layoutRefs.topRef, layoutRefs.topLeftColRef, layoutRefs.topMiddleColRef, layoutRefs.topRightColRef, layoutRefs.actionsRef, layoutRefs.bottomRef, layoutRefs.bottomLeftColRef, layoutRefs.bottomRightRef, layoutRefs.attributionsRef, layoutRefs.leftTopRef, layoutRefs.leftBottomRef, layoutRefs.rightTopRef, layoutRefs.rightBottomRef, layoutRefs.drawerRef, layoutRefs.leftRef, layoutRefs.rightRef],
      expect.any(Function)
    )
    layoutRefs.appContainerRef.current.style.setProperty.mockClear()
    useResizeObserver.mock.calls[0][1]()
    expect(rafSpy).toHaveBeenCalled()
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalled()
  })

  test('resize observer does not dispatch safe zone (safe zone is Effect 3 only)', () => {
    const { dispatch } = setup()
    renderHook(() => useLayoutMeasurements())
    dispatch.mockClear()
    useResizeObserver.mock.calls[0][1]()
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_SAFE_ZONE_INSET' }))
  })

  test('resize observer handles null mainRef without throwing', () => {
    const { layoutRefs } = setup()
    renderHook(() => useLayoutMeasurements())
    layoutRefs.mainRef.current = null
    expect(() => useResizeObserver.mock.calls[0][1]()).not.toThrow()
  })
})
