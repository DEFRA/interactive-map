import DirectSelect from '../../../../../node_modules/@mapbox/mapbox-gl-draw/src/modes/direct_select.js'
import { spatialNavigate } from '../utils.js'
import {
  getSnapInstance, isSnapActive, isSnapEnabled, getSnapLngLat,
  getSnapRadius, triggerSnapAtPoint, clearSnapIndicator, clearSnapState
} from '../snapHelpers.js'

const ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
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
      isPanEnabled: options.isPanEnabled,
      getSnapEnabled: options.getSnapEnabled,
      featureId: state.featureId || options.featureId,
      selectedVertexIndex: options.selectedVertexIndex ?? -1,
      selectedVertexType: options.selectedVertexType,
      scale: options.scale ?? 1
    })

    // Get feature type for later reference
    const feature = this.getFeature(state.featureId)
    state.featureType = feature?.type

    state.vertecies = this.getVerticies(state.featureId)
    state.midpoints = this.getMidpoints(state.featureId)
    this.setupEventListeners(state)

    if (options.selectedVertexType === 'midpoint') {
      this.updateMidpoint(state.midpoints[options.selectedVertexIndex - state.vertecies.length])
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
      click: bind(this.onVertexButtonClick),
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
    const geom = e.features[0].geometry
    // Polygon coordinates are [[[lng,lat],...]], LineString are [[lng,lat],...]
    const coords = geom.type === 'LineString' ? geom.coordinates : geom.coordinates.flat(1)
    const idx = coords.findIndex(c => vertexCoord && c[0] === vertexCoord[0] && c[1] === vertexCoord[1])

    // Only update selectedVertexIndex from event if not keyboard mode AND event has valid vertex
    if (state.interfaceType !== 'keyboard' && idx >= 0) {
      state.selectedVertexIndex = idx
    }
    state.selectedVertexType ??= state.selectedVertexIndex >= 0 ? 'vertex' : null

    this.map.fire('draw.vertexselection', {
      index: state.selectedVertexType === 'vertex' ? state.selectedVertexIndex : -1,
      numVertecies: state.vertecies.length
    })

    // Use vertex from event if available, otherwise fall back to state
    const vertex = vertexCoord || (state.selectedVertexIndex >= 0 ? state.vertecies[state.selectedVertexIndex] : null)
    this.updateTouchVertexTarget(state, vertex ? scalePoint(this.map.project(vertex), state.scale) : null)
  },

  onScaleChange(state, e) { state.scale = e.scale },

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

    if (!e.altKey && ARROW_KEYS.includes(e.key) && state.selectedVertexIndex >= 0) {
      e.preventDefault()
      e.stopPropagation()
      if (state.selectedVertexType === 'midpoint') {
        return this.insertVertex(state, e)
      }

      const snap = getSnapInstance(this.map)
      const feature = this.getFeature(state.featureId)
      // Polygon coordinates are [[[lng,lat],...]], LineString are [[lng,lat],...]
      const coords = feature.type === 'LineString' ? feature.coordinates : feature.coordinates.flat(1)
      const currentCoord = coords[state.selectedVertexIndex]

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

    if (e.altKey && ARROW_KEYS.includes(e.key) && state.selectedVertexIndex >= 0) {
      e.preventDefault()
      e.stopPropagation()
      return this.updateVertex(state, e.key)
    }

    if (e.key === 'Escape') {
      this.changeMode(state, { isPanEnabled: true, selectedVertexIndex: -1, selectedVertexType: null })
    }
  },

  onKeyup(state, e) {
    state.interfaceType = 'keyboard'
    if (ARROW_KEYS.includes(e.key) && state.selectedVertexIndex >= 0) {
      e.stopPropagation()
    }
    if (e.key === 'Delete') {
      this.deleteVertex(state)
    }
  },

  onMouseDown(state, e) {
    clearSnapState(getSnapInstance(this.map))
    const meta = e.featureTarget?.properties.meta
    if (['vertex', 'midpoint'].includes(meta)) {
      state.dragMoveLocation = e.lngLat
      state.dragMoving = false
      DirectSelect.onMouseDown.call(this, state, e)
    }
    if (meta === 'midpoint') {
      state.selectedVertexIndex = this.getVertexIndexFromMidpoint(state, e.featureTarget.properties.coord_path)
      state.selectedVertexType = 'vertex'
      this.map.fire('draw.vertexselection', { index: state.selectedVertexIndex, numVertecies: state.vertecies.length })
    }
  },

  onMouseUp(state, e) {
    clearSnapState(getSnapInstance(this.map))
    if (state.dragMoving) {
      this.syncVertices(state)
    }
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
  onTouchStart() {}, onTouchMove() {}, onTouchEnd() {},

  onTouchend(state) {
    clearSnapState(getSnapInstance(this.map))
    if (state?.featureId) {
      this.syncVertices(state)
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
      // Extract vertex index - handle both "0.1" (Polygon) and "1" (LineString) formats
      const parts = coordPath.split('.')
      const idx = Number.parseInt(parts[parts.length - 1], 10)
      this.changeMode(state, {
        selectedVertexIndex: idx,
        selectedVertexType: 'vertex', coordPath
      })
    } else if (meta === 'midpoint') {
      this.insertVertex({ ...state, selectedVertexIndex: this.getVertexIndexFromMidpoint(state, coordPath), selectedVertexType: 'midpoint' })
    } else {
      this.clickNoTarget(state)
    }
  },

  onTouchstart(state, e) {
    clearSnapState(getSnapInstance(this.map))
    if (state.selectedVertexIndex < 0 || !isOnSVG(e.target.parentNode)) {
      return
    }

    const touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    const style = window.getComputedStyle(state.touchVertexTarget)
    state.deltaTarget = { x: touch.x - Number.parseFloat(style.left), y: touch.y - Number.parseFloat(style.top) }
    const vertexPt = this.map.project(state.vertecies[state.selectedVertexIndex])
    state.deltaVertex = { x: (touch.x / state.scale) - vertexPt.x, y: (touch.y / state.scale) - vertexPt.y }
  },

  onTouchmove(state, e) {
    if (state.selectedVertexIndex < 0 || !isOnSVG(e.target.parentNode)) {
      return
    }

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

    const snap = getSnapInstance(this.map)
    if (snap) {
      snap.snapStatus = false; snap.snapCoords = null
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

  onVertexButtonClick(state, e) {
    if (e.target.closest(`#${state.deleteVertexButtonId}`) && state.selectedVertexType === 'vertex') {
      this.deleteVertex(state)
    }
  },

  // Utility methods
  getCoordPath(state, idx) {
    // Use cached featureType or look it up
    const type = state.featureType || this.getFeature(state.featureId)?.type
    return type === 'LineString' ? `${idx}` : `0.${idx}`
  },

  syncVertices(state) {
    state.vertecies = this.getVerticies(state.featureId)
    state.midpoints = this.getMidpoints(state.featureId)
  },

  getVerticies(featureId) {
    const feature = this.getFeature(featureId)
    if (!feature?.coordinates) {
      return []
    }
    // Polygon coordinates are [[[lng,lat],...]], LineString are [[lng,lat],...]
    return feature.type === 'LineString' ? feature.coordinates : feature.coordinates.flat(1)
  },

  getMidpoints(featureId) {
    const feature = this.getFeature(featureId)
    if (!feature?.coordinates) return []
    // Polygon coordinates are [[[lng,lat],...]], LineString are [[lng,lat],...]
    const coords = feature.type === 'LineString' ? feature.coordinates : feature.coordinates.flat(1)
    const isLine = feature.type === 'LineString'

    // For lines, don't create midpoint between last and first vertex
    const count = isLine ? coords.length - 1 : coords.length
    const midpoints = []
    for (let i = 0; i < count; i++) {
      const next = coords[(i + 1) % coords.length]
      midpoints.push([(coords[i][0] + next[0]) / 2, (coords[i][1] + next[1]) / 2])
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
    // Handle both "0.1" (Polygon) and "1" (LineString) formats
    const parts = coordPath.split('.')
    const afterIdx = Number.parseInt(parts[parts.length - 1], 10)

    // Get feature type from cache or look it up
    const featureType = state.featureType || this.getFeature(state.featureId)?.type

    // For LineString, coord_path is insertion position (1-indexed), so subtract 1 for midpoint array index
    // For Polygon, adjust for ring wrapping
    if (featureType === 'LineString') {
      return state.vertecies.length + (afterIdx - 1)
    }
    return state.vertecies.length + ((afterIdx - 1 + state.vertecies.length) % state.vertecies.length)
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

  hideTouchVertexIndicator(state) { state.touchVertexTarget.style.display = 'none' },

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
    const feature = this.getFeature(state.featureId)
    // Polygon coordinates are [[[lng,lat],...]], LineString are [[lng,lat],...]
    const coords = feature.type === 'LineString' ? feature.coordinates : feature.coordinates.flat(1)
    return this.getOffset(coords[state.selectedVertexIndex], e)
  },

  insertVertex(state, e) {
    const feature = this.getFeature(state.featureId)
    const midIdx = state.selectedVertexIndex - state.vertecies.length
    const newCoord = this.getOffset(state.midpoints[midIdx], e)
    const geojson = feature.toGeoJSON()
    const coords = geojson.geometry.type === 'Polygon' ? geojson.geometry.coordinates[0] : geojson.geometry.coordinates
    coords.splice(midIdx + 1, 0, [newCoord.lng, newCoord.lat])
    this._ctx.api.add(geojson)
    const newIdx = midIdx + 1
    this.changeMode(state, { selectedVertexIndex: newIdx, selectedVertexType: 'vertex', coordPath: this.getCoordPath(state, newIdx) })
  },

  moveVertex(state, coord, options = {}) {
    if (options.checkSnap && state.enableSnap !== false) {
      const snap = this.map._snapInstance
      if (snap?.snapStatus && snap.snapCoords?.length >= 2) {
        coord = { lng: snap.snapCoords[0], lat: snap.snapCoords[1] }
      }
    }
    const geojson = this.getFeature(state.featureId).toGeoJSON()
    if (geojson.geometry.type === 'Polygon') {
      geojson.geometry.coordinates[0][state.selectedVertexIndex] = [coord.lng, coord.lat]
    } else if (geojson.geometry.type === 'LineString') {
      geojson.geometry.coordinates[state.selectedVertexIndex] = [coord.lng, coord.lat]
    } else {
      // No action
    }
    this._ctx.api.add(geojson)
    state.vertecies = this.getVerticies(state.featureId)
  },

  deleteVertex(state) {
    const featureType = state.featureType || this.getFeature(state.featureId)?.type
    // Minimum vertices: 3 for Polygon, 2 for LineString
    const minVertices = featureType === 'Polygon' ? 3 : 2
    if (state.vertecies.length <= minVertices) {
      return
    }
    const nextIdx = state.selectedVertexIndex >= state.vertecies.length - 1 ? state.selectedVertexIndex - 1 : state.selectedVertexIndex
    this._ctx.api.trash()
    this.changeMode(state, { selectedVertexIndex: nextIdx, selectedVertexType: 'vertex', coordPath: this.getCoordPath(state, nextIdx) })
  },

  // Prevent selecting other features
  changeMode(state, updates) {
    if (!state.featureId) {
      return
    }
    this._ctx.api.changeMode('edit_vertex', { ...state, ...updates })
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
