import DirectSelect from '../../../../../node_modules/@mapbox/mapbox-gl-draw/src/modes/direct_select.js'
import { spatialNavigate } from '../utils/spatial.js'
import {
  getSnapInstance, isSnapActive, isSnapEnabled, getSnapLngLat,
  getSnapRadius, triggerSnapAtPoint, clearSnapIndicator, clearSnapState
} from '../utils/snapHelpers.js'
import {
  getCoords,
  getRingSegments,
  getSegmentForIndex,
  getModifiableCoords,
  coordPathToFlatIndex
} from './editVertex/geometryHelpers.js'

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
const ARROW_OFFSETS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }
const NUDGE = 1, STEP = 5

const touchVertexTarget = `
  <svg width='48' height='48' viewBox='0 0 48 48' fill-rule='evenodd' style='display:none;position:absolute;top:50%;left:50%;margin:24px 0 0 -24px' class='touch-vertex-target' data-touch-vertex-target>
    <circle cx='24' cy='24' r='24' fill='currentColor'/>
    <path d="M37.543 25H34a1 1 0 1 1 0-2h3.629l-.836-.837a1 1 0 0 1 1.414-1.414l2.5 2.501A1 1 0 0 1 41 24a1 1 0 0 1-.487.858l-2.306 2.306a1 1 0 0 1-1.414-1.414l.75-.75zM23 10.414l-.793.793a1 1 0 0 1-1.414-1.414l2.5-2.5C23.481 7.105 23.734 7 24 7s.519.105.707.293l2.5 2.5a1 1 0 0 1-1.414 1.414L25 10.414V14a1 1 0 1 1-2 0v-3.586zM7 24a1 1 0 0 1 .293-.75l2.5-2.501a1 1 0 0 1 1.414 1.414l-.836.837H14a1 1 0 1 1 0 2h-3.543l.75.75a1 1 0 0 1-1.414 1.414l-2.306-2.306A1 1 0 0 1 7 24zm16.293 16.707l-2.5-2.5a1 1 0 0 1 1.414-1.414l.793.793V34a1 1 0 1 1 2 0v3.586l.793-.793a1 1 0 0 1 1.414 1.414l-2.5 2.5c-.188.188-.441.293-.707.293s-.519-.105-.707-.293zM24 20c2.208 0 4 1.792 4 4s-1.792 4-4 4-4-1.792-4-4 1.792-4 4-4z" fill="#fff"/>
  </svg>
`

const scalePoint = (point, scale) => ({ x: point.x * scale, y: point.y * scale })
const isOnSVG = (el) => el instanceof window.SVGElement || el.ownerSVGElement

