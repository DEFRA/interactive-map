import DirectSelect from '/node_modules/@mapbox/mapbox-gl-draw/src/modes/direct_select.js'
import { spatialNavigate } from '../utils.js'
import {
  getSnapInstance,
  isSnapActive,
  isSnapEnabled,
  getSnapLngLat,
  getSnapRadius,
  triggerSnapAtPoint,
  clearSnapIndicator
} from '../snapHelpers.js'

const ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
const NUDGE = 1
const STEP = 5

const touchVertexTarget = `
  <svg width='48' height='48' viewBox='0 0 48 48' fill-rule='evenodd' style='display:none;position:absolute;top:50%;left:50%;margin:24px 0 0 -24px' class='touch-vertex-target' data-touch-vertex-target>
    <circle cx='24' cy='24' r='24' fill='currentColor'/>
    <path d="M37.543 25H34a1 1 0 1 1 0-2h3.629l-.836-.837a1 1 0 0 1 1.414-1.414l2.5 2.501A1 1 0 0 1 41 24a1 1 0 0 1-.487.858l-2.306 2.306a1 1 0 0 1-1.414-1.414l.75-.75zM23 10.414l-.793.793a1 1 0 0 1-1.414-1.414l2.5-2.5C23.481 7.105 23.734 7 24 7s.519.105.707.293l2.5 2.5a1 1 0 0 1-1.414 1.414L25 10.414V14a1 1 0 1 1-2 0v-3.586zM7 24a1 1 0 0 1 .293-.75l2.5-2.501a1 1 0 0 1 1.414 1.414l-.836.837H14a1 1 0 1 1 0 2h-3.543l.75.75a1 1 0 0 1-1.414 1.414l-2.306-2.306A1 1 0 0 1 7 24zm16.293 16.707l-2.5-2.5a1 1 0 0 1 1.414-1.414l.793.793V34a1 1 0 1 1 2 0v3.586l.793-.793a1 1 0 0 1 1.414 1.414l-2.5 2.5c-.188.188-.441.293-.707.293s-.519-.105-.707-.293zM24 20c2.208 0 4 1.792 4 4s-1.792 4-4 4-4-1.792-4-4 1.792-4 4-4z" fill="#fff"/>
  </svg>
`

const scalePoint = (point, scale) => {
  return Object.keys(point).reduce((acc, key) => {
    acc[key] = point[key] * scale
    return acc
  }, {})
}

