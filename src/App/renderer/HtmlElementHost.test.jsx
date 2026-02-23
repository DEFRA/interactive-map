import React from 'react'
import { render } from '@testing-library/react'
import { HtmlElementHost, getSlotRef } from './HtmlElementHost.jsx'
import { useApp } from '../store/appContext'

jest.mock('../store/appContext', () => ({ useApp: jest.fn() }))
jest.mock('../store/configContext', () => ({ useConfig: jest.fn(() => ({ id: 'test' })) }))
jest.mock('../components/Panel/Panel.jsx', () => ({
  Panel: ({ panelId, html, isOpen, rootRef }) => (
    <div ref={rootRef} data-testid={`panel-${panelId}`} data-open={isOpen}>
      {html}
    </div>
  )
}))
jest.mock('./slots.js', () => ({
  allowedSlots: {
    panel: ['inset', 'side', 'modal', 'bottom'],
    control: ['inset', 'banner', 'bottom', 'actions']
  }
}))

/**
 * Wrapper that provides real DOM slot containers as refs.
 * This keeps projected nodes inside React's render tree so cleanup works.
 */
const SlotHarness = ({ layoutRefs, children }) => (
  <div>
    <div ref={layoutRefs.insetRef} data-slot='inset' />
    <div ref={layoutRefs.sideRef} data-slot='side' />
    <div ref={layoutRefs.modalRef} data-slot='modal' />
    <div ref={layoutRefs.bottomRef} data-slot='bottom' />
    <div ref={layoutRefs.bannerRef} data-slot='banner' />
    <div ref={layoutRefs.actionsRef} data-slot='actions' />
    {children}
  </div>
)

