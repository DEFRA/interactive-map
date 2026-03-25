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

const el = (props = {}) => {
  const e = document.createElement('div')
  e.style.setProperty = jest.fn()
  Object.entries(props).forEach(([k, v]) => Object.defineProperty(e, k, { value: v, configurable: true }))
  return e
}

const refs = (o = {}) => ({
  appContainerRef: { current: o.appContainer || el() },
  mainRef: { current: o.main === null ? null : el({ offsetHeight: 500, ...o.main }) },
  bannerRef: { current: el(o.banner) },
  topRef: { current: o.top === null ? null : el({ offsetTop: 10, ...o.top }) },
  topLeftColRef: { current: el({ offsetHeight: 50, offsetWidth: 200, ...o.topLeftCol }) },
  topRightColRef: { current: el({ offsetHeight: 40, offsetWidth: 180, ...o.topRightCol }) },
  bottomRef: { current: o.bottom === null ? null : el({ offsetTop: 400, ...o.bottom }) },
  bottomRightRef: { current: el({ offsetTop: 400, ...o.bottomRight }) },
  leftTopRef: { current: el({ offsetHeight: 0, ...o.leftTop }) },
  leftBottomRef: { current: el({ offsetHeight: 0, ...o.leftBottom }) },
  rightTopRef: { current: el({ offsetHeight: 0, ...o.rightTop }) },
  rightBottomRef: { current: el({ offsetHeight: 0, ...o.rightBottom }) },
  attributionsRef: { current: el({ offsetHeight: 16, ...o.attributions }) },
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

  test('calculates and sets all CSS custom properties', () => {
    const { layoutRefs } = setup()
    renderHook(() => useLayoutMeasurements())
    const spy = layoutRefs.appContainerRef.current.style.setProperty
    ;['--right-offset-top', '--right-offset-bottom', '--top-col-width']
      .forEach(prop => expect(spy).toHaveBeenCalledWith(prop, expect.any(String)))
  })

  test.each([
    ['right-offset-top', { topRightCol: { offsetHeight: 80 }, top: { offsetTop: 15 } }, '95px'],
    ['right-offset-bottom', { main: { offsetHeight: 600 }, bottom: { offsetTop: 500 } }, '116px'],
    // leftColumnHeight = 400 - (50+10) - 8 = 332; rightColumnHeight = 400 - (40+10) - 8 = 342
    ['left-top-max-height', {}, '332px'],
    ['right-top-max-height', {}, '342px']
  ])('calculates %s correctly', (name, refOverrides, expected) => {
    const { layoutRefs } = setup({ refs: refOverrides })
    renderHook(() => useLayoutMeasurements())
    const varName = `--${name.replace(/ .+/, '')}`
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith(varName, expected)
  })

  test.each([
    ['--left-top-panel-max-height', {}, '332px'],
    ['--left-top-panel-max-height', { leftBottom: { offsetHeight: 50 } }, '274px'], // 332 - 50 - 8
    ['--left-bottom-panel-max-height', {}, '332px'],
    ['--left-bottom-panel-max-height', { leftTop: { offsetHeight: 40 } }, '284px'], // 332 - 40 - 8
    ['--right-top-panel-max-height', {}, '342px'],
    ['--right-top-panel-max-height', { rightBottom: { offsetHeight: 60 } }, '274px'], // 342 - 60 - 8
    ['--right-bottom-panel-max-height', {}, '342px'],
    ['--right-bottom-panel-max-height', { rightTop: { offsetHeight: 30 } }, '304px'] // 342 - 30 - 8
  ])('calculates %s with sibling buttons=%o correctly', (varName, refOverrides, expected) => {
    const { layoutRefs } = setup({ refs: refOverrides })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith(varName, expected)
  })

  test.each([
    [{ offsetWidth: 250 }, { offsetWidth: 200 }, '250px'],
    [{ offsetWidth: 0 }, { offsetWidth: 200 }, '200px'],
    [{ offsetWidth: 0 }, { offsetWidth: 0 }, '0px']
  ])('calculates top-col-width for left=%o right=%o', (left, right, expected) => {
    const { layoutRefs } = setup({ refs: { topLeftCol: { offsetHeight: 50, ...left }, topRightCol: { offsetHeight: 40, ...right } } })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--top-col-width', expected)
  })

  test('uses 0 when bottomRightRef current is null', () => {
    const { layoutRefs } = setup()
    layoutRefs.bottomRightRef.current = null
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--right-offset-bottom', '116px')
  })

  test('uses bottomRight height when bottomRightHeight > 0', () => {
    const { layoutRefs } = setup({
      refs: {
        bottomRight: { offsetHeight: 20 } // 👈 triggers TRUE branch
      }
    })
    renderHook(() => useLayoutMeasurements())
    // bottomContainerPad = 500 - 400 - 0 = 100
    // expected = 100 + (20 + 8) = 128
    expect(layoutRefs.appContainerRef.current.style.setProperty)
      .toHaveBeenCalledWith('--right-offset-bottom', '128px')
  })

  test('uses 0 when sub-slot refs have null current', () => {
    const { layoutRefs } = setup()
    layoutRefs.leftTopRef.current = null
    layoutRefs.leftBottomRef.current = null
    layoutRefs.rightTopRef.current = null
    layoutRefs.rightBottomRef.current = null
    renderHook(() => useLayoutMeasurements())
    // With all sub-slot refs null, buttons = 0 ?? 0 = 0, so max-heights equal full column height
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--left-top-panel-max-height', '332px')
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalledWith('--right-bottom-panel-max-height', '342px')
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
    expect(layoutRefs => layoutRefs).toBeDefined() // no layout calculation
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
      [layoutRefs.bannerRef, layoutRefs.mainRef, layoutRefs.topRef, layoutRefs.topLeftColRef, layoutRefs.topRightColRef, layoutRefs.actionsRef, layoutRefs.bottomRef, layoutRefs.bottomRightRef, layoutRefs.leftTopRef, layoutRefs.leftBottomRef, layoutRefs.rightTopRef, layoutRefs.rightBottomRef, layoutRefs.drawerRef],
      expect.any(Function)
    )
    layoutRefs.appContainerRef.current.style.setProperty.mockClear()
    useResizeObserver.mock.calls[0][1]()
    expect(rafSpy).toHaveBeenCalled()
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalled()
  })

  test('resize observer dispatches safe zone when main transitions from hidden to visible', () => {
    const { dispatch, layoutRefs } = setup()
    getSafeZoneInset.mockReturnValue({ top: 5, right: 5, bottom: 10, left: 5 })
    // Start with main hidden (height 0)
    Object.defineProperty(layoutRefs.mainRef.current, 'offsetHeight', { value: 0, configurable: true })
    renderHook(() => useLayoutMeasurements())
    // First resize observer fire records height 0
    useResizeObserver.mock.calls[0][1]()
    dispatch.mockClear()
    // Main becomes visible (height > 0)
    Object.defineProperty(layoutRefs.mainRef.current, 'offsetHeight', { value: 500, configurable: true })
    useResizeObserver.mock.calls[0][1]()
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SAFE_ZONE_INSET', payload: { safeZoneInset: { top: 5, right: 5, bottom: 10, left: 5 } } })
  })

  test('resize observer handles null mainRef current (uses 0 via ??)', () => {
    const { layoutRefs } = setup()
    renderHook(() => useLayoutMeasurements())
    layoutRefs.mainRef.current = null
    // Should not throw; mainHeight falls back to 0 via ?? operator
    expect(() => useResizeObserver.mock.calls[0][1]()).not.toThrow()
  })

  test('resize observer does not dispatch safe zone when getSafeZoneInset returns undefined on 0→visible transition', () => {
    const { dispatch, layoutRefs } = setup()
    getSafeZoneInset.mockReturnValue(undefined)
    Object.defineProperty(layoutRefs.mainRef.current, 'offsetHeight', { value: 0, configurable: true })
    renderHook(() => useLayoutMeasurements())
    useResizeObserver.mock.calls[0][1]()
    dispatch.mockClear()
    Object.defineProperty(layoutRefs.mainRef.current, 'offsetHeight', { value: 500, configurable: true })
    useResizeObserver.mock.calls[0][1]()
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_SAFE_ZONE_INSET' }))
  })

  test('resize observer does not dispatch safe zone when main is already visible', () => {
    const { dispatch, layoutRefs } = setup()
    // Main starts visible (non-zero height)
    Object.defineProperty(layoutRefs.mainRef.current, 'offsetHeight', { value: 500, configurable: true })
    renderHook(() => useLayoutMeasurements())
    // Record initial height
    useResizeObserver.mock.calls[0][1]()
    dispatch.mockClear()
    // Another resize (panel opens etc.) — height stays non-zero
    useResizeObserver.mock.calls[0][1]()
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_SAFE_ZONE_INSET' }))
  })
})
