import { createHarness, LINE } from './__helpers__/harness.js'

describe('vertexQueries', () => {
  test('findVertexIndex handles no, single and duplicate matches', () => {
    const { ctx } = createHarness()
    expect(ctx.findVertexIndex([[0, 0], [1, 1]], [9, 9], -1)).toBe(-1)
    expect(ctx.findVertexIndex([[0, 0], [1, 1]], [1, 1], -1)).toBe(1)
    expect(ctx.findVertexIndex([[0, 0], [1, 1], [0, 0]], [0, 0], 2)).toBe(2)
    expect(ctx.findVertexIndex([[0, 0], [1, 1], [0, 0]], [0, 0], -1)).toBe(0)
    expect(ctx.findVertexIndex([[0, 0], [1, 1], [0, 0]], [0, 0], 0)).toBe(0)
  })

  test('getCoordPath resolves an index, or returns "0" without a feature or segment', () => {
    const { ctx, state } = createHarness()
    expect(ctx.getCoordPath(state, 2)).toBe('0.2')
    expect(ctx.getCoordPath(state, 99)).toBe('0')
    expect(ctx.getCoordPath({ featureId: 'missing' }, 0)).toBe('0')
  })

  test('getVerticies / getMidpoints for closed rings, open lines and missing features', () => {
    const { ctx } = createHarness()
    expect(ctx.getVerticies('feat-1')).toHaveLength(4)
    expect(ctx.getMidpoints('feat-1')).toHaveLength(4)
    expect(ctx.getMidpoints('missing')).toEqual([])
    const line = createHarness(LINE())
    expect(line.ctx.getMidpoints('feat-1')).toHaveLength(2)
  })

  test('syncVertices refreshes the cached vertex and midpoint lists', () => {
    const { ctx, state } = createHarness()
    state.vertecies = []
    state.midpoints = []
    ctx.syncVertices(state)
    expect(state.vertecies).toHaveLength(4)
    expect(state.midpoints).toHaveLength(4)
  })

  test('getVertexOrMidpoint repopulates empty lists, navigates, and guards empty features', () => {
    const { ctx, state } = createHarness()
    state.vertecies = []
    state.selectedVertexIndex = 0
    const [idx, type] = ctx.getVertexOrMidpoint(state, 'ArrowRight')
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(['vertex', 'midpoint']).toContain(type)

    expect(ctx.getVertexOrMidpoint({ featureId: 'missing', vertecies: [] }, 'ArrowRight')).toEqual([-1, null])
    expect(ctx.getVertexOrMidpoint({ ...state, vertecies: [null], midpoints: [], selectedVertexIndex: 0 }, 'ArrowRight')).toEqual([-1, null])

    // Falls back to the map centre when the current index has no pixel, and can resolve a vertex target
    const fresh = createHarness()
    expect(fresh.ctx.getVertexOrMidpoint({ ...fresh.state, selectedVertexIndex: -1 }, 'ArrowRight')[0]).toBeGreaterThanOrEqual(0)
    const types = new Set()
    for (let s = 0; s < fresh.state.vertecies.length + fresh.state.midpoints.length; s++) {
      for (const d of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']) {
        types.add(fresh.ctx.getVertexOrMidpoint({ ...fresh.state, selectedVertexIndex: s }, d)[1])
      }
    }
    expect(types.has('vertex')).toBe(true)
  })

  test('getVertexIndexFromMidpoint maps coord paths (insertion index, wrap-around and fallback)', () => {
    const { ctx, state, features } = createHarness()
    expect(ctx.getVertexIndexFromMidpoint(state, '0.2')).toBe(5)
    expect(ctx.getVertexIndexFromMidpoint(state, '0.0')).toBe(6)
    expect(ctx.getVertexIndexFromMidpoint(state, '5.0')).toBe(4)

    // Counts earlier segments for multi-part geometry (closed and open)
    features.set('multipoly', { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[5, 5], [6, 5], [6, 6], [5, 5]]]] })
    expect(ctx.getVertexIndexFromMidpoint({ ...state, featureId: 'multipoly', vertecies: new Array(8).fill([0, 0]) }, '1.0.1')).toBeGreaterThan(8)
    features.set('multiline', { type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[5, 5], [6, 6]]] })
    expect(ctx.getVertexIndexFromMidpoint({ ...state, featureId: 'multiline', vertecies: new Array(4).fill([0, 0]) }, '1.1')).toBeGreaterThan(4)
  })
})