describe('HtmlElementHost', () => {
  let layoutRefs

  beforeEach(() => {
    jest.clearAllMocks()
    layoutRefs = {
      sideRef: { current: null },
      bannerRef: { current: null },
      topLeftColRef: { current: null },
      topRightColRef: { current: null },
      insetRef: { current: null },
      middleRef: { current: null },
      bottomRef: { current: null },
      actionsRef: { current: null },
      modalRef: { current: null },
      viewportRef: { current: null },
      mainRef: { current: null }
    }
  })

  const mockApp = (overrides = {}) => {
    const state = {
      breakpoint: 'desktop',
      mode: 'view',
      isFullscreen: false,
      panelConfig: {},
      controlConfig: {},
      openPanels: {},
      layoutRefs,
      dispatch: jest.fn(),
      ...overrides
    }
    useApp.mockReturnValue(state)
    return state
  }

  const renderWithSlots = (appOverrides = {}) => {
    mockApp(appOverrides)
    return render(
      <SlotHarness layoutRefs={layoutRefs}>
        <HtmlElementHost />
      </SlotHarness>
    )
  }

  it('renders nothing when no consumer HTML panels or controls exist', () => {
    mockApp()
    const { container } = render(<HtmlElementHost />)
    expect(container.firstChild).toBeNull()
  })

  it('ignores plugin panels (with pluginId)', () => {
    mockApp({
      panelConfig: { p1: { pluginId: 'plug1', html: '<p>Hi</p>', desktop: { slot: 'inset' } } },
      openPanels: { p1: { props: {} } }
    })
    const { container } = render(<HtmlElementHost />)
    expect(container.firstChild).toBeNull()
  })

  it('ignores plugin controls (with pluginId)', () => {
    mockApp({
      controlConfig: { c1: { id: 'c1', pluginId: 'plug1', html: '<p>Hi</p>', desktop: { slot: 'inset' } } }
    })
    const { container } = render(<HtmlElementHost />)
    expect(container.firstChild).toBeNull()
  })

  it('projects open panel into correct slot', () => {
    const { container } = renderWithSlots({
      panelConfig: { p1: { html: '<p>Hi</p>', label: 'Test', desktop: { slot: 'inset' } } },
      openPanels: { p1: { props: {} } }
    })
    expect(container.querySelector('[data-slot="inset"] [data-testid="panel-p1"]')).toBeTruthy()
  })

  it('hides panel when closed and passes isOpen=false', () => {
    const { getByTestId } = renderWithSlots({
      panelConfig: { p1: { html: '<p>Hi</p>', label: 'Test', desktop: { slot: 'inset' } } },
      openPanels: {}
    })
    expect(getByTestId('panel-p1').style.display).toBe('none')
    expect(getByTestId('panel-p1').dataset.open).toBe('false')
  })

  it('hides panel when mode is not allowed', () => {
    const { getByTestId } = renderWithSlots({
      panelConfig: { p1: { html: '<p>Hi</p>', label: 'Test', desktop: { slot: 'inset' }, includeModes: ['edit'] } },
      openPanels: { p1: { props: {} } }
    })
    expect(getByTestId('panel-p1').style.display).toBe('none')
  })

  it('hides panel with inline:false when not fullscreen', () => {
    const { getByTestId } = renderWithSlots({
      panelConfig: { p1: { html: '<p>Hi</p>', label: 'Test', desktop: { slot: 'inset' }, inline: false } },
      openPanels: { p1: { props: {} } },
      isFullscreen: false
    })
    expect(getByTestId('panel-p1').style.display).toBe('none')
  })

  it('resolves bottom slot to inset on desktop', () => {
    const { container } = renderWithSlots({
      panelConfig: { p1: { html: '<p>Hi</p>', label: 'Test', desktop: { slot: 'bottom' } } },
      openPanels: { p1: { props: {} } }
    })
    expect(container.querySelector('[data-slot="inset"] [data-testid="panel-p1"]')).toBeTruthy()
    expect(container.querySelector('[data-slot="bottom"] [data-testid="panel-p1"]')).toBeNull()
  })

  it('only shows topmost modal panel', () => {
    const { getByTestId, container } = renderWithSlots({
      panelConfig: {
        p1: { html: '<p>1</p>', label: 'M1', desktop: { slot: 'side', modal: true } },
        p2: { html: '<p>2</p>', label: 'M2', desktop: { slot: 'side', modal: true } }
      },
      openPanels: { p1: { props: {} }, p2: { props: {} } }
    })
    expect(getByTestId('panel-p1').style.display).toBe('none')
    expect(container.querySelector('[data-slot="modal"] [data-testid="panel-p2"]')).toBeTruthy()
  })

  it('hides panel when breakpoint config is missing', () => {
    const { getByTestId } = renderWithSlots({
      panelConfig: { p1: { html: '<p>Hi</p>', label: 'Test', mobile: { slot: 'inset' } } },
      openPanels: { p1: { props: {} } },
      breakpoint: 'desktop'
    })
    expect(getByTestId('panel-p1').style.display).toBe('none')
  })

  it('projects visible control into correct slot', () => {
    const { container } = renderWithSlots({
      controlConfig: { c1: { id: 'c1', html: '<input type="checkbox">', desktop: { slot: 'inset' } } }
    })
    const control = container.querySelector('[data-slot="inset"] .im-c-control')
    expect(control).toBeTruthy()
    expect(control.innerHTML).toBe('<input type="checkbox">')
  })

  it('hides panel when slot is not allowed', () => {
    const { getByTestId } = renderWithSlots({
      panelConfig: { p1: { html: '<p>Hi</p>', label: 'Test', desktop: { slot: 'invalid' } } },
      openPanels: { p1: { props: {} } }
    })
    expect(getByTestId('panel-p1').style.display).toBe('none')
  })

  it('hides control when breakpoint config is missing', () => {
    const { container } = renderWithSlots({
      controlConfig: { c1: { id: 'c1', html: '<p>Hi</p>', mobile: { slot: 'inset' } } },
      breakpoint: 'desktop'
    })
    const control = container.querySelector('.im-c-control')
    expect(control.style.display).toBe('none')
  })

  it('uses default empty objects when appState is missing configs', () => {
    useApp.mockReturnValue({}) // no panelConfig/controlConfig/openPanels/breakpoint
    const { container } = render(<HtmlElementHost />)
    expect(container.firstChild).toBeNull() // still renders safely
  })

  test('getSlotRef returns null for unknown slot', () => {
    expect(getSlotRef('unknown-slot', {})).toBeNull()
  })

  it('does not append child if slotRef exists but current is null', () => {
    // 1. Setup refs where the slot exists in the map but the DOM node (current) is null
    const incompleteRefs = {
      ...layoutRefs,
      sideRef: { current: null }
    }

    // 2. Mock the app so the panel IS visible, but the slot it wants is the broken one
    mockApp({
      panelConfig: { p1: { html: '<b>Hi</b>', desktop: { slot: 'side' } } },
      openPanels: { p1: { props: {} } },
      layoutRefs: incompleteRefs
    })

    const { getByTestId, container } = render(<HtmlElementHost />)

    const panel = getByTestId('panel-p1')

    // 3. Verify that the panel was NOT moved into a slot container
    // Since sideRef.current is null, it should still be sitting in the root of the Host
    expect(container.querySelector('[data-slot="side"] [data-testid="panel-p1"]')).toBeNull()

    // The panel exists in the DOM but hasn't been "projected"
    expect(panel).toBeTruthy()
  })
})