export const EditVertexMode = {
  ...DirectSelect,

  onSetup(options) {
    const state = DirectSelect.onSetup.call(this, options)
    Object.assign(state, {
      container: options.container,
      interfaceType: options.interfaceType,
      deleteVertexButtonId: options.deleteVertexButtonId,
      undoButtonId: options.undoButtonId,
      isPanEnabled: options.isPanEnabled,
      getSnapEnabled: options.getSnapEnabled,
      featureId: state.featureId || options.featureId,
      selectedVertexIndex: options.selectedVertexIndex ?? -1,
      selectedVertexType: options.selectedVertexType,
      coordPath: options.coordPath,
      scale: options.scale ?? 1
    })

    // Get feature type for later reference
    const feature = this.getFeature(state.featureId)
    state.featureType = feature?.type

    state.vertecies = this.getVerticies(state.featureId)
    state.midpoints = this.getMidpoints(state.featureId)
    this.setupEventListeners(state)

    if (options.selectedVertexType === 'midpoint') {
      // Clear any vertex selection when switching to midpoint
      state.selectedCoordPaths = []
      this.clearSelectedCoordinates()
      // Force feature re-render to clear vertex highlights
      if (state.feature) {
        state.feature.changed()
      }
      this._ctx.store.render()
      this.updateMidpoint(state.midpoints[options.selectedVertexIndex - state.vertecies.length])
    } else if (options.selectedVertexIndex === -1) {
      // Explicitly clear selection when re-entering with no vertex selected
      state.selectedCoordPaths = []
      this.clearSelectedCoordinates()
      if (state.feature) {
        state.feature.changed()
      }
      this._ctx.store.render()
    }
    this.addTouchVertexTarget(state)

    // Clear any snap indicator when entering edit mode
    const snap = getSnapInstance(this.map)
    if (snap) {
      clearSnapIndicator(snap, this.map)
    }

    // Show touch target if entering with a selected vertex on touch interface
    if (state.interfaceType === 'touch' && state.selectedVertexIndex >= 0 && state.selectedVertexType === 'vertex') {
      const vertex = state.vertecies[state.selectedVertexIndex]
      if (vertex) {
        setTimeout(() => {
          this.updateTouchVertexTarget(state, scalePoint(this.map.project(vertex), state.scale))
        }, 0)
      }
    }

    // Ignore pointermove deselection briefly after setup to let Safari settle
    state._ignorePointermoveDeselect = true
    setTimeout(() => { state._ignorePointermoveDeselect = false }, 100)

    return state
  },

  setupEventListeners(state) {
    const bind = (fn) => (e) => fn.call(this, state, e)
    const h = this.handlers = {
      keydown: bind(this.onKeydown), keyup: bind(this.onKeyup),
      pointerdown: bind(this.onPointerevent), pointermove: bind(this.onPointerevent), pointerup: bind(this.onPointerevent),
      click: bind(this.onButtonClick),
      touchstart: bind(this.onTouchstart), touchmove: bind(this.onTouchmove), touchend: bind(this.onTouchend),
      selectionchange: bind(this.onSelectionChange), scalechange: bind(this.onScaleChange),
      update: bind(this.onUpdate), move: bind(this.onMove)
    }

    window.addEventListener('keydown', h.keydown, { capture: true })
    window.addEventListener('keyup', h.keyup, { capture: true })
    window.addEventListener('click', h.click)
    state.container.addEventListener('pointerdown', h.pointerdown)
    state.container.addEventListener('pointermove', h.pointermove)
    state.container.addEventListener('pointerup', h.pointerup)
    state.container.addEventListener('touchstart', h.touchstart, { passive: false })
    state.container.addEventListener('touchmove', h.touchmove, { passive: false })
    state.container.addEventListener('touchend', h.touchend, { passive: false })
    this.map.on('draw.selectionchange', h.selectionchange)
    this.map.on('draw.scalechange', h.scalechange)
    this.map.on('draw.update', h.update)
    this.map.on('move', h.move)
  },

  onSelectionChange(state, e) {
    const vertexCoord = e.points[e.points.length - 1]?.geometry.coordinates

    // Only update selectedVertexIndex from event if not keyboard mode AND event has valid vertex
    // For keyboard mode or when we have coordPath, trust the existing selectedVertexIndex
    if (state.interfaceType !== 'keyboard' && vertexCoord && !state.coordPath) {
      // No coordPath available - need to search for vertex by coordinates
      const geom = e.features[0]?.geometry
      const coords = getCoords(geom)
      state.selectedVertexIndex = this.findVertexIndex(coords, vertexCoord, state.selectedVertexIndex)
    }
    // If we have coordPath, selectedVertexIndex is already correct from onTap/changeMode

    state.selectedVertexType ??= state.selectedVertexIndex >= 0 ? 'vertex' : null

    this.map.fire('draw.vertexselection', {
      index: state.selectedVertexType === 'vertex' ? state.selectedVertexIndex : -1,
      numVertecies: state.vertecies.length
    })

    // Use vertex from event if available, otherwise fall back to state
    const vertex = vertexCoord || (state.selectedVertexIndex >= 0 ? state.vertecies[state.selectedVertexIndex] : null)
    this.updateTouchVertexTarget(state, vertex ? scalePoint(this.map.project(vertex), state.scale) : null)
  },

  onScaleChange(state, e) {
    state.scale = e.scale
  },

  onUpdate(state) {
    const prev = new Set(state.vertecies.map(c => JSON.stringify(c)))
    if (prev.size === state.vertecies.length) {
      return
    }
    state.selectedVertexIndex = state.vertecies.findIndex(c => !prev.has(JSON.stringify(c)))
    state.selectedVertexType ??= state.selectedVertexIndex >= 0 ? 'vertex' : null
  },

  onKeydown(state, e) {
    state.interfaceType = 'keyboard'
    this.hideTouchVertexIndicator(state)

    if (e.key === ' ' && state.selectedVertexIndex < 0) {
      // Clear snap indicator when starting keyboard selection
      const snap = getSnapInstance(this.map)
      if (snap) {
        clearSnapIndicator(snap, this.map)
      }

      // Ensure we have vertices to select
      if (!state.vertecies?.length) {
        state.vertecies = this.getVerticies(state.featureId)
        state.midpoints = this.getMidpoints(state.featureId)
      }
      if (!state.vertecies?.length) {
        return
      }
      state.isPanEnabled = false
      return this.updateVertex(state)
    }

    if (!e.altKey && ARROW_KEYS.has(e.key) && state.selectedVertexIndex >= 0) {
      e.preventDefault()
      e.stopPropagation()
      if (state.selectedVertexType === 'midpoint') {
        return this.insertVertex(state, e)
      }

      const snap = getSnapInstance(this.map)
      const feature = this.getFeature(state.featureId)
      if (!feature) {
        return
      }
      const coords = getCoords(feature)
      const currentCoord = coords?.[state.selectedVertexIndex]
      if (!currentCoord) {
        return
      }

      // Save starting position for undo (only on first move of sequence)
      if (!state._keyboardMoveStartPosition) {
        state._keyboardMoveStartPosition = [...currentCoord]
        state._keyboardMoveStartIndex = state.selectedVertexIndex
      }

      // Break out of snap by moving outside snap radius
      if (isSnapEnabled(state) && state._isSnapped && snap) {
        const offset = getSnapRadius(snap) + 1
        const pt = this.map.project(currentCoord)
        const [dx, dy] = ARROW_OFFSETS[e.key].map(v => v * offset)
        state._isSnapped = false
        clearSnapIndicator(snap, this.map)
        return this.moveVertex(state, this.map.unproject({ x: pt.x + dx, y: pt.y + dy }))
      }

      const newCoord = this.getNewCoord(state, e)
      if (isSnapEnabled(state) && snap) {
        triggerSnapAtPoint(snap, this.map, this.map.project(newCoord))
        if (isSnapActive(snap)) {
          state._isSnapped = true
          return this.moveVertex(state, getSnapLngLat(snap))
        }
      }
      state._isSnapped = false
      return this.moveVertex(state, newCoord)
    }

    if (e.altKey && ARROW_KEYS.has(e.key) && state.selectedVertexIndex >= 0) {
      e.preventDefault()
      e.stopPropagation()
      return this.updateVertex(state, e.key)
    }

    if (e.key === 'Escape') {
      this.changeMode(state, { isPanEnabled: true, selectedVertexIndex: -1, selectedVertexType: null })
    }

    // Undo with Cmd/Ctrl+Z (works without viewport focus, but not in input fields)
    if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      return this.handleUndo(state)
    }
  },

  onKeyup(state, e) {
    state.interfaceType = 'keyboard'
    if (ARROW_KEYS.has(e.key) && state.selectedVertexIndex >= 0) {
      e.stopPropagation()

      // Push undo for keyboard move sequence
      if (state._keyboardMoveStartPosition && state._keyboardMoveStartIndex !== undefined) {
        this.pushUndo({
          type: 'move_vertex',
          featureId: state.featureId,
          vertexIndex: state._keyboardMoveStartIndex,
          previousPosition: state._keyboardMoveStartPosition
        })
        state._keyboardMoveStartPosition = null
        state._keyboardMoveStartIndex = undefined
      }
    }
    if (e.key === 'Delete') {
      this.deleteVertex(state)
    }
  },

  onMouseDown(state, e) {
    clearSnapState(getSnapInstance(this.map))
    const meta = e.featureTarget?.properties.meta
    const coordPath = e.featureTarget?.properties.coord_path

    if (['vertex', 'midpoint'].includes(meta)) {
      state.dragMoveLocation = e.lngLat
      state.dragMoving = false
      DirectSelect.onMouseDown.call(this, state, e)

      // Update selection state for vertex clicks (so onSelectionChange has correct context)
      if (meta === 'vertex' && coordPath) {
        const feature = this.getFeature(state.featureId)
        const vertexIndex = coordPathToFlatIndex(feature, coordPath)
        state.selectedVertexIndex = vertexIndex
        state.selectedVertexType = 'vertex'
        state.coordPath = coordPath
        const vertex = state.vertecies?.[vertexIndex]
        if (vertex) {
          state._moveStartPosition = [...vertex]
          state._moveStartIndex = vertexIndex
        }
      }
    }
    if (meta === 'midpoint') {
      // DirectSelect converts midpoint to vertex - track this as an insert
      const feature = this.getFeature(state.featureId)
      const insertedIndex = coordPathToFlatIndex(feature, coordPath)

      // Track this insertion for undo (will be pushed on mouseUp if drag occurred)
      state._insertedVertexIndex = insertedIndex
      state._isInsertingVertex = true

      state.selectedVertexIndex = this.getVertexIndexFromMidpoint(state, coordPath)
      state.selectedVertexType = 'vertex'
      state.coordPath = null // Clear coordPath for midpoints
      this.map.fire('draw.vertexselection', { index: state.selectedVertexIndex, numVertecies: state.vertecies.length })
    }
  },

  onMouseUp(state, e) {
    clearSnapState(getSnapInstance(this.map))

    // Check if vertex actually moved by comparing current position to start position
    // This is more robust than relying on state.dragMoving which can be inconsistent
    // IMPORTANT: Get current position from the feature, not state.vertecies (which is cached)
    let vertexMoved = false
    if (state._moveStartPosition && state._moveStartIndex !== undefined) {
      const feature = this.getFeature(state.featureId)
      if (feature) {
        const currentVertex = getCoords(feature)?.[state._moveStartIndex]
        if (currentVertex) {
          vertexMoved = currentVertex[0] !== state._moveStartPosition[0] ||
                        currentVertex[1] !== state._moveStartPosition[1]
        }
      }
    }

    // Also check for insertions (dragMoving is reliable for midpoint drags)
    const wasInsertion = state._isInsertingVertex && state._insertedVertexIndex !== undefined

    if (state.dragMoving || vertexMoved || wasInsertion) {
      this.syncVertices(state)

      // Push undo for vertex insertion (from dragging midpoint)
      if (wasInsertion) {
        this.pushUndo({
          type: 'insert_vertex',
          featureId: state.featureId,
          vertexIndex: state._insertedVertexIndex
        })
        state._isInsertingVertex = false
        state._insertedVertexIndex = undefined
      }
      // Push undo for the move if vertex actually moved
      else if (vertexMoved && state._moveStartPosition && state._moveStartIndex !== undefined) {
        this.pushUndo({
          type: 'move_vertex',
          featureId: state.featureId,
          vertexIndex: state._moveStartIndex,
          previousPosition: state._moveStartPosition
        })
      }
    }

    // Clean up move state
    state._moveStartPosition = null
    state._moveStartIndex = null

    DirectSelect.onMouseUp.call(this, state, e)
  },

  onPointerevent(state, e) {
    state.interfaceType = e.pointerType === 'touch' ? 'touch' : 'pointer'
    state.isPanEnabled = true
    if (e.pointerType === 'touch' && e.type === 'pointermove' && !isOnSVG(e.target.parentNode) && !state._ignorePointermoveDeselect) {
      this.changeMode(state, { selectedVertexIndex: -1, selectedVertexType: null, coordPath: null })
    }
  },

  // Empty stubs required by DirectSelect
  onTouchStart() {},
  onTouchMove() {},
  onTouchEnd() {},

  onTouchend(state) {
    clearSnapState(getSnapInstance(this.map))
    if (state?.featureId) {
      this.syncVertices(state)

      // Push undo for the move if touch actually moved
      if (state._touchMoved && state._moveStartPosition && state._moveStartIndex !== undefined) {
        this.pushUndo({
          type: 'move_vertex',
          featureId: state.featureId,
          vertexIndex: state._moveStartIndex,
          previousPosition: state._moveStartPosition
        })
      }
      state._moveStartPosition = null
      state._moveStartIndex = undefined
      state._touchMoved = false
    }
  },

  clickNoTarget(state) {
    this.changeMode(state, { selectedVertexIndex: -1, selectedVertexType: null, isPanEnabled: true })
  },

  onTap(state, e) {
    // Hide snap indicator on any tap
    const snap = getSnapInstance(this.map)
    if (snap) {
      clearSnapIndicator(snap, this.map)
    }

    const meta = e.featureTarget?.properties.meta
    const coordPath = e.featureTarget?.properties.coord_path

    if (meta === 'vertex') {
      const feature = this.getFeature(state.featureId)
      const idx = coordPathToFlatIndex(feature, coordPath)
      this.changeMode(state, {
        selectedVertexIndex: idx,
        selectedVertexType: 'vertex',
        coordPath
      })
    } else if (meta === 'midpoint') {
      this.insertVertex({ ...state, selectedVertexIndex: this.getVertexIndexFromMidpoint(state, coordPath), selectedVertexType: 'midpoint' })
    } else {
      this.clickNoTarget(state)
    }
  },

  onTouchstart(state, e) {
    clearSnapState(getSnapInstance(this.map))
    const vertex = state.vertecies?.[state.selectedVertexIndex]
    if (!vertex || !isOnSVG(e.target.parentNode)) {
      return
    }

    // Save starting position for undo
    state._moveStartPosition = [...vertex]
    state._moveStartIndex = state.selectedVertexIndex
    state._touchMoved = false

    const touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    const style = window.getComputedStyle(state.touchVertexTarget)
    state.deltaTarget = { x: touch.x - Number.parseFloat(style.left), y: touch.y - Number.parseFloat(style.top) }
    const vertexPt = this.map.project(vertex)
    state.deltaVertex = { x: (touch.x / state.scale) - vertexPt.x, y: (touch.y / state.scale) - vertexPt.y }
  },

  onTouchmove(state, e) {
    if (state.selectedVertexIndex < 0 || !isOnSVG(e.target.parentNode)) {
      return
    }

    state._touchMoved = true

    const touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    const screenPt = { x: (touch.x / state.scale) - state.deltaVertex.x, y: (touch.y / state.scale) - state.deltaVertex.y }

    let finalCoord = this.map.unproject(screenPt)
    if (isSnapEnabled(state)) {
      const snap = getSnapInstance(this.map)
      triggerSnapAtPoint(snap, this.map, screenPt)
      finalCoord = getSnapLngLat(snap) || finalCoord
    }

    this.moveVertex(state, finalCoord)
    this.updateTouchVertexTarget(state, { x: touch.x - state.deltaTarget.x, y: touch.y - state.deltaTarget.y })
  },

  onDrag(state, e) {
    if (state.interfaceType === 'touch') {
      return
    }

    this.map.fire('draw.geometrychange', state.feature)

    const snap = getSnapInstance(this.map)
    if (snap) {
      snap.snapStatus = false
      snap.snapCoords = null
    }

    if (!isSnapEnabled(state) || !snap?.status) {
      DirectSelect.onDrag.call(this, state, e)
      return
    }

    if (!state.selectedCoordPaths?.length || !state.canDragMove) {
      return
    }

    state.dragMoving = true
    e.originalEvent.stopPropagation()
    triggerSnapAtPoint(snap, this.map, e.point)

    const finalLngLat = getSnapLngLat(snap) || e.lngLat
    state.feature.updateCoordinate(state.selectedCoordPaths[0], finalLngLat.lng, finalLngLat.lat)
    state.dragMoveLocation = e.lngLat
  },

  onMove(state) {
    const vertex = state.vertecies[state.selectedVertexIndex]
    if (vertex) {
      this.updateTouchVertexTarget(state, scalePoint(this.map.project(vertex), state.scale))
    }
  },

  onButtonClick(state, e) {
    if (e.target.closest(`#${state.deleteVertexButtonId}`) && state.selectedVertexType === 'vertex') {
      this.deleteVertex(state)
    }
    if (e.target.closest(`#${state.undoButtonId}`)) {
      this.handleUndo(state)
    }
  },

  handleUndo(state) {
    const undoStack = this.map._undoStack
    if (!undoStack || undoStack.length === 0) {
      return
    }

    const op = undoStack.pop()

    if (op.type === 'move_vertex') {
      this.undoMoveVertex(state, op)
    } else if (op.type === 'insert_vertex') {
      this.undoInsertVertex(state, op)
    } else if (op.type === 'delete_vertex') {
      this.undoDeleteVertex(state, op)
    }
  },

  // Utility methods
  findVertexIndex(coords, targetCoord, currentIdx) {
    // Search for vertex, preferring matches near currentIdx to handle duplicate coords (e.g., closing vertices)
    const matches = []
    coords.forEach((c, i) => {
      if (c[0] === targetCoord[0] && c[1] === targetCoord[1]) {
        matches.push(i)
      }
    })

    if (matches.length === 0) return -1
    if (matches.length === 1) return matches[0]

    // Multiple matches - pick closest to current selection
    if (currentIdx >= 0) {
      return matches.reduce((best, idx) =>
        Math.abs(idx - currentIdx) < Math.abs(best - currentIdx) ? idx : best
      )
    }
    return matches[0]
  },

  getCoordPath(state, idx) {
    const feature = this.getFeature(state.featureId)
    if (!feature) return '0'

    const segments = getRingSegments(feature)
    const result = getSegmentForIndex(segments, idx)
    if (!result) return '0'

    const { segment, localIdx } = result
    return [...segment.path, localIdx].join('.')
  },

  syncVertices(state) {
    state.vertecies = this.getVerticies(state.featureId)
    state.midpoints = this.getMidpoints(state.featureId)
  },

  getVerticies(featureId) {
    return getCoords(this.getFeature(featureId)) || []
  },

  getMidpoints(featureId) {
    const feature = this.getFeature(featureId)
    const coords = getCoords(feature)
    const segments = getRingSegments(feature)
    if (!coords?.length || !segments.length) {
      return []
    }

    const midpoints = []
    // Create midpoints within each segment, respecting boundaries
    for (const seg of segments) {
      // For closed rings, create midpoint between every vertex including last→first
      // For open lines, create midpoints only between consecutive vertices (no wrap-around)
      const count = seg.closed ? seg.length : seg.length - 1
      for (let i = 0; i < count; i++) {
        const idx = seg.start + i
        const nextIdx = seg.start + ((i + 1) % seg.length)
        const [x1, y1] = coords[idx]
        const [x2, y2] = coords[nextIdx]
        midpoints.push([(x1 + x2) / 2, (y1 + y2) / 2])
      }
    }
    return midpoints
  },

  getVertexOrMidpoint(state, direction) {
    // Ensure vertices and midpoints are populated
    if (!state.vertecies?.length) {
      state.vertecies = this.getVerticies(state.featureId)
      state.midpoints = this.getMidpoints(state.featureId)
    }
    if (!state.vertecies?.length) {
      return [-1, null]
    }
    const project = (p) => p ? Object.values(this.map.project(p)) : null
    const pixels = [...state.vertecies.map(project), ...state.midpoints.map(project)].filter(Boolean)
    if (!pixels.length) {
      return [-1, null]
    }
    const start = pixels[state.selectedVertexIndex] || Object.values(this.map.project(this.map.getCenter()))
    const idx = spatialNavigate(start, pixels, direction)
    return [idx, idx < state.vertecies.length ? 'vertex' : 'midpoint']
  },

  getVertexIndexFromMidpoint(state, coordPath) {
    const feature = this.getFeature(state.featureId)
    const segments = getRingSegments(feature)
    const parts = coordPath.split('.').map(Number)

    // Find which segment this coord_path belongs to
    let midpointOffset = 0
    for (const seg of segments) {
      const pathMatches = seg.path.every((val, idx) => val === parts[idx])
      if (pathMatches && parts.length === seg.path.length + 1) {
        // In DirectSelect, midpoint coord_path represents the insertion index
        // The midpoint between vertex N and N+1 has coord_path ending in N+1
        // So our flat midpoint index is one less than the coord_path index
        const insertionIdx = parts[parts.length - 1]
        const localMidpointIdx = insertionIdx > 0 ? insertionIdx - 1 : seg.length - 2
        // Midpoints are indexed after all vertices
        return state.vertecies.length + midpointOffset + localMidpointIdx
      }
      // Count midpoints in this segment (must match getMidpoints calculation)
      const segMidpoints = seg.closed ? seg.length : seg.length - 1
      midpointOffset += segMidpoints
    }

    // Fallback
    return state.vertecies.length
  },

  addTouchVertexTarget(state) {
    let el = state.container.querySelector('[data-touch-vertex-target]')
    if (!el) {
      state.container.insertAdjacentHTML('beforeend', touchVertexTarget)
      el = state.container.querySelector('[data-touch-vertex-target]')
    }
    state.touchVertexTarget = el
  },

  updateTouchVertexTarget(state, point) {
    if (point && state.interfaceType === 'touch' && state.selectedVertexIndex >= 0) {
      Object.assign(state.touchVertexTarget.style, { display: 'block', top: `${point.y}px`, left: `${point.x}px` })
    } else {
      state.touchVertexTarget.style.display = 'none'
    }
  },

  hideTouchVertexIndicator(state) {
    state.touchVertexTarget.style.display = 'none'
  },

  updateMidpoint(coordinates) {
    setTimeout(() => {
      this.map.getSource('mapbox-gl-draw-hot').setData({
        type: 'Feature',
        properties: { meta: 'midpoint', active: 'true', id: 'active-midpoint' },
        geometry: { type: 'Point', coordinates }
      })
    }, 0)
  },

  updateVertex(state, direction) {
    const [idx, type] = this.getVertexOrMidpoint(state, direction)
    if (idx < 0 || !type) {
      return
    }
    this.changeMode(state, { selectedVertexIndex: idx, selectedVertexType: type, ...(type === 'vertex' && { coordPath: this.getCoordPath(state, idx) }) })
  },

  getOffset(coord, e) {
    const pt = this.map.project(coord)
    const offset = e?.shiftKey ? NUDGE : STEP
    const [dx, dy] = e ? ARROW_OFFSETS[e.key].map(v => v * offset) : [0, 0]
    return this.map.unproject({ x: pt.x + dx, y: pt.y + dy })
  },

  getNewCoord(state, e) {
    return this.getOffset(getCoords(this.getFeature(state.featureId))[state.selectedVertexIndex], e)
  },

  insertVertex(state, e) {
    const midIdx = state.selectedVertexIndex - state.vertecies.length
    const newCoord = this.getOffset(state.midpoints[midIdx], e)
    const feature = this.getFeature(state.featureId)
    const geojson = feature.toGeoJSON()

    // Find which segment this midpoint belongs to and calculate insertion position
    const segments = getRingSegments(feature)
    let globalInsertIdx = midIdx + 1
    let insertSegment = null
    let localInsertIdx = 0

    // Map midpoint index to segment and local position
    let midpointCounter = 0
    for (const seg of segments) {
      // Must match getMidpoints calculation
      const segMidpoints = seg.closed ? seg.length : seg.length - 1
      if (midIdx < midpointCounter + segMidpoints) {
        insertSegment = seg
        localInsertIdx = (midIdx - midpointCounter) + 1
        globalInsertIdx = seg.start + localInsertIdx
        break
      }
      midpointCounter += segMidpoints
    }

    if (!insertSegment) return

    const coords = getModifiableCoords(geojson, insertSegment.path)
    coords.splice(localInsertIdx, 0, [newCoord.lng, newCoord.lat])
    this._ctx.api.add(geojson)

    this.pushUndo({ type: 'insert_vertex', featureId: state.featureId, vertexIndex: globalInsertIdx })
    this.changeMode(state, { selectedVertexIndex: globalInsertIdx, selectedVertexType: 'vertex', coordPath: this.getCoordPath(state, globalInsertIdx) })
  },

  moveVertex(state, coord, options = {}) {
    if (options.checkSnap && state.enableSnap !== false) {
      const snap = this.map._snapInstance
      if (snap?.snapStatus && snap.snapCoords?.length >= 2) {
        coord = { lng: snap.snapCoords[0], lat: snap.snapCoords[1] }
      }
    }

    const feature = this.getFeature(state.featureId)
    const geojson = feature.toGeoJSON()
    const segments = getRingSegments(feature)
    const result = getSegmentForIndex(segments, state.selectedVertexIndex)
    if (!result) return

    const coords = getModifiableCoords(geojson, result.segment.path)
    coords[result.localIdx] = [coord.lng, coord.lat]
    this._ctx.api.add(geojson)
    state.vertecies = this.getVerticies(state.featureId)

    this.map.fire('draw.geometrychange', state.feature)
  },

  deleteVertex(state) {
    const feature = this.getFeature(state.featureId)
    if (!feature) {
      return
    }

    const segments = getRingSegments(feature)
    const result = getSegmentForIndex(segments, state.selectedVertexIndex)
    if (!result) {
      return
    }

    const { segment } = result
    // Minimum vertices per segment: 3 for closed rings (mapbox-gl-draw's internal representation), 2 for lines
    const minVertices = segment.closed ? 3 : 2
    if (segment.length <= minVertices) {
      return
    }

    // Save position for undo before deletion
    const deletedPosition = [...state.vertecies[state.selectedVertexIndex]]
    const deletedIndex = state.selectedVertexIndex

    this._ctx.api.trash()

    // Clear DirectSelect's coordinate selection to prevent visual artifacts
    this.clearSelectedCoordinates()
    // Force feature re-render to clear vertex highlights
    feature.changed()
    this._ctx.store.render()

    // Push undo operation
    this.pushUndo({
      type: 'delete_vertex',
      featureId: state.featureId,
      vertexIndex: deletedIndex,
      position: deletedPosition
    })

    // Clear selection after delete
    this.changeMode(state, { selectedVertexIndex: -1, selectedVertexType: null })
  },

  // Prevent selecting other features
  changeMode(state, updates) {
    if (!state.featureId) {
      return
    }
    this._ctx.api.changeMode('edit_vertex', { ...state, ...updates })
  },

  // Fire geometry change event (for external listeners)
  fireGeometryChange(state) {
    const feature = this.getFeature(state.featureId)
    if (feature) {
      this.map.fire('draw.update', {
        features: [feature.toGeoJSON()],
        action: 'change_coordinates'
      })
    }
  },

  // Undo support
  pushUndo(operation) {
    const undoStack = this.map._undoStack
    if (!undoStack) {
      return
    }
    undoStack.push(operation)
  },

  undoMoveVertex(state, op) {
    const { vertexIndex, previousPosition, featureId } = op
    const feature = this.getFeature(featureId)
    if (!feature) return

    const geojson = feature.toGeoJSON()
    const segments = getRingSegments(feature)
    const result = getSegmentForIndex(segments, vertexIndex)
    if (!result) return

    const coords = getModifiableCoords(geojson, result.segment.path)
    coords[result.localIdx] = previousPosition
    this._applyUndoAndSync(state, geojson, featureId)

    // Update touch vertex target position
    const vertex = state.vertecies[state.selectedVertexIndex]
    if (vertex) {
      this.updateTouchVertexTarget(state, scalePoint(this.map.project(vertex), state.scale))
    }
  },

  undoInsertVertex(state, op) {
    const { vertexIndex, featureId } = op
    const feature = this.getFeature(featureId)
    if (!feature) return

    const geojson = feature.toGeoJSON()
    const segments = getRingSegments(feature)
    const result = getSegmentForIndex(segments, vertexIndex)
    if (!result) return

    const coords = getModifiableCoords(geojson, result.segment.path)
    coords.splice(result.localIdx, 1)
    this._applyUndoAndSync(state, geojson, featureId)

    // Clear DirectSelect's coordinate selection
    this.clearSelectedCoordinates()
    this.hideTouchVertexIndicator(state)
    this.changeMode(state, { selectedVertexIndex: -1, selectedVertexType: null })
  },

  undoDeleteVertex(state, op) {
    const { vertexIndex, position, featureId } = op
    const feature = this.getFeature(featureId)
    if (!feature) {
      return
    }

    const geojson = feature.toGeoJSON()
    const segments = getRingSegments(feature)

    // Try to find segment containing vertexIndex
    let result = getSegmentForIndex(segments, vertexIndex)

    // If not found, vertex might be at segment boundary
    if (!result) {
      for (const seg of segments) {
        if (vertexIndex === seg.start + seg.length) {
          result = { segment: seg, localIdx: seg.length }
          break
        }
      }
    }

    if (!result) {
      return
    }

    const coords = getModifiableCoords(geojson, result.segment.path)
    coords.splice(result.localIdx, 0, position)
    this._applyUndoAndSync(state, geojson, featureId)

    // Update touch vertex target to restored vertex position
    const vertex = state.vertecies[vertexIndex]
    if (vertex) {
      this.updateTouchVertexTarget(state, scalePoint(this.map.project(vertex), state.scale))
    }
    this.changeMode(state, { selectedVertexIndex: vertexIndex, selectedVertexType: 'vertex', coordPath: this.getCoordPath(state, vertexIndex) })
  },

  _applyUndoAndSync(state, geojson, featureId) {
    this._ctx.api.add(geojson)
    state.vertecies = this.getVerticies(featureId)
    state.midpoints = this.getMidpoints(featureId)
    this._ctx.store.render()
    this.fireGeometryChange(state)
  },

  onStop(state) {
    const h = this.handlers
    state.container.removeEventListener('pointerdown', h.pointerdown)
    state.container.removeEventListener('pointermove', h.pointermove)
    state.container.removeEventListener('pointerup', h.pointerup)
    state.container.removeEventListener('touchstart', h.touchstart)
    state.container.removeEventListener('touchmove', h.touchmove)
    state.container.removeEventListener('touchend', h.touchend)
    this.map.off('draw.selectionchange', h.selectionchange)
    this.map.off('draw.scalechange', h.scalechange)
    this.map.off('draw.update', h.update)
    this.map.off('move', h.move)
    this.map.dragPan.enable()
    window.removeEventListener('click', h.click)
    window.removeEventListener('keydown', h.keydown, { capture: true })
    window.removeEventListener('keyup', h.keyup, { capture: true })
    this.hideTouchVertexIndicator(state)
  }
}
