import { setup, firedWith, DrawPolygonMode, DrawLineMode } from './__helpers__/harness.js'

describe('setup and crosshair', () => {
  test('mouse interface hides the vertex marker, keyboard shows it', () => {
    const mouse = setup(DrawPolygonMode)
    expect(mouse.marker.style.display).toBe('none')

    const keyboard = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    expect(keyboard.marker.style.display).toBe('block')
  })

  test('getInterfaceType() takes precedence over the static interfaceType option', () => {
    const { state, marker } = setup(DrawPolygonMode, { interfaceType: 'mouse', getInterfaceType: () => 'touch' })
    expect(state.interfaceType).toBe('touch')
    expect(marker.style.display).toBe('block')
  })

  test('a crossHair object is used instead of the vertex marker when provided', () => {
    const crossHair = { show: jest.fn(), hide: jest.fn() }
    const { ctx, state } = setup(DrawPolygonMode, { interfaceType: 'keyboard', crossHair })
    expect(crossHair.show).toHaveBeenCalled()
    ctx.pointermoveHandler({ pointerType: 'mouse' })
    expect(crossHair.hide).toHaveBeenCalled()
    ctx.onBlur(state, { target: document.body })
    expect(crossHair.hide).toHaveBeenCalledTimes(2)
  })

  test('line mode creates a fresh feature even when featureId is passed', () => {
    const { state } = setup(DrawLineMode)
    expect(state.line).toBeDefined()
    expect(state.featureId).toBe('shape-1')
  })

  test('crossHair.activate() delegates to the mode\'s own _placeAtCrossHair — the crosshair button\'s own onClick (CrossHair.jsx) does exactly what Enter/the touch add-vertex button already do', () => {
    const crossHair = { show: jest.fn(), hide: jest.fn() }
    const { ctx, state } = setup(DrawPolygonMode, { interfaceType: 'keyboard', crossHair })
    ctx._placeAtCrossHair = jest.fn()
    state.crossHair.activate()
    expect(ctx._placeAtCrossHair).toHaveBeenCalledWith(state)
  })

  test('crossHair.activate() is a safe no-op for a mode that defines no _placeAtCrossHair', () => {
    const crossHair = { show: jest.fn(), hide: jest.fn() }
    const { state } = setup(DrawPolygonMode, { interfaceType: 'keyboard', crossHair })
    expect(() => state.crossHair.activate()).not.toThrow()
  })

  test('no crossHair provided: nothing to assign activate() on', () => {
    expect(() => setup(DrawPolygonMode, { interfaceType: 'keyboard' })).not.toThrow()
  })
})

describe('onStop', () => {
  test('mouse session: removes listeners, hides the crosshair and reports the final interface type', () => {
    const { ctx, state, marker, container } = setup(DrawPolygonMode, { interfaceType: 'mouse' })
    ctx.onStop(state)
    expect(marker.style.display).toBe('none')
    expect(firedWith(ctx.map, 'draw.interfacetypechange')).toEqual([{ interfaceType: 'mouse' }])

    // Window/container/map listeners are gone: keydown no longer shows the crosshair
    container.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(marker.style.display).toBe('none')
    expect(ctx.map.off).toHaveBeenCalledWith('draw.create', ctx.createHandler)
  })

  // A touch/keyboard session leaving draw mode lands in interact mode, which needs the same
  // crosshair to select the just-placed feature — unlike mouse, onStop must leave it visible.
  test('keyboard session: still removes listeners and reports interface type, but leaves the crosshair visible', () => {
    const { ctx, state, marker, container } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    ctx.onStop(state)
    expect(marker.style.display).toBe('block')
    expect(firedWith(ctx.map, 'draw.interfacetypechange')).toEqual([{ interfaceType: 'keyboard' }])
    expect(ctx.map.off).toHaveBeenCalledWith('draw.create', ctx.createHandler)

    container.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(marker.style.display).toBe('block')
  })

  test('touch session: leaves the crosshair visible too', () => {
    const crossHair = { show: jest.fn(), hide: jest.fn() }
    const { ctx, state } = setup(DrawPolygonMode, { interfaceType: 'touch', crossHair })
    ctx.onStop(state)
    expect(crossHair.hide).not.toHaveBeenCalled()
  })
})
