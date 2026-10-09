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
    on: jest.fn((eventName, fn) => { listeners[eventName] = fn }),
    off: jest.fn(),
    emit: (eventName, payload) => listeners[eventName]?.(payload)
  }
}

// Stands in for the registry: every marker resolves to a 38×38 symbol anchored at its bottom centre
const makeSymbolRegistry = (overrides = {}) => ({
  getDefaults: jest.fn(() => ({ symbol: 'pin' })),
  getMarkerSymbolDef: jest.fn(() => ({ svg: '<circle/>', viewBox: '0 0 38 38', anchor: [0.5, 1] })),
  resolveVariant: jest.fn((symbolDef, styleValues, mapStyle, variant) => `<circle class="${variant}"/>`),
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
    const marker = makeMarker({ id: 'lbl', label: 'My label', symbol: null, svgContent: null })
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
  it('asks the registry for the marker\'s symbol definition', () => {
    const marker = makeMarker({ size: 'large', viewBox: '0 0 50 60' })
    const { sr } = setup({ markers: [marker] })
    expect(sr.getMarkerSymbolDef).toHaveBeenCalledWith(marker)
  })

  it('renders at the definition\'s viewBox and anchor, and keeps marker options out of the style values', () => {
    const sr = makeSymbolRegistry({ getMarkerSymbolDef: jest.fn(() => ({ svg: '<circle/>', viewBox: '0 0 30 40', anchor: [0.5, 1] })) })
    const { result } = setup({ markers: [makeMarker({ size: 'large', anchor: [0, 0], backgroundColor: '#123456' })], symbolRegistry: sr })
    const svg = result.container.querySelector(SVG_SEL)
    expect(svg.getAttribute('width')).toBe('30')
    expect(svg.getAttribute('height')).toBe('40')
    expect(svg).toHaveStyle({ marginLeft: '-15px', marginTop: '-40px' })
    const styleValues = sr.resolveVariant.mock.calls[0][1]
    expect(styleValues).toEqual({ backgroundColor: '#123456' })
  })

  it('falls back to a centred 44×44 viewBox for a marker with no known symbol', () => {
    const sr = makeSymbolRegistry({ getMarkerSymbolDef: jest.fn(() => undefined) })
    const { result } = setup({ markers: [makeMarker({ symbol: 'not-registered' })], symbolRegistry: sr })
    const svg = result.container.querySelector(SVG_SEL)
    expect(sr.resolveVariant).toHaveBeenCalledWith(undefined, expect.any(Object), 'outdoor', 'normal')
    expect(svg.getAttribute('viewBox')).toBe('0 0 44 44')
    expect(svg).toHaveStyle({ marginLeft: '-22px', marginTop: '-22px' })
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
  it('adds selected class and resolves the selected variant when marker is selected', () => {
    const { eb, sr, result } = setup({ markers: [makeMarker()] })
    act(() => eb.emit(SEL_CHANGE, { selectedMarkers: [MARKER_ID] }))
    expect(result.container.querySelector(SVG_SEL)).toHaveClass(SELECTED_CLASS)
    expect(sr.resolveVariant).toHaveBeenLastCalledWith(expect.anything(), expect.any(Object), 'outdoor', 'selected')
  })

  it('resolves the active variant for the active listbox item, even when selected', () => {
    const SET_ACTIVE = 'map:setactiveitem'
    const { eb, sr } = setup({ markers: [makeMarker()] })
    act(() => eb.emit(SEL_CHANGE, { selectedMarkers: [MARKER_ID] }))
    act(() => eb.emit(SET_ACTIVE, { id: MARKER_ID }))
    expect(sr.resolveVariant).toHaveBeenLastCalledWith(expect.anything(), expect.any(Object), 'outdoor', 'active')
  })

  it('resolves the normal variant for unselected markers', () => {
    const { sr } = setup({ markers: [makeMarker()] })
    expect(sr.resolveVariant).toHaveBeenCalledWith(expect.anything(), expect.any(Object), 'outdoor', 'normal')
    expect(sr.resolveVariant).not.toHaveBeenCalledWith(expect.anything(), expect.any(Object), 'outdoor', 'selected')
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
