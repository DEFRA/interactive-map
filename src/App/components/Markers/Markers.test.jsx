import { render, act } from '@testing-library/react'
import { Markers } from './Markers.jsx'
import { useMarkers } from '../../hooks/useMarkersAPI.js'
import { useConfig } from '../../store/configContext.js'
import { useMap } from '../../store/mapContext.js'
import { useService } from '../../store/serviceContext.js'

jest.mock('../../hooks/useMarkersAPI.js', () => ({ useMarkers: jest.fn() }))
jest.mock('../../store/configContext.js', () => ({ useConfig: jest.fn() }))
jest.mock('../../store/mapContext.js', () => ({ useMap: jest.fn() }))
jest.mock('../../store/serviceContext.js', () => ({ useService: jest.fn() }))
jest.mock('../../../config/appConfig.js', () => ({ scaleFactor: { small: 1, medium: 1.5, large: 2 } }))

const makeEventBus = () => {
  const listeners = {}
  return {
    on: jest.fn((e, fn) => { listeners[e] = fn }),
    off: jest.fn(),
    emit: (e, payload) => listeners[e]?.(payload)
  }
}

const makeSymbolRegistry = (overrides = {}) => ({
  get: jest.fn(() => ({ svg: '<circle/>', viewBox: '0 0 38 38', anchor: [0.5, 1] })),
  getDefaults: jest.fn(() => ({ symbol: 'pin', viewBox: '0 0 38 38', anchor: [0.5, 1] })),
  resolve: jest.fn(() => '<circle/>'),
  resolveSelected: jest.fn(() => '<circle class="selected"/>'),
  ...overrides
})

const makeMarker = (overrides = {}) => ({
  id: 'marker-1', isVisible: true, symbol: 'pin', ...overrides
})

const setup = ({ markers = [], mapSize = 'small', eventBus, symbolRegistry, mapStyle = 'outdoor' } = {}) => {
  const eb = eventBus ?? makeEventBus()
  const sr = symbolRegistry ?? makeSymbolRegistry()
  const markerRefs = new Map()
  useConfig.mockReturnValue({ id: 'test-app' })
  useMap.mockReturnValue({ mapStyle, mapSize })
  useService.mockReturnValue({ symbolRegistry: sr, eventBus: eb })
  useMarkers.mockReturnValue({
    markers: { items: markers, markerRefs },
    markerRef: (id) => (el) => { if (el) markerRefs.set(id, el) }
  })
  return { eb, sr, result: render(<Markers />) }
}

// ─── Markers — basic rendering ────────────────────────────────────────────────

describe('Markers — basic rendering', () => {
  it('renders nothing when mapStyle is not set', () => {
    expect(setup({ mapStyle: null }).result.container.firstChild).toBeNull()
  })

  it('renders nothing when there are no markers', () => {
    expect(setup().result.container.querySelectorAll('svg')).toHaveLength(0)
  })

  it('renders one svg per marker with correct id and classes', () => {
    const { result } = setup({ markers: [makeMarker(), makeMarker({ id: 'b', symbol: undefined })] })
    const [svg1, svg2] = result.container.querySelectorAll('svg')
    expect(svg1.getAttribute('id')).toBe('test-app-marker-marker-1')
    expect(svg1).toHaveClass('im-c-marker', 'im-c-marker--pin')
    expect(svg2).toHaveClass('im-c-marker--pin')
  })

  it.each([
    [true, 'block'],
    [false, 'none']
  ])('display is %s when isVisible=%s', (isVisible, display) => {
    const svg = setup({ markers: [makeMarker({ isVisible })] }).result.container.querySelector('svg')
    expect(svg).toHaveStyle({ display })
  })
})

// ─── Markers — symbol and label rendering ─────────────────────────────────────

