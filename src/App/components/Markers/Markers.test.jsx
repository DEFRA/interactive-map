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

const MARKER_ID = 'marker-1'
const SEL_CHANGE = 'interact:selectionchange'
const INTERACT_ACTIVE = 'interact:active'
const SELECTED_CLASS = 'im-c-marker--selected'
const SVG_SEL = 'svg'

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
  id: MARKER_ID, isVisible: true, symbol: 'pin', ...overrides
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
    markerRef: (id) => (el) => { if (el) { markerRefs.set(id, el) } }
  })
  return { eb, sr, result: render(<Markers />) }
}

// ─── Markers — basic rendering ────────────────────────────────────────────────

describe('Markers — basic rendering', () => {
  it('renders nothing when mapStyle is not set', () => {
    expect(setup({ mapStyle: null }).result.container.firstChild).toBeNull()
  })

  it('renders nothing when there are no markers', () => {
    expect(setup().result.container.querySelectorAll(SVG_SEL)).toHaveLength(0)
  })

  it('renders one svg per marker with correct id and classes', () => {
    const { result } = setup({ markers: [makeMarker(), makeMarker({ id: 'b', symbol: null })] })
    const [svg1, svg2] = result.container.querySelectorAll(SVG_SEL)
    expect(svg1.getAttribute('id')).toBe('test-app-marker-marker-1')
    expect(svg1).toHaveClass('im-c-marker', 'im-c-marker--pin')
    expect(svg2).toHaveClass('im-c-marker--pin')
  })
})

// ─── Markers — routing ────────────────────────────────────────────────────────

describe('Markers — routing', () => {
  it('renders a LabelMarker for a marker with symbol: null', () => {
    const marker = makeMarker({ id: 'lbl', label: 'My label', symbol: null, symbolSvgContent: null })
    const { result } = setup({ markers: [marker] })
    const wrapper = result.container.querySelector('.im-c-marker-wrapper--label')
    expect(wrapper).toBeTruthy()
    expect(wrapper.querySelector('.im-c-marker__label--standalone').textContent).toBe('My label')
    expect(result.container.querySelector(SVG_SEL)).toBeNull()
  })

  it('renders a SymbolLabelMarker when showLabel is true', () => {
    const marker = makeMarker({ label: 'Tooltip', showLabel: true })
    const { result } = setup({ markers: [marker] })
    const wrapper = result.container.querySelector('.im-c-marker-wrapper')
    expect(wrapper).toBeTruthy()
    expect(wrapper.querySelector('.im-c-marker__label').textContent).toBe('Tooltip')
    expect(wrapper.querySelector(SVG_SEL)).toBeTruthy()
  })

  it('renders an svg without label when showLabel is false or absent', () => {
    const { result } = setup({ markers: [makeMarker({ label: 'hidden', showLabel: false })] })
    expect(result.container.querySelector(SVG_SEL)).toBeTruthy()
    expect(result.container.querySelector('.im-c-marker__label')).toBeNull()
  })
})

// ─── Markers — symbol resolution ─────────────────────────────────────────────

