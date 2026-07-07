import { setup, clickAt, firedWith, activeSnap, DrawPolygonMode, DrawLineMode, CENTER } from './__helpers__/harness.js'

describe('touch and pointer interface', () => {
  test('touch start/end switch to touch interface and show the crosshair', () => {
    const { ctx, state, marker } = setup(DrawPolygonMode)
    ctx.onTouchStart(state, {})
    expect(state.interfaceType).toBe('touch')
    expect(marker.style.display).toBe('block')
    ctx.onTouchEnd(state, {})
    expect(state.interfaceType).toBe('touch')
  })

  test('non-touch pointerdown switches back to mouse without showing the crosshair; touch does not', () => {
    const { ctx, state, marker } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    ctx.map.fire('pointerdown', { pointerType: 'mouse' })
    expect(state.interfaceType).toBe('mouse')
    expect(marker.style.display).toBe('block') // unchanged, not re-shown or hidden

    ctx.map.fire('pointerdown', { pointerType: 'touch' })
    expect(state.interfaceType).toBe('mouse')
  })

  test('mouse pointermove hides the crosshair; touch pointermove does not', () => {
    const { ctx, marker } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    ctx.pointermoveHandler({ pointerType: 'touch' })
    expect(marker.style.display).toBe('block')
    ctx.pointermoveHandler({ pointerType: 'mouse' })
    expect(marker.style.display).toBe('none')
  })

  test('pointerup reports the current vertex count', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    ctx.map.fire.mockClear()
    ctx.pointerupHandler({})
    expect(firedWith(ctx.map, 'draw.vertexchange')).toEqual([{ numVertecies: 1 }])
  })

  test('blur away from the container hides the crosshair; blur on the container does not', () => {
    const { ctx, marker, container } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    ctx.blurHandler({ target: container })
    expect(marker.style.display).toBe('block')
    ctx.blurHandler({ target: document.body })
    expect(marker.style.display).toBe('none')
  })
})

describe('rubber band and snapping while moving', () => {
  test('onMouseMove moves the rubber band, preferring the snapped position', () => {
    const { ctx, state } = setup(DrawPolygonMode, { getSnapEnabled: () => true })
    clickAt(ctx, state, 0, 0)
    ctx.map._snapInstance = activeSnap()
    ctx.onMouseMove(state, { lngLat: { lng: 3, lat: 3 }, point: { x: 3, y: 3 } })
    expect(ctx.map._snapInstance.snapToClosestPoint).toHaveBeenCalled()
    expect(state.polygon.coordinates[0].at(-1)).toEqual([9, 9])
    expect(firedWith(ctx.map, 'draw.geometrychange').length).toBeGreaterThan(0)
  })

  test('onMouseMove without snap uses the pointer position', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    ctx.onMouseMove(state, { lngLat: { lng: 3, lat: 3 }, point: { x: 3, y: 3 } })
    expect(state.polygon.coordinates[0].at(-1)).toEqual([3, 3])
  })

  test('onMouseMove with snapping enabled but no snap point falls back to the pointer position', () => {
    const { ctx, state } = setup(DrawPolygonMode, { getSnapEnabled: () => true })
    clickAt(ctx, state, 0, 0)
    ctx.map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
    ctx.onMouseMove(state, { lngLat: { lng: 3, lat: 3 }, point: { x: 3, y: 3 } })
    expect(state.polygon.coordinates[0].at(-1)).toEqual([3, 3])
  })

  test('map move in keyboard interface keeps the rubber band at center, or at the snap point when snapping', () => {
    const { ctx, state } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    clickAt(ctx, state, 0, 0)
    ctx.map.fire('move')
    expect(state.polygon.coordinates[0].at(-1)).toEqual([CENTER.lng, CENTER.lat])

    state.getSnapEnabled = () => true
    ctx.map._snapInstance = activeSnap()
    ctx.map.fire('move')
    expect(ctx.map._snapInstance.snapToClosestPoint).toHaveBeenCalled()
    expect(state.polygon.coordinates[0].at(-1)).toEqual([9, 9])
  })

  test('map move in mouse interface leaves the rubber band alone', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    const before = [...state.polygon.coordinates[0].map((c) => [...c])]
    ctx.map.fire('move')
    expect(state.polygon.coordinates[0]).toEqual(before)
  })

  test('map move in keyboard line mode with snap fires geometrychange with state.line', () => {
    const { ctx, state } = setup(DrawLineMode, { interfaceType: 'keyboard', getSnapEnabled: () => true })
    clickAt(ctx, state, 0, 0)
    ctx.map._snapInstance = activeSnap()
    ctx.map.fire.mockClear()
    ctx.map.fire('move')
    expect(firedWith(ctx.map, 'draw.geometrychange').pop()).toBe(state.line)
  })
})