describe('Markers — symbol and label rendering', () => {
  it('renders a standalone label div for a marker with symbol: null (lines 44, 200)', () => {
    const marker = makeMarker({ id: 'lbl', label: 'My label', symbol: null, symbolSvgContent: null })
    const { result } = setup({ markers: [marker] })
    const wrapper = result.container.querySelector('.im-c-marker-wrapper--label')
    expect(wrapper).toBeTruthy()
    expect(wrapper.querySelector('.im-c-marker__label--standalone').textContent).toBe('My label')
    expect(result.container.querySelector('svg')).toBeNull()
  })

  it('renders a marker-with-label div when showLabel is true (lines 61, 206)', () => {
    const marker = makeMarker({ label: 'Tooltip', showLabel: true })
    const { result } = setup({ markers: [marker] })
    const wrapper = result.container.querySelector('.im-c-marker-wrapper')
    expect(wrapper).toBeTruthy()
    expect(wrapper.querySelector('.im-c-marker__label').textContent).toBe('Tooltip')
    expect(wrapper.querySelector('svg')).toBeTruthy()
  })

  it('standalone label respects isVisible: false (line 48 false branch)', () => {
    const marker = makeMarker({ id: 'lbl', label: 'hidden', symbol: null, symbolSvgContent: null, isVisible: false })
    const { result } = setup({ markers: [marker] })
    expect(result.container.querySelector('.im-c-marker-wrapper--label')).toHaveStyle({ display: 'none' })
  })

  it('marker-with-label respects isVisible: false (line 70 false branch)', () => {
    const marker = makeMarker({ label: 'Tooltip', showLabel: true, isVisible: false })
    const { result } = setup({ markers: [marker] })
    expect(result.container.querySelector('.im-c-marker-wrapper')).toHaveStyle({ display: 'none' })
  })

  it('renders an svg without label when showLabel is false or absent', () => {
    const { result } = setup({ markers: [makeMarker({ label: 'hidden', showLabel: false })] })
    expect(result.container.querySelector('svg')).toBeTruthy()
    expect(result.container.querySelector('.im-c-marker__label')).toBeNull()
  })

  it('uses inline symbolSvgContent over the symbol registry', () => {
    const sr = makeSymbolRegistry()
    setup({ markers: [makeMarker({ symbolSvgContent: '<rect/>' })], symbolRegistry: sr })
    expect(sr.get).not.toHaveBeenCalled()
  })

  it('falls back to defaults.symbolSvgContent', () => {
    const sr = makeSymbolRegistry({
      getDefaults: jest.fn(() => ({ symbolSvgContent: '<default-svg/>', viewBox: '0 0 38 38', anchor: [0.5, 1] }))
    })
    setup({ markers: [makeMarker({ symbol: undefined })], symbolRegistry: sr })
    expect(sr.get).not.toHaveBeenCalled()
  })

  it('uses marker.viewBox when provided', () => {
    const svg = setup({ markers: [makeMarker({ viewBox: '0 0 50 60' })] }).result.container.querySelector('svg')
    expect(svg.getAttribute('viewBox')).toBe('0 0 50 60')
    expect(svg.getAttribute('width')).toBe('50')
    expect(svg.getAttribute('height')).toBe('60')
  })

  it("falls back to '0 0 38 38' viewBox when none is provided", () => {
    const sr = makeSymbolRegistry({
      get: jest.fn(() => ({ svg: '<circle/>' })),
      getDefaults: jest.fn(() => ({ symbol: 'pin' }))
    })
    expect(setup({ markers: [makeMarker()], symbolRegistry: sr }).result.container.querySelector('svg').getAttribute('viewBox')).toBe('0 0 38 38')
  })

  it.each([
    ['marker.anchor', makeMarker({ anchor: [0, 0] }), null, '0px', '0px'],
    ['symbolDef.anchor', makeMarker(), { get: jest.fn(() => ({ svg: '<circle/>', viewBox: '0 0 38 38', anchor: [0, 0.5] })), getDefaults: jest.fn(() => ({ symbol: 'pin', viewBox: '0 0 38 38' })) }, '0px', '-19px'],
    ['[0.5, 0.5] fallback', makeMarker(), { get: jest.fn(() => ({ svg: '<circle/>', viewBox: '0 0 38 38' })), getDefaults: jest.fn(() => ({ symbol: 'pin', viewBox: '0 0 38 38' })) }, '-19px', '-19px']
  ])('resolveAnchor uses %s', (_, marker, srOverrides, left, top) => {
    const sr = srOverrides ? makeSymbolRegistry(srOverrides) : undefined
    expect(setup({ markers: [marker], symbolRegistry: sr }).result.container.querySelector('svg')).toHaveStyle({ marginLeft: left, marginTop: top })
  })

  it.each([
    ['small', '38', '38'],
    ['medium', '57', '57'],
    ['large', '76', '76'],
    ['huge', '38', '38']
  ])('scales svg dimensions for mapSize=%s', (mapSize, width, height) => {
    const svg = setup({ markers: [makeMarker()], mapSize }).result.container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe(width)
    expect(svg.getAttribute('height')).toBe(height)
  })

  it('scales anchor offsets for medium mapSize', () => {
    expect(setup({ markers: [makeMarker()], mapSize: 'medium' }).result.container.querySelector('svg'))
      .toHaveStyle({ marginLeft: '-28.5px', marginTop: '-57px' })
  })
})