export const EditVertexMode = {
  ...DirectSelect,

  onSetup(options) {
    const state = DirectSelect.onSetup.call(this, options)
    const { container, featureId, selectedVertexIndex, selectedVertexType, isPanEnabled, deleteVertexButtonId, interfaceType, scale } = options

    Object.assign(state, {
      container,
      interfaceType,
      deleteVertexButtonId,
      isPanEnabled,
      featureId: state.featureId || featureId,
      selectedVertexIndex: selectedVertexIndex ?? -1,
      selectedVertexType,
      scale
    })

    state.vertecies = this.getVerticies(state.featureId)
    state.midpoints = this.getMidpoints(state.featureId)

    this.setupEventListeners(state)
    
    if (selectedVertexType === 'midpoint') {
      this.updateMidpoint(state.midpoints[selectedVertexIndex - state.vertecies.length])
    }
 
    this.addTouchVertexTarget(state)

    return state
  },

  setupEventListeners(state) {
    const bind = (fn) => (e) => fn.call(this, state, e)
    this.handlers = {
      keydown: bind(this.onKeydown),
      keyup: bind(this.onKeyup),
      pointerdown: bind(this.onPointerevent),
      pointermove: bind(this.onPointerevent),
      pointerup: bind(this.onPointerevent),
      click: bind(this.onVertexButtonClick),
      touchstart: bind(this.onTouchstart),
      touchmove: bind(this.onTouchmove),
      touchend: bind(this.onTouchend),
      selectionchange: bind(this.onSelectionChange),
      scalechange: bind(this.onScaleChange),
      update: bind(this.onUpdate),
      move: bind(this.onMove)
    }

    const h = this.handlers
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
    const { featureId, vertecies, interfaceType } = state

    const vertexCoord = e.points[e.points.length - 1]?.geometry.coordinates
    const coords = e.features[0].geometry.coordinates.flat(1)
    const selectedVertexIndex = coords.findIndex(c => vertexCoord && c[0] === vertexCoord[0] && c[1] === vertexCoord[1])

    state.selectedVertexIndex = interfaceType === 'keyboard' ? state.selectedVertexIndex : selectedVertexIndex
    state.selectedVertexType ??= selectedVertexIndex >= 0 ? 'vertex' : null

    this.map.fire('draw.vertexselection', {
      index: state.selectedVertexType === 'vertex' ? state.selectedVertexIndex : -1,
      numVertecies: state.vertecies.length
    })

    const scaledPoint = vertexCoord ? scalePoint(this.map.project(vertexCoord), state.scale) : null
    this.updateTouchVertexTarget(state, scaledPoint)
  },

  onScaleChange(state, e) {
    state.scale = e.scale
  },

  onUpdate(state, e) {
    const previousLength = state.vertecies.length
    const previousVertecies = new Set(state.vertecies.map(coord => JSON.stringify(coord)))
    
    if (previousLength === state.vertecies.length) {
      return
    }

    const coord = state.vertecies.find(coord => !previousVertecies.has(JSON.stringify(coord)))
    state.selectedVertexIndex = state.vertecies.findIndex(coord => !previousVertecies.has(JSON.stringify(coord)))
    state.selectedVertexType ??= state.selectedVertexIndex >= 0 ? 'vertex' : null

    // this.updateTouchVertexTarget(state, coord ? this.map.project(coord) : null)
  },

  onKeydown(state, e) {
    state.interfaceType = 'keyboard'
    this.hideTouchVertexIndicator(state)

    if (e.key === ' ' && state.selectedVertexIndex < 0) {
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
      const currentCoord = this.getFeature(state.featureId).coordinates.flat(1)[state.selectedVertexIndex]

      // If currently snapped, break out by moving outside snap radius
      if (isSnapEnabled(state) && state._isSnapped && snap) {
        const snapRadius = getSnapRadius(snap)
        const currentPoint = this.map.project(currentCoord)
        const offset = snapRadius + 1 // Move just outside snap radius
        const offsets = {
          ArrowUp: [0, -offset],
          ArrowDown: [0, offset],
          ArrowLeft: [-offset, 0],
          ArrowRight: [offset, 0]
        }
        const [dx, dy] = offsets[e.key]
        const newCoord = this.map.unproject({ x: currentPoint.x + dx, y: currentPoint.y + dy })
        state._isSnapped = false
        clearSnapIndicator(snap)
        return this.moveVertex(state, newCoord)
      }

      const newCoord = this.getNewCoord(state, e)

      // Trigger snap detection at new vertex position
      if (isSnapEnabled(state) && snap) {
        const point = this.map.project(newCoord)
        triggerSnapAtPoint(snap, this.map, point)

        // Check if we snapped and mark state
        if (isSnapActive(snap)) {
          state._isSnapped = true
          return this.moveVertex(state, getSnapLngLat(snap))
        }
      }

      state._isSnapped = false
      return this.moveVertex(state, newCoord)
    }

    if (e.altKey && ARROW_KEYS.includes(e.key) && state.selectedVertexIndex >= 0) {
      return this.updateVertex(state, e.key)
    }

    if (e.key === 'Escape') {
      this.changeMode(state, {
        isPanEnabled: true,
        selectedVertexIndex: -1,
        selectedVertexType: null
      })
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
    if (['vertex', 'midpoint'].includes(e.featureTarget?.properties.meta)) {
      DirectSelect.onMouseDown.call(this, state, e)
    }
    if (e.featureTarget?.properties.meta === 'midpoint') {
      state.selectedVertexIndex = this.getVertexIndexFromMidpoint(state.vertecies, e.featureTarget?.properties.coord_path)
      state.selectedVertexType = 'vertex'

      this.map.fire('draw.vertexselection', {
        index: state.selectedVertexIndex,
        numVertecies: state.vertecies.length
      })
    }
  },

  onPointerevent(state, e) {
    state.interfaceType = e.pointerType === 'touch' ? 'touch' : 'pointer'
    state.isPanEnabled = true

    const targetEl = e.target.parentNode
    const isOnTargetMarker = targetEl instanceof window.SVGElement || targetEl.ownerSVGElement
    if (e.pointerType === 'touch' && e.type === 'pointermove' && !isOnTargetMarker) {
      this.changeMode(state, {
        selectedVertexIndex: -1,
        selectedVertexType: null,
        coordPath: null
      })
    }
  },

  onTouchStart(state, e) {
    return
  },

  onTouchMove(state, e) {
    return
  },

  onTouchEnd(state, e) {
    return
  },

  onTouchend() {
    // Snap is applied during drag, nothing needed on release
  },

  clickNoTarget(state, e) {
    this.changeMode(state, {
      selectedVertexIndex: -1,
      selectedVertexType: null,
      isPanEnabled: true
    })
  },

  onTap(state, e) {
    const meta = e.featureTarget?.properties.meta
    const coordPath = e.featureTarget?.properties.coord_path
    
    if (meta === 'vertex') {
      const selectedVertexIndex = parseInt(coordPath.split('.')[1], 10)
      
      this.changeMode(state, {
        selectedVertexIndex,
        selectedVertexType: 'vertex',
        coordPath
      })
    } else if (meta === 'midpoint') {
      const selectedVertexIndex = this.getVertexIndexFromMidpoint(state.vertecies, coordPath)

      this.insertVertex({
        ...state,
        selectedVertexIndex,
        selectedVertexType: 'midpoint'
      })
    } else {
      this.clickNoTarget(state, e)
    }
  },

  onTouchstart(state, e) {
    const targetEl = e.target.parentNode
    const isOnTargetMarker = targetEl instanceof window.SVGElement || targetEl.ownerSVGElement
    if (state.selectedVertexIndex < 0 || !isOnTargetMarker) {
      return
    }
    
    const touchPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    const targetStyle = window.getComputedStyle(state.touchVertexTarget)
    state.deltaTarget = { 
      x: touchPoint.x - parseFloat(targetStyle.left), 
      y: touchPoint.y - parseFloat(targetStyle.top) 
    }

    const vertexPoint = this.map.project(state.vertecies[state.selectedVertexIndex])
    state.deltaVertex = {
      x: (touchPoint.x / state.scale) - vertexPoint.x,
      y: (touchPoint.y / state.scale) - vertexPoint.y
    }
  },

  onTouchmove(state, e) {
    const targetEl = e.target.parentNode
    const isOnTargetMarker = targetEl instanceof window.SVGElement || targetEl.ownerSVGElement
    if (state.selectedVertexIndex < 0 || !isOnTargetMarker) {
      return
    }

    const touchPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    const vertexScreenPoint = {
      x: (touchPoint.x / state.scale) - state.deltaVertex.x,
      y: (touchPoint.y / state.scale) - state.deltaVertex.y
    }

    // Determine final coordinates - snap if enabled and active
    let finalCoord = this.map.unproject(vertexScreenPoint)
    if (isSnapEnabled(state)) {
      const snap = getSnapInstance(this.map)
      triggerSnapAtPoint(snap, this.map, vertexScreenPoint)

      // Use snapped coordinates if snap is active
      const snappedLngLat = getSnapLngLat(snap)
      if (snappedLngLat) {
        finalCoord = snappedLngLat
      }
    }

    this.moveVertex(state, finalCoord)

    this.updateTouchVertexTarget(state, {
      x: touchPoint.x - state.deltaTarget.x,
      y: touchPoint.y - state.deltaTarget.y
    })
  },

  onDrag(state, e) {
    if (state.interfaceType === 'touch') {
      return
    }

    // Check for snap during mouse drag
    if (isSnapEnabled(state) && state.selectedCoordPaths?.length > 0) {
      const snap = getSnapInstance(this.map)
      triggerSnapAtPoint(snap, this.map, e.point)

      // Use snapped coordinates if snap is active
      const snappedLngLat = getSnapLngLat(snap)
      if (snappedLngLat) {
        // Override the event lngLat with snapped coordinates
        e = { ...e, lngLat: snappedLngLat }
      }
    }

    DirectSelect.onDrag.call(this, state, e)
  },

  // Required for performance
  onMove(state, e) {
    const vertex = state.vertecies[state.selectedVertexIndex]
    if (vertex) {
      const scaledPoint = scalePoint(this.map.project(vertex), state.scale)
      this.updateTouchVertexTarget(state, scaledPoint)
    }
  },

  onVertexButtonClick(state, e) {
    if (e.target.closest(`#${state.deleteVertexButtonId}`) && state.selectedVertexType === 'vertex') {
      this.deleteVertex(state)
    }
  },

  getVerticies(featureId) {
    return this.getFeature(featureId)?.coordinates?.flat(1) || []
  },

  getMidpoints(featureId) {
    const feature = this.getFeature(featureId)
    if (!feature) {
      return []
    }

    const coords = feature.coordinates.flat(1)
    return coords.map((coord, i) => {
      const next = coords[(i + 1) % coords.length]
      return [(coord[0] + next[0]) / 2, (coord[1] + next[1]) / 2]
    })
  },

  getVertexOrMidpoint(state, direction) {
    const project = (p) => Object.values(this.map.project(p))
    const pixels = [...state.vertecies.map(project), ...state.midpoints.map(project)]
    const start = pixels[state.selectedVertexIndex] || Object.values(this.map.project(this.map.getCenter()))
    const index = spatialNavigate(start, pixels, direction)
    
    return [index, index < state.vertecies.length ? 'vertex' : 'midpoint']
  },

  getVertexIndexFromMidpoint(vertecies, coordPath) {
    // midpoint coord_path tells us which vertex comes after it
    const afterVertexIndex = parseInt(coordPath.split('.')[1], 10)
    
    // Calculate which midpoint this is (midpoint before vertex n is midpoint n-1)
    const numVertices = vertecies.length
    const midpointIndex = (afterVertexIndex - 1 + numVertices) % numVertices
    return numVertices + midpointIndex
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
      this.showTouchVertexIndicator(state, point)
    } else {
      this.hideTouchVertexIndicator(state)
    }
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
    const [index, type] = this.getVertexOrMidpoint(state, direction)
    this.changeMode(state, {
      selectedVertexIndex: index,
      selectedVertexType: type,
      ...(type === 'vertex' && { coordPath: `0.${index}` })
    })
  },

  getOffset(coord, e) {
    const pixel = this.map.project(coord)
    const offset = e?.shiftKey ? NUDGE : STEP
    const offsets = { ArrowUp: [0, -offset], ArrowDown: [0, offset], ArrowLeft: [-offset, 0], ArrowRight: [offset, 0] }
    const [dx, dy] = e ? offsets[e.key] : [0, 0]
    return this.map.unproject({ x: pixel.x + dx, y: pixel.y + dy })
  },

  insertVertex(state, e) {
    const feature = this.getFeature(state.featureId)
    const midpointIndex = state.selectedVertexIndex - state.vertecies.length
    const newCoord = this.getOffset(state.midpoints[midpointIndex], e)
    const geojson = feature.toGeoJSON()
    const coords = geojson.geometry.type === 'Polygon' ? geojson.geometry.coordinates[0] : geojson.geometry.coordinates

    coords.splice(midpointIndex + 1, 0, [newCoord.lng, newCoord.lat])
    this._ctx.api.add(geojson)

    this.changeMode(state, {
      selectedVertexIndex: midpointIndex + 1,
      selectedVertexType: 'vertex',
      coordPath: `0.${midpointIndex + 1}`
    })
  },

  getNewCoord(state, e) {
    return this.getOffset(this.getFeature(state.featureId).coordinates.flat(1)[state.selectedVertexIndex], e)
  },

  moveVertex(state, coord, options = {}) {
    // Check for snap if enabled and requested
    if (options.checkSnap && state.enableSnap !== false) {
      const snap = this.map._snapInstance
      if (snap?.snapStatus && snap.snapCoords?.length >= 2) {
        coord = { lng: snap.snapCoords[0], lat: snap.snapCoords[1] }
      }
    }

    const geojson = this.getFeature(state.featureId).toGeoJSON()
    if (geojson.geometry.type === 'Polygon') {
      geojson.geometry.coordinates[0][state.selectedVertexIndex] = [coord.lng, coord.lat]
    }
    this._ctx.api.add(geojson)

    // Update vertecies array to reflect the change
    state.vertecies = this.getVerticies(state.featureId)
  },

  deleteVertex(state) {
    const feature = this.getFeature(state.featureId)
    const minCoords = feature.type === 'Polygon' ? 3 : 2

    if (state.vertecies.length <= minCoords) {
      return
    }

    const nextVertexIndex = state.selectedVertexIndex >= state.vertecies.length - 1 ? 0 : state.selectedVertexIndex
    this._ctx.api.trash()

    this.changeMode(state, {
      selectedVertexIndex: nextVertexIndex,
      selectedVertexType: 'vertex',
      coordPath: `0.${nextVertexIndex}`
    })
  },

  changeMode(state, updates) {
    this._ctx.api.changeMode('edit_vertex', {
      ...state, 
      ...updates 
    })
  },

  showTouchVertexIndicator(state, point) {
    Object.assign(state.touchVertexTarget.style, {
      display: 'block',
      top: `${point.y}px`,
      left: `${point.x}px`
    })
  },

  hideTouchVertexIndicator(state) {
    state.touchVertexTarget.style.display = 'none'
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