// src/core/store/appDispatchMiddleware.test.js
import { handleActionSideEffects } from './appDispatchMiddleware.js'
import eventBus from '../../services/eventBus.js'
import { EVENTS as events } from '../../config/events.js'

jest.mock('../../services/eventBus.js')

const run = (action, state, panelConfig = {}) =>
  handleActionSideEffects(action, state, panelConfig, eventBus)

const flushMicrotasks = () => new Promise(queueMicrotask)

const INVALID_SLOT = 'invalid-slot'
const LOG_PREFIX = '[interactive-map]'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('CLOSE_PANEL', () => {
  it('emits panel closed event', async () => {
    run(
      { type: 'CLOSE_PANEL', payload: 'testPanel' },
      { openPanels: {} }
    )

    await flushMicrotasks()

    expect(eventBus.emit).toHaveBeenCalledWith(
      events.APP_PANEL_CLOSED,
      { panelId: 'testPanel' }
    )
  })
})

describe('CLOSE_ALL_PANELS', () => {
  it('emits closed event for each panel', async () => {
    run(
      { type: 'CLOSE_ALL_PANELS' },
      { openPanels: { panel1: {}, panel2: {} } }
    )

    await flushMicrotasks()

    expect(eventBus.emit).toHaveBeenCalledTimes(2)
    expect(eventBus.emit).toHaveBeenCalledWith(
      events.APP_PANEL_CLOSED,
      { panelId: 'panel1' }
    )
    expect(eventBus.emit).toHaveBeenCalledWith(
      events.APP_PANEL_CLOSED,
      { panelId: 'panel2' }
    )
  })
})

describe('OPEN_PANEL — regular panel', () => {
  it('emits panel opened event', async () => {
    run(
      {
        type: 'OPEN_PANEL',
        payload: { panelId: 'newPanel', props: { foo: 'bar' } }
      },
      { openPanels: {}, breakpoint: 'md' },
      { newPanel: { md: { exclusive: false, modal: false } } }
    )

    await flushMicrotasks()

    expect(eventBus.emit).toHaveBeenCalledWith(
      events.APP_PANEL_OPENED,
      { panelId: 'newPanel', props: { foo: 'bar' } }
    )
  })
})

const CLOSED_PLUS_OPENED = 3

describe('OPEN_PANEL — opening exclusive closes non-exclusive', () => {
  it('closes all non-exclusive panels', async () => {
    run(
      { type: 'OPEN_PANEL', payload: { panelId: 'exclusivePanel', props: {} } },
      { openPanels: { regularPanel1: {}, regularPanel2: {}, exclusivePanel2: {} }, breakpoint: 'md' },
      {
        exclusivePanel: { md: { exclusive: true, modal: false } },
        regularPanel1: { md: { exclusive: false, modal: false } },
        regularPanel2: { md: { exclusive: false, modal: false } },
        exclusivePanel2: { md: { exclusive: true, modal: false } }
      }
    )
    await flushMicrotasks()
    expect(eventBus.emit).toHaveBeenCalledTimes(CLOSED_PLUS_OPENED)
    expect(eventBus.emit).toHaveBeenCalledWith(events.APP_PANEL_CLOSED, { panelId: 'regularPanel1' })
    expect(eventBus.emit).toHaveBeenCalledWith(events.APP_PANEL_CLOSED, { panelId: 'regularPanel2' })
    expect(eventBus.emit).toHaveBeenCalledWith(events.APP_PANEL_OPENED, { panelId: 'exclusivePanel', props: {} })
  })
})

describe('OPEN_PANEL — opening regular closes exclusive non-modal', () => {
  it('closes all exclusive non-modal panels', async () => {
    run(
      { type: 'OPEN_PANEL', payload: { panelId: 'regularPanel', props: {} } },
      { openPanels: { exclusivePanel1: {}, exclusivePanel2: {}, exclusiveModalPanel: {}, regularPanel2: {} }, breakpoint: 'md' },
      {
        regularPanel: { md: { exclusive: false, modal: false } },
        exclusivePanel1: { md: { exclusive: true, modal: false } },
        exclusivePanel2: { md: { exclusive: true, modal: false } },
        exclusiveModalPanel: { md: { exclusive: true, modal: true } },
        regularPanel2: { md: { exclusive: false, modal: false } }
      }
    )
    await flushMicrotasks()
    expect(eventBus.emit).toHaveBeenCalledTimes(CLOSED_PLUS_OPENED)
    expect(eventBus.emit).toHaveBeenCalledWith(events.APP_PANEL_CLOSED, { panelId: 'exclusivePanel1' })
    expect(eventBus.emit).toHaveBeenCalledWith(events.APP_PANEL_CLOSED, { panelId: 'exclusivePanel2' })
    expect(eventBus.emit).toHaveBeenCalledWith(events.APP_PANEL_OPENED, { panelId: 'regularPanel', props: {} })
  })
})