// ─── Markers — selection ──────────────────────────────────────────────────────

describe('Markers — selection', () => {
  it('adds selected class and calls resolveSelected when marker is selected', () => {
    const { eb, sr, result } = setup({ markers: [makeMarker()] })
    act(() => eb.emit('interact:selectionchange', { selectedMarkers: ['marker-1'] }))
    expect(result.container.querySelector('svg')).toHaveClass('im-c-marker--selected')
    expect(sr.resolveSelected).toHaveBeenCalled()
    expect(sr.resolve).not.toHaveBeenCalledAfter?.(sr.resolveSelected)
  })

  it('uses resolve (not resolveSelected) for unselected markers', () => {
    const { sr } = setup({ markers: [makeMarker()] })
    expect(sr.resolve).toHaveBeenCalled()
    expect(sr.resolveSelected).not.toHaveBeenCalled()
  })

  it.each([
    ['explicit empty array', { selectedMarkers: [] }],
    ['missing selectedMarkers key', {}]
  ])('deselects when selectionchange has %s', (_, payload) => {
    const { eb, result } = setup({ markers: [makeMarker()] })
    act(() => eb.emit('interact:selectionchange', { selectedMarkers: ['marker-1'] }))
    act(() => eb.emit('interact:selectionchange', payload))
    expect(result.container.querySelector('svg')).not.toHaveClass('im-c-marker--selected')
  })

  it('wires interact:active and interact:selectionchange on mount and removes them on unmount', () => {
    const { eb, result } = setup()
    expect(eb.on).toHaveBeenCalledWith('interact:active', expect.any(Function))
    expect(eb.on).toHaveBeenCalledWith('interact:selectionchange', expect.any(Function))
    result.unmount()
    expect(eb.off).toHaveBeenCalledWith('interact:active', expect.any(Function))
    expect(eb.off).toHaveBeenCalledWith('interact:selectionchange', expect.any(Function))
  })

  it('adds selected class to marker-with-label wrapper and svg when selected', () => {
    const { eb, result } = setup({ markers: [makeMarker({ label: 'Test', showLabel: true })] })
    act(() => eb.emit('interact:selectionchange', { selectedMarkers: ['marker-1'] }))
    const wrapper = result.container.querySelector('.im-c-marker-wrapper')
    expect(wrapper).toHaveClass('im-c-marker-wrapper--selected')
    expect(wrapper.querySelector('svg')).toHaveClass('im-c-marker--selected')
  })
})

// ─── Markers — useMarkerCursor ────────────────────────────────────────────────

const CURSOR_INSIDE = { clientX: 20, clientY: 20 }
const CURSOR_OUTSIDE = { clientX: 100, clientY: 100 }
const HIT_BOUNDS = { left: 10, top: 10, right: 50, bottom: 50 }
let cursorViewport

