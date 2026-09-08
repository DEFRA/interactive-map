import { createSpatialListRegistry } from './spatialListRegistry.js'

const SET_FEATURES = 'map:setspatiallist'

const makeEventBus = () => ({ emit: jest.fn() })

const lastEmit = (eventBus) => eventBus.emit.mock.calls.at(-1)[1]

describe('createSpatialListRegistry', () => {
  test('registering a provider recomputes and emits its items immediately', () => {
    const eventBus = makeEventBus()
    const registry = createSpatialListRegistry({ eventBus })
    registry.registerItemProvider('a', { getItems: () => ({ items: [{ id: '1' }], multiselectable: false }) })
    expect(eventBus.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [{ id: '1' }], multiselectable: false })
  })

  test('concatenates items from every registered provider when no exclusive claim is held', () => {
    const eventBus = makeEventBus()
    const registry = createSpatialListRegistry({ eventBus })
    registry.registerItemProvider('a', { getItems: () => ({ items: [{ id: '1' }] }) })
    registry.registerItemProvider('b', { getItems: () => ({ items: [{ id: '2' }] }) })
    expect(lastEmit(eventBus)).toEqual({ items: [{ id: '1' }, { id: '2' }], multiselectable: false })
  })

  test('multiselectable is true if any additive provider wants it', () => {
    const eventBus = makeEventBus()
    const registry = createSpatialListRegistry({ eventBus })
    registry.registerItemProvider('a', { getItems: () => ({ items: [], multiselectable: false }) })
    registry.registerItemProvider('b', { getItems: () => ({ items: [], multiselectable: true }) })
    expect(lastEmit(eventBus)).toEqual({ items: [], multiselectable: true })
  })

  test('getItems is called fresh on every recompute, not snapshotted at registration', () => {
    const eventBus = makeEventBus()
    const registry = createSpatialListRegistry({ eventBus })
    let current = [{ id: 'first' }]
    registry.registerItemProvider('a', { getItems: () => ({ items: current }) })
    expect(lastEmit(eventBus)).toEqual({ items: [{ id: 'first' }], multiselectable: false })

    current = [{ id: 'second' }]
    registry.notifyItemsChanged('a')
    expect(lastEmit(eventBus)).toEqual({ items: [{ id: 'second' }], multiselectable: false })
  })

  test('unregistering a provider removes its items from the next recompute', () => {
    const eventBus = makeEventBus()
    const registry = createSpatialListRegistry({ eventBus })
    registry.registerItemProvider('a', { getItems: () => ({ items: [{ id: '1' }] }) })
    registry.registerItemProvider('b', { getItems: () => ({ items: [{ id: '2' }] }) })
    registry.unregisterItemProvider('a')
    expect(lastEmit(eventBus)).toEqual({ items: [{ id: '2' }], multiselectable: false })
  })

  test('notifyItemsChanged for an unregistered id is a no-op', () => {
    const eventBus = makeEventBus()
    const registry = createSpatialListRegistry({ eventBus })
    registry.notifyItemsChanged('ghost')
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  describe('exclusive claims', () => {
    test('claiming exclusive ownership excludes every other provider\'s items', () => {
      const eventBus = makeEventBus()
      const registry = createSpatialListRegistry({ eventBus })
      registry.registerItemProvider('interact', { getItems: () => ({ items: [{ id: 'feature-1' }] }) })
      registry.registerItemProvider('draw', { getItems: () => ({ items: [{ id: 'vertex-1' }] }), exclusive: true })

      registry.claimExclusive('draw')
      expect(lastEmit(eventBus)).toEqual({ items: [{ id: 'vertex-1' }], multiselectable: false })
    })

    test('releasing the exclusive claim reverts to the additive merge of everyone else', () => {
      const eventBus = makeEventBus()
      const registry = createSpatialListRegistry({ eventBus })
      registry.registerItemProvider('interact', { getItems: () => ({ items: [{ id: 'feature-1' }] }) })
      registry.registerItemProvider('draw', { getItems: () => ({ items: [{ id: 'vertex-1' }] }), exclusive: true })
      registry.claimExclusive('draw')

      registry.releaseExclusive('draw')
      expect(lastEmit(eventBus)).toEqual({ items: [{ id: 'feature-1' }], multiselectable: false })
    })

    test('releaseExclusive from a provider that does not currently hold the claim is a no-op', () => {
      const eventBus = makeEventBus()
      const registry = createSpatialListRegistry({ eventBus })
      registry.registerItemProvider('interact', { getItems: () => ({ items: [{ id: 'feature-1' }] }) })
      eventBus.emit.mockClear()

      registry.releaseExclusive('draw') // never claimed it
      expect(eventBus.emit).not.toHaveBeenCalled()
    })

    test('a non-exclusive-owning provider\'s own changes are ignored while someone else holds the claim', () => {
      const eventBus = makeEventBus()
      const registry = createSpatialListRegistry({ eventBus })
      let interactItems = [{ id: 'feature-1' }]
      registry.registerItemProvider('interact', { getItems: () => ({ items: interactItems }) })
      registry.registerItemProvider('draw', { getItems: () => ({ items: [{ id: 'vertex-1' }] }), exclusive: true })
      registry.claimExclusive('draw')
      eventBus.emit.mockClear()

      interactItems = [{ id: 'feature-2' }] // changed while draw holds exclusive ownership
      registry.notifyItemsChanged('interact')
      expect(eventBus.emit).not.toHaveBeenCalled()
    })

    test('unregistering the current exclusive owner clears the claim and reverts to additive', () => {
      const eventBus = makeEventBus()
      const registry = createSpatialListRegistry({ eventBus })
      registry.registerItemProvider('interact', { getItems: () => ({ items: [{ id: 'feature-1' }] }) })
      registry.registerItemProvider('draw', { getItems: () => ({ items: [{ id: 'vertex-1' }] }), exclusive: true })
      registry.claimExclusive('draw')

      registry.unregisterItemProvider('draw')
      expect(lastEmit(eventBus)).toEqual({ items: [{ id: 'feature-1' }], multiselectable: false })
    })
  })

  describe('label', () => {
    test('passes through the exclusive claimant\'s own label while its claim is held', () => {
      const eventBus = makeEventBus()
      const registry = createSpatialListRegistry({ eventBus })
      registry.registerItemProvider('interact', { getItems: () => ({ items: [], label: 'Map features' }) })
      registry.registerItemProvider('draw', { getItems: () => ({ items: [], label: 'Shape points' }), exclusive: true })

      registry.claimExclusive('draw')
      expect(lastEmit(eventBus)).toEqual({ items: [], multiselectable: false, label: 'Shape points' })
    })

    test('uses the first additive provider\'s label (in registration order) when more than one contributes', () => {
      const eventBus = makeEventBus()
      const registry = createSpatialListRegistry({ eventBus })
      registry.registerItemProvider('a', { getItems: () => ({ items: [], label: 'First' }) })
      registry.registerItemProvider('b', { getItems: () => ({ items: [], label: 'Second' }) })
      expect(lastEmit(eventBus)).toEqual({ items: [], multiselectable: false, label: 'First' })
    })

    test('falls back to a later provider\'s label when an earlier one declares none', () => {
      const eventBus = makeEventBus()
      const registry = createSpatialListRegistry({ eventBus })
      registry.registerItemProvider('a', { getItems: () => ({ items: [] }) }) // no label
      registry.registerItemProvider('b', { getItems: () => ({ items: [], label: 'Second' }) })
      expect(lastEmit(eventBus)).toEqual({ items: [], multiselectable: false, label: 'Second' })
    })

    test('label is undefined when nothing is registered', () => {
      const eventBus = makeEventBus()
      const registry = createSpatialListRegistry({ eventBus })
      registry.registerItemProvider('a', { getItems: () => ({ items: [] }) })
      expect(lastEmit(eventBus)).toEqual({ items: [], multiselectable: false })
    })
  })

  describe('focusable', () => {
    test('passes through the exclusive claimant\'s own focusable: false while its claim is held', () => {
      const eventBus = makeEventBus()
      const registry = createSpatialListRegistry({ eventBus })
      registry.registerItemProvider('interact', { getItems: () => ({ items: [] }) }) // focusable defaults true
      registry.registerItemProvider('draw', { getItems: () => ({ items: [], focusable: false }), exclusive: true })

      registry.claimExclusive('draw')
      expect(lastEmit(eventBus)).toEqual({ items: [], multiselectable: false, focusable: false })
    })

    test('reverts to undefined (consumer default: focusable) once the claim is released', () => {
      const eventBus = makeEventBus()
      const registry = createSpatialListRegistry({ eventBus })
      registry.registerItemProvider('interact', { getItems: () => ({ items: [] }) })
      registry.registerItemProvider('draw', { getItems: () => ({ items: [], focusable: false }), exclusive: true })
      registry.claimExclusive('draw')

      registry.releaseExclusive('draw')
      expect(lastEmit(eventBus)).toEqual({ items: [], multiselectable: false })
    })

    test('uses the first additive provider\'s explicit focusable value when more than one contributes', () => {
      const eventBus = makeEventBus()
      const registry = createSpatialListRegistry({ eventBus })
      registry.registerItemProvider('a', { getItems: () => ({ items: [] }) }) // no explicit value
      registry.registerItemProvider('b', { getItems: () => ({ items: [], focusable: false }) })
      expect(lastEmit(eventBus)).toEqual({ items: [], multiselectable: false, focusable: false })
    })

    test('focusable is undefined when nothing declares it', () => {
      const eventBus = makeEventBus()
      const registry = createSpatialListRegistry({ eventBus })
      registry.registerItemProvider('a', { getItems: () => ({ items: [] }) })
      expect(lastEmit(eventBus)).toEqual({ items: [], multiselectable: false })
    })
  })

  test('clear removes every provider and any exclusive claim', () => {
    const eventBus = makeEventBus()
    const registry = createSpatialListRegistry({ eventBus })
    registry.registerItemProvider('a', { getItems: () => ({ items: [{ id: '1' }] }), exclusive: true })
    registry.claimExclusive('a')

    registry.clear()
    eventBus.emit.mockClear()
    registry.notifyItemsChanged('a') // 'a' is no longer registered
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('a provider whose getItems returns nothing contributes no items and does not throw', () => {
    const eventBus = makeEventBus()
    const registry = createSpatialListRegistry({ eventBus })
    expect(() => registry.registerItemProvider('a', { getItems: () => undefined })).not.toThrow()
    expect(lastEmit(eventBus)).toEqual({ items: [], multiselectable: false })
  })

  test('an exclusive provider whose getItems returns nothing contributes no items while holding the claim', () => {
    const eventBus = makeEventBus()
    const registry = createSpatialListRegistry({ eventBus })
    registry.registerItemProvider('draw', { getItems: () => undefined, exclusive: true })
    expect(() => registry.claimExclusive('draw')).not.toThrow()
    expect(lastEmit(eventBus)).toEqual({ items: [], multiselectable: false })
  })
})