describe('Markers — symbol resolution', () => {
  it('uses inline symbolSvgContent over the symbol registry', () => {
    const sr = makeSymbolRegistry()
    setup({ markers: [makeMarker({ symbolSvgContent: '<rect/>' })], symbolRegistry: sr })
    expect(sr.get).not.toHaveBeenCalled()
  })

  it('falls back to defaults.symbolSvgContent', () => {
    const sr = makeSymbolRegistry({
      getDefaults: jest.fn(() => ({ symbolSvgContent: '<default-svg/>', viewBox: '0 0 38 38', anchor: [0.5, 1] }))
    })
    setup({ markers: [makeMarker({ symbol: null })], symbolRegistry: sr })
    expect(sr.get).not.toHaveBeenCalled()
  })

  it('uses marker.viewBox when provided', () => {
    const svg = setup({ markers: [makeMarker({ viewBox: '0 0 50 60' })] }).result.container.querySelector(SVG_SEL)
    expect(svg.getAttribute('viewBox')).toBe('0 0 50 60')
    expect(svg.getAttribute('width')).toBe('50')
    expect(svg.getAttribute('height')).toBe('60')
  })

  it("falls back to '0 0 38 38' viewBox when none is provided", () => {
    const sr = makeSymbolRegistry({
      get: jest.fn(() => ({ svg: '<circle/>' })),
      getDefaults: jest.fn(() => ({ symbol: 'pin' }))
    })
    expect(setup({ markers: [makeMarker()], symbolRegistry: sr }).result.container.querySelector(SVG_SEL).getAttribute('viewBox')).toBe('0 0 38 38')
  })

  it.each([
    ['marker.anchor', makeMarker({ anchor: [0, 0] }), null, '0px', '0px'],
    ['symbolDef.anchor', makeMarker(), { get: jest.fn(() => ({ svg: '<circle/>', viewBox: '0 0 38 38', anchor: [0, 0.5] })), getDefaults: jest.fn(() => ({ symbol: 'pin', viewBox: '0 0 38 38' })) }, '0px', '-19px'],
    ['[0.5, 0.5] fallback', makeMarker(), { get: jest.fn(() => ({ svg: '<circle/>', viewBox: '0 0 38 38' })), getDefaults: jest.fn(() => ({ symbol: 'pin', viewBox: '0 0 38 38' })) }, '-19px', '-19px']
  ])('resolveAnchor uses %s', (_, marker, srOverrides, left, top) => {
    const sr = srOverrides ? makeSymbolRegistry(srOverrides) : null
    expect(setup({ markers: [marker], symbolRegistry: sr }).result.container.querySelector(SVG_SEL)).toHaveStyle({ marginLeft: left, marginTop: top })
  })

  it.each([
    ['small', '38', '38'],
    ['medium', '57', '57'],
    ['large', '76', '76'],
    ['huge', '38', '38']
  ])('scales svg dimensions for mapSize=%s', (mapSize, width, height) => {
    const svg = setup({ markers: [makeMarker()], mapSize }).result.container.querySelector(SVG_SEL)
    expect(svg.getAttribute('width')).toBe(width)
    expect(svg.getAttribute('height')).toBe(height)
  })

  it('scales anchor offsets for medium mapSize', () => {
    expect(setup({ markers: [makeMarker()], mapSize: 'medium' }).result.container.querySelector(SVG_SEL))
      .toHaveStyle({ marginLeft: '-28.5px', marginTop: '-57px' })
  })
})

// ─── Markers — selection ──────────────────────────────────────────────────────

describe('Markers — selection', () => {
  it('adds selected class and calls resolveSelected when marker is selected', () => {
    const { eb, sr, result } = setup({ markers: [makeMarker()] })
    act(() => eb.emit(SEL_CHANGE, { selectedMarkers: [MARKER_ID] }))
    expect(result.container.querySelector(SVG_SEL)).toHaveClass(SELECTED_CLASS)
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
    act(() => eb.emit(SEL_CHANGE, { selectedMarkers: [MARKER_ID] }))
    act(() => eb.emit(SEL_CHANGE, payload))
    expect(result.container.querySelector(SVG_SEL)).not.toHaveClass(SELECTED_CLASS)
  })

  it('handles interact:active with selectMarker in interactionModes', () => {
    const { eb } = setup()
    expect(() => act(() => eb.emit(INTERACT_ACTIVE, { active: true, interactionModes: ['selectMarker'] }))).not.toThrow()
  })

  it('handles interact:active with no interactionModes (uses default [])', () => {
    const { eb } = setup()
    expect(() => act(() => eb.emit(INTERACT_ACTIVE, { active: true }))).not.toThrow()
  })

  it('wires interact:active and interact:selectionchange on mount and removes them on unmount', () => {
    const { eb, result } = setup()
    expect(eb.on).toHaveBeenCalledWith(INTERACT_ACTIVE, expect.any(Function))
    expect(eb.on).toHaveBeenCalledWith(SEL_CHANGE, expect.any(Function))
    result.unmount()
    expect(eb.off).toHaveBeenCalledWith(INTERACT_ACTIVE, expect.any(Function))
    expect(eb.off).toHaveBeenCalledWith(SEL_CHANGE, expect.any(Function))
  })

  it('adds selected class to SymbolLabelMarker wrapper and svg when selected', () => {
    const { eb, result } = setup({ markers: [makeMarker({ label: 'Test', showLabel: true })] })
    act(() => eb.emit(SEL_CHANGE, { selectedMarkers: [MARKER_ID] }))
    const wrapper = result.container.querySelector('.im-c-marker-wrapper')
    expect(wrapper).toHaveClass('im-c-marker-wrapper--selected')
    expect(wrapper.querySelector(SVG_SEL)).toHaveClass(SELECTED_CLASS)
  })
})