const activateCursor = (eb) => act(() => eb.emit('interact:active', { active: true, interactionModes: ['selectMarker'] }))
const deactivateCursor = (eb) => act(() => eb.emit('interact:active', { active: false, interactionModes: ['selectMarker'] }))
const fireMove = ({ clientX, clientY }) => act(() => {
  cursorViewport.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }))
})
const setupCursor = (markerBounds, markerOverrides = {}) => {
  const eb = makeEventBus()
  const markerRefs = new Map()
  const marker = makeMarker(markerOverrides)
  if (markerBounds) markerRefs.set(marker.id, { getBoundingClientRect: () => markerBounds })
  useConfig.mockReturnValue({ id: 'test-app' })
  useMap.mockReturnValue({ mapStyle: 'outdoor', mapSize: 'small' })
  useService.mockReturnValue({ symbolRegistry: makeSymbolRegistry(), eventBus: eb })
  useMarkers.mockReturnValue({ markers: { items: [marker], markerRefs }, markerRef: () => () => {} })
  render(<Markers />)
  return eb
}
const cursorBeforeEach = () => {
  cursorViewport = document.createElement('div')
  cursorViewport.className = 'im-c-viewport'
  document.body.appendChild(cursorViewport)
}
const cursorAfterEach = () => { cursorViewport.remove() }

describe('Markers — useMarkerCursor — inactive guards', () => {
  beforeEach(cursorBeforeEach)
  afterEach(cursorAfterEach)

  it('does not track mousemove when interact is not active', () => {
    setupCursor(HIT_BOUNDS)
    fireMove(CURSOR_INSIDE)
    expect(cursorViewport.style.cursor).toBe('')
  })

  it('does not track mousemove when selectMarker is not in interactionModes', () => {
    const eb = setupCursor(HIT_BOUNDS)
    act(() => eb.emit('interact:active', { active: true, interactionModes: ['selectFeature'] }))
    fireMove(CURSOR_INSIDE)
    expect(cursorViewport.style.cursor).toBe('')
  })

  it('does not track mousemove when interactionModes is absent from payload', () => {
    const eb = setupCursor(HIT_BOUNDS)
    act(() => eb.emit('interact:active', { active: true }))
    fireMove(CURSOR_INSIDE)
    expect(cursorViewport.style.cursor).toBe('')
  })

  it('does not track mousemove when viewport element is absent', () => {
    cursorViewport.remove()
    const eb = setupCursor(HIT_BOUNDS)
    activateCursor(eb)
    expect(cursorViewport.style.cursor).toBe('')
  })
})

describe('Markers — useMarkerCursor — cursor tracking', () => {
  beforeEach(cursorBeforeEach)
  afterEach(cursorAfterEach)

  it('sets cursor to pointer when mousemove lands inside a marker', () => {
    const eb = setupCursor(HIT_BOUNDS)
    activateCursor(eb)
    fireMove(CURSOR_INSIDE)
    expect(cursorViewport.style.cursor).toBe('pointer')
  })

  it('cursor stays empty when mousemove is outside all markers', () => {
    const eb = setupCursor(HIT_BOUNDS)
    activateCursor(eb)
    fireMove(CURSOR_OUTSIDE)
    expect(cursorViewport.style.cursor).toBe('')
  })

  it('cursor stays empty when marker has no ref element', () => {
    const eb = setupCursor(null)
    activateCursor(eb)
    fireMove(CURSOR_INSIDE)
    expect(cursorViewport.style.cursor).toBe('')
  })

  it('skips standalone label markers in the cursor hit test (line 141)', () => {
    const eb = setupCursor(HIT_BOUNDS, { label: 'lbl', symbol: null, symbolSvgContent: null })
    activateCursor(eb)
    fireMove(CURSOR_INSIDE)
    expect(cursorViewport.style.cursor).toBe('')
  })

  it('clears cursor and stops tracking when interact becomes inactive', () => {
    const eb = setupCursor(HIT_BOUNDS)
    activateCursor(eb)
    fireMove(CURSOR_INSIDE)
    expect(cursorViewport.style.cursor).toBe('pointer')
    deactivateCursor(eb)
    expect(cursorViewport.style.cursor).toBe('')
  })
})
