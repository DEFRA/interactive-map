// src/core/store/appDispatchMiddleware.test.js
import { handleActionSideEffects } from './appDispatchMiddleware.js'
import eventBus from '../../services/eventBus.js'
import { EVENTS as events } from '../../config/events.js'

jest.mock('../../services/eventBus.js')

const run = (action, state, panelConfig = {}) =>
  handleActionSideEffects(action, state, panelConfig, eventBus)

const flushMicrotasks = () => new Promise(queueMicrotask)

describe('appDispatchMiddleware', () => {
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

  describe('OPEN_PANEL', () => {
    it('emits panel opened event for regular panel', async () => {
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

    it('closes all non-exclusive panels when opening exclusive non-modal panel', async () => {
      run(
        {
          type: 'OPEN_PANEL',
          payload: { panelId: 'exclusivePanel', props: {} }
        },
        {
          openPanels: {
            regularPanel1: {},
            regularPanel2: {},
            exclusivePanel2: {}
          },
          breakpoint: 'md'
        },
        {
          exclusivePanel: { md: { exclusive: true, modal: false } },
          regularPanel1: { md: { exclusive: false, modal: false } },
          regularPanel2: { md: { exclusive: false, modal: false } },
          exclusivePanel2: { md: { exclusive: true, modal: false } }
        }
      )

      await flushMicrotasks()

      expect(eventBus.emit).toHaveBeenCalledTimes(3)
      expect(eventBus.emit).toHaveBeenCalledWith(
        events.APP_PANEL_CLOSED,
        { panelId: 'regularPanel1' }
      )
      expect(eventBus.emit).toHaveBeenCalledWith(
        events.APP_PANEL_CLOSED,
        { panelId: 'regularPanel2' }
      )
      expect(eventBus.emit).toHaveBeenCalledWith(
        events.APP_PANEL_OPENED,
        { panelId: 'exclusivePanel', props: {} }
      )
    })

    it('closes all exclusive non-modal panels when opening regular panel', async () => {
      run(
        {
          type: 'OPEN_PANEL',
          payload: { panelId: 'regularPanel', props: {} }
        },
        {
          openPanels: {
            exclusivePanel1: {},
            exclusivePanel2: {},
            exclusiveModalPanel: {},
            regularPanel2: {}
          },
          breakpoint: 'md'
        },
        {
          regularPanel: { md: { exclusive: false, modal: false } },
          exclusivePanel1: { md: { exclusive: true, modal: false } },
          exclusivePanel2: { md: { exclusive: true, modal: false } },
          exclusiveModalPanel: { md: { exclusive: true, modal: true } },
          regularPanel2: { md: { exclusive: false, modal: false } }
        }
      )

      await flushMicrotasks()

      expect(eventBus.emit).toHaveBeenCalledTimes(3)
      expect(eventBus.emit).toHaveBeenCalledWith(
        events.APP_PANEL_CLOSED,
        { panelId: 'exclusivePanel1' }
      )
      expect(eventBus.emit).toHaveBeenCalledWith(
        events.APP_PANEL_CLOSED,
        { panelId: 'exclusivePanel2' }
      )
      expect(eventBus.emit).toHaveBeenCalledWith(
        events.APP_PANEL_OPENED,
        { panelId: 'regularPanel', props: {} }
      )
    })

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
  })
})
