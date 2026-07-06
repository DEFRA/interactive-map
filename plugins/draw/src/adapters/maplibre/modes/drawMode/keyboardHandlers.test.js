import { setup, clickAt, firedWith, DrawPolygonMode } from './__helpers__/harness.js'

describe('keyboard interface', () => {
  test('arrow keys switch to keyboard interface, show the crosshair and move the rubber band to center', () => {
    const { ctx, state, marker, container } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    container.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(state.interfaceType).toBe('keyboard')
    expect(marker.style.display).toBe('block')
    expect(state.polygon.coordinates[0].at(-1)).toEqual([5, 5])
    expect(firedWith(ctx.map, 'draw.geometrychange').length).toBeGreaterThan(0)
  })

  test('other keys, unfocused container and Escape do not switch interface', () => {
    const { ctx, state, marker, container } = setup(DrawPolygonMode)
    ctx.keydownHandler(new KeyboardEvent('keydown', { key: 'ArrowRight' })) // container not focused
    container.focus()
    ctx.keydownHandler(new KeyboardEvent('keydown', { key: 'a' }))
    ctx.keydownHandler(new KeyboardEvent('keydown', { key: 'Escape' }))
    ctx.keyupHandler(new KeyboardEvent('keyup', { key: 'a' }))
    expect(state.interfaceType).toBe('mouse')
    expect(marker.style.display).toBe('none')
  })

  test('keyup without focus is ignored', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.keyupHandler(new KeyboardEvent('keyup', { key: 'ArrowRight' }))
    expect(state.interfaceType).toBe('mouse')
  })

  test('Enter down then up places a vertex at center', () => {
    const { ctx, state, container } = setup(DrawPolygonMode)
    container.focus()
    ctx.keydownHandler(new KeyboardEvent('keydown', { key: 'Enter' }))
    ctx.keyupHandler(new KeyboardEvent('keyup', { key: 'Enter' }))
    expect(state.isActive).toBe(true)
    expect(state.polygon.coordinates[0][0]).toEqual([5, 5])
  })

  test('Escape keyup cancels drawing for mouse/touch but not keyboard', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.keyupHandler(new KeyboardEvent('keyup', { key: 'Escape' }))
    expect(firedWith(ctx.map, 'draw.cancel')).toHaveLength(1)

    state.interfaceType = 'keyboard'
    ctx.keyupHandler(new KeyboardEvent('keyup', { key: 'Escape' }))
    expect(firedWith(ctx.map, 'draw.cancel')).toHaveLength(1)
  })

  test('keyup of a non-Enter interface key while focused switches interface without committing a vertex', () => {
    const { ctx, state, container } = setup(DrawPolygonMode)
    container.focus()
    ctx.keyupHandler(new KeyboardEvent('keyup', { key: 'ArrowRight' }))
    expect(state.interfaceType).toBe('keyboard')
    expect(ctx.map._undoStack.length).toBe(0)
  })

  test('container keyUp with the container itself focused and a non-Escape key does not defer to the parent', () => {
    const { ctx, state, container } = setup(DrawPolygonMode)
    container.focus()
    ctx.onKeyUp(state, { key: 'a' })
    expect(ctx.changeMode).not.toHaveBeenCalled()
  })

  test('Escape during keyboard drawing with no undo stack still reinitialises the feature', () => {
    const { ctx, state, container } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    clickAt(ctx, state, 0, 0)
    container.focus()
    const id = state.polygon.id
    ctx.map._undoStack = null
    ctx.onKeyUp(state, { key: 'Escape' })
    expect(ctx._ctx.store.delete).toHaveBeenCalledWith([id])
  })
})