describe('OPEN_PANEL — modal panel', () => {
  it('does not close any panels when opening modal', async () => {
    run(
      {
        type: 'OPEN_PANEL',
        payload: { panelId: 'modalPanel', props: {} }
      },
      {
        openPanels: { regularPanel: {}, exclusivePanel: {} },
        breakpoint: 'md'
      },
      {
        modalPanel: { md: { modal: true } },
        regularPanel: { md: { exclusive: false, modal: false } },
        exclusivePanel: { md: { exclusive: true, modal: false } }
      }
    )

    await flushMicrotasks()

    expect(eventBus.emit).toHaveBeenCalledTimes(1)
    expect(eventBus.emit).toHaveBeenCalledWith(
      events.APP_PANEL_OPENED,
      { panelId: 'modalPanel', props: {} }
    )
  })
})

describe('ADD_BUTTON', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}))
  afterEach(() => jest.restoreAllMocks())

  it('warns when button has an invalid slot', () => {
    run(
      { type: 'ADD_BUTTON', payload: { id: 'myBtn', config: { desktop: { slot: INVALID_SLOT } } } },
      { breakpoint: 'desktop' }
    )
    expect(console.warn).toHaveBeenCalledWith(LOG_PREFIX, expect.stringContaining(INVALID_SLOT))
  })

  it('does not warn when button has a valid slot', () => {
    run(
      { type: 'ADD_BUTTON', payload: { id: 'myBtn', config: { mobile: { slot: 'top-left' }, tablet: { slot: 'top-left' }, desktop: { slot: 'top-left' } } } },
      { breakpoint: 'desktop' }
    )
    expect(console.warn).not.toHaveBeenCalled()
  })
})

describe('ADD_CONTROL', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}))
  afterEach(() => jest.restoreAllMocks())

  it('warns when control has an invalid slot', () => {
    run(
      { type: 'ADD_CONTROL', payload: { id: 'myCtrl', config: { desktop: { slot: INVALID_SLOT } } } },
      { breakpoint: 'desktop' }
    )
    expect(console.warn).toHaveBeenCalledWith(LOG_PREFIX, expect.stringContaining(INVALID_SLOT))
  })

  it('does not warn when control has a valid slot', () => {
    run(
      { type: 'ADD_CONTROL', payload: { id: 'myCtrl', config: { mobile: { slot: 'bottom' }, tablet: { slot: 'top-left' }, desktop: { slot: 'top-left' } } } },
      { breakpoint: 'desktop' }
    )
    expect(console.warn).not.toHaveBeenCalled()
  })
})

describe('ADD_PANEL', () => {
  it('emits APP_PANEL_OPENED with slot when panel opens by default', async () => {
    run(
      { type: 'ADD_PANEL', payload: { id: 'newPanel', config: {} } },
      { breakpoint: 'desktop' }
    )

    await flushMicrotasks()

    expect(eventBus.emit).toHaveBeenCalledWith(
      events.APP_PANEL_OPENED,
      { panelId: 'newPanel', slot: 'left-top' }
    )
  })

  it('emits APP_PANEL_OPENED with visibleGeometry when provided in config', async () => {
    const visibleGeometry = { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] }, properties: {} }
    run(
      { type: 'ADD_PANEL', payload: { id: 'geoPanel', config: { visibleGeometry } } },
      { breakpoint: 'desktop' }
    )

    await flushMicrotasks()

    expect(eventBus.emit).toHaveBeenCalledWith(
      events.APP_PANEL_OPENED,
      { panelId: 'geoPanel', slot: 'left-top', visibleGeometry }
    )
  })

  it('does not emit APP_PANEL_OPENED when breakpoint config sets open: false', async () => {
    run(
      { type: 'ADD_PANEL', payload: { id: 'hiddenPanel', config: { desktop: { open: false } } } },
      { breakpoint: 'desktop' }
    )

    await flushMicrotasks()

    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  it('emits APP_PANEL_OPENED with slot for mobile breakpoint', async () => {
    run(
      { type: 'ADD_PANEL', payload: { id: 'mobilePanel', config: {} } },
      { breakpoint: 'mobile' }
    )

    await flushMicrotasks()

    expect(eventBus.emit).toHaveBeenCalledWith(
      events.APP_PANEL_OPENED,
      { panelId: 'mobilePanel', slot: 'bottom' }
    )
  })

  it('warns when panel has an invalid slot', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    run(
      { type: 'ADD_PANEL', payload: { id: 'badPanel', config: { desktop: { slot: INVALID_SLOT, open: false } } } },
      { breakpoint: 'desktop' }
    )
    expect(console.warn).toHaveBeenCalledWith(LOG_PREFIX, expect.stringContaining(INVALID_SLOT))
    jest.restoreAllMocks()
  })

  it('does not warn for a panel with a button-adjacent slot', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    run(
      { type: 'ADD_PANEL', payload: { id: 'btnPanel', config: { desktop: { slot: 'left-top-button', open: false } } } },
      { breakpoint: 'desktop' }
    )
    expect(console.warn).not.toHaveBeenCalled()
    jest.restoreAllMocks()
  })
})
