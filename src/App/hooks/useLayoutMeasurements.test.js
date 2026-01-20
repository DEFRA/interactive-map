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
  insetRef: { current: o.inset === null ? null : el({ offsetHeight: 100, offsetLeft: 20, offsetWidth: 300, ...o.inset }) },
  footerRef: { current: o.footer === null ? null : el({ offsetTop: 400, ...o.footer }) },
  actionsRef: { current: el({ offsetTop: 450, ...o.actions }) }
})

const setup = (o = {}) => {
  const dispatch = jest.fn()
  const layoutRefs = refs(o.refs)
  useApp.mockReturnValue({ dispatch, breakpoint: 'desktop', layoutRefs, ...o.app })
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
    const { layoutRefs } = setup({ refs: { main: null, top: null, inset: null, footer: null } })
    renderHook(() => useLayoutMeasurements())
    expect(layoutRefs.appContainerRef.current.style.setProperty).not.toHaveBeenCalled()
  })

  test('calculates and sets all CSS custom properties', () => {
    const { layoutRefs } = setup()
    renderHook(() => useLayoutMeasurements())
    const spy = layoutRefs.appContainerRef.current.style.setProperty
    ;['--inset-offset-top', '--inset-max-height', '--offset-left', '--right-offset-top', '--right-offset-bottom', '--top-col-width']
      .forEach(prop => expect(spy).toHaveBeenCalledWith(prop, expect.any(String)))
  })

  test.each([
    ['inset-offset-top', { main: { offsetHeight: 500 }, top: { offsetTop: 20 }, topLeftCol: { offsetHeight: 50 } }, '70px'],
    ['inset-max-height', { main: { offsetHeight: 500 }, top: { offsetTop: 20 }, topLeftCol: { offsetHeight: 50 } }, '410px'],
    ['offset-left with overlap', { inset: { offsetHeight: 200, offsetLeft: 30, offsetWidth: 150 }, footer: { offsetTop: 100 }, actions: { offsetTop: 120 }, topLeftCol: { offsetHeight: 50 }, top: { offsetTop: 10 } }, '180px'],
    ['offset-left without overlap', { inset: { offsetHeight: 50, offsetLeft: 30, offsetWidth: 150 }, footer: { offsetTop: 200 }, actions: { offsetTop: 220 }, topLeftCol: { offsetHeight: 50 }, top: { offsetTop: 10 } }, '0px'],
    ['right-offset-top', { topRightCol: { offsetHeight: 80 }, top: { offsetTop: 15 } }, '95px'],
    ['right-offset-bottom', { main: { offsetHeight: 600 }, footer: { offsetTop: 500 } }, '108px']
  ])('calculates %s correctly', (name, refOverrides, expected) => {
    const { layoutRefs } = setup({ refs: refOverrides })
    renderHook(() => useLayoutMeasurements())
    const varName = `--${name.replace(/ .+/, '')}`
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

  test('dispatches safe zone inset', () => {
    const { dispatch, layoutRefs } = setup()
    getSafeZoneInset.mockReturnValue({ top: 10, right: 5, bottom: 15, left: 5 })
    renderHook(() => useLayoutMeasurements())
    expect(getSafeZoneInset).toHaveBeenCalledWith(layoutRefs)
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SAFE_ZONE_INSET', payload: { safeZoneInset: { top: 10, right: 5, bottom: 15, left: 5 } } })
  })

  test('recalculates on dependency changes', () => {
    setup()
    const { rerender } = renderHook(() => useLayoutMeasurements())
    ;[{ app: { breakpoint: 'mobile' } }, { map: { mapSize: { width: 1000, height: 800 } } }, { map: { isMapReady: false } }]
      .forEach(change => {
        const { layoutRefs } = setup(change)
        layoutRefs.appContainerRef.current.style.setProperty.mockClear()
        rerender()
        expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalled()
      })
  })

  test('sets up resize observer', () => {
    const { layoutRefs } = setup()
    renderHook(() => useLayoutMeasurements())
    expect(useResizeObserver).toHaveBeenCalledWith(
      [layoutRefs.bannerRef, layoutRefs.mainRef, layoutRefs.topRef, layoutRefs.actionsRef, layoutRefs.footerRef],
      expect.any(Function)
    )
    layoutRefs.appContainerRef.current.style.setProperty.mockClear()
    useResizeObserver.mock.calls[0][1]()
    expect(rafSpy).toHaveBeenCalled()
    expect(layoutRefs.appContainerRef.current.style.setProperty).toHaveBeenCalled()
  })
})
