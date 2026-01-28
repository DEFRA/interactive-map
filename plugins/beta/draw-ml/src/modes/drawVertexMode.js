import DrawPolygon from '../../../../../node_modules/@mapbox/mapbox-gl-draw/src/modes/draw_polygon.js'
import createVertex from '../../../../../node_modules/@mapbox/mapbox-gl-draw/src/lib/create_vertex.js'
import { isValidClick } from '../utils.js'
import {
  getSnapInstance,
  isSnapActive,
  isSnapEnabled,
  getSnapLngLat,
  triggerSnapAtPoint,
  triggerSnapAtCenter,
  createSnappedEvent,
  createSnappedClickEvent
} from '../snapHelpers.js'

export const DrawVertexMode = {
  ...DrawPolygon,

  onSetup(options) {
    const { map } = this

    const state = {
      ...DrawPolygon.onSetup.call(this, options),
      ...options
    }

    const { container, interfaceType, vertexMarkerId } = state
    const vertexMarker = container.querySelector(`#${vertexMarkerId}`)
    vertexMarker.style.display = ['touch', 'keyboard'].includes(interfaceType) ? 'block' : 'none'
    state.vertexMarker = vertexMarker

    // Bind all handlers once
    const bind = (name, fn) => (this[name] = fn.bind(this, state))
    const handlers = {
      keydownHandler: this.onKeydown,
      keyupHandler: this.onKeyup,
      focusHandler: this.onFocus,
      blurHandler: this.onBlur,
      createHandler: this.onCreate,
      moveHandler: this.onMove,
      pointerdownHandler: this.onPointerdown,
      pointermoveHandler: this.onPointermove,
      pointerupHandler: this.onPointerup,
      vertexButtonClickHandler: this.onVertexButtonClick
    }
    Object.entries(handlers).forEach(([k, fn]) => bind(k, fn))

    // Register events
    this._listeners = [
      [window, 'keydown', this.keydownHandler],
      [window, 'keyup', this.keyupHandler],
      [window, 'click', this.vertexButtonClickHandler],
      [container, 'focus', this.focusHandler],
      [container, 'blur', this.blurHandler],
      [container, 'pointermove', this.pointermoveHandler],
      [container, 'pointerup', this.pointerupHandler],
      [map, 'pointerdown', this.pointerdownHandler],
      [map, 'draw.create', this.createHandler],
      [map, 'move', this.moveHandler]
    ]
    this._listeners.forEach(([t, e, h]) => t.addEventListener ? t.addEventListener(e, h) : t.on(e, h))

    return state
  },

  onClick(state, e) {
    if (e.originalEvent.button > 0) {
      return
    }
    const snap = getSnapInstance(this.map)
    if (isSnapEnabled(state) && isSnapActive(snap)) {
      // Use snapped coordinates when snap is enabled and active
      e = createSnappedEvent(e, snap)
    } else {
      // When snap is disabled, ensure polygon uses actual click coordinates
      // (not stale snapped coordinates from previous mouse moves)
      const coords = state.polygon.coordinates[0]
      if (coords.length > 0) {
        coords[coords.length - 1] = [e.lngLat.lng, e.lngLat.lat]
      }
    }
    DrawPolygon.onClick.call(this, state, e)
  },

  onTap() {
    return
  },

  doClick(state) {
    const coords = state.polygon.coordinates
    this.dispatchVertexChange(coords[0])
    if (!isValidClick(coords)) {
      return
    }
    // Use snap coordinates if snapping is enabled and active
    const snap = getSnapInstance(this.map)
    const snappedEvent = isSnapEnabled(state) && createSnappedClickEvent(this.map, snap)

    if (snappedEvent) {
      DrawPolygon.onClick.call(this, state, snappedEvent)
      this._ctx.store.render()
    } else {
      this._simulateMouse('click', DrawPolygon.onClick, state)
    }
  },

  dispatchVertexChange(coords) {
    this.map.fire('draw.vertexchange', {
      numVertecies: coords.length
    })
  },

  _simulateMouse(type, fn, state) {
    const { map } = this
    const center = map.getCenter()
    const point = map.project(center)
    fn.call(this, state, {
      lngLat: center,
      point,
      originalEvent: new MouseEvent(type, {
        clientX: point.x,
        clientY: point.y,
        bubbles: true,
        cancelable: true
      })
    })
    this._ctx.store.render()
  },

  _setInterface(state, type, show = true) {
    state.interfaceType = type
    if (show) {
      state.vertexMarker.style.display = 'block'
    }
  },

  onCreate(state, e) {
    const draw = this._ctx.api
    const feature = e.features[0]
    draw.delete(feature.id)
    feature.id = state.featureId
    draw.add(feature)
  },

  onVertexButtonClick(state, e) {
    if (e.target.closest(`#${state.addVertexButtonId}`)) {
      this.doClick(state)
    }
  },

  onTouchStart(state, e) {
    this._setInterface(state, 'touch')
    this.onMove(state, e)
  },

  onTouchEnd(state, e) {
    this._setInterface(state, 'touch')
    this.onMove(state, e)
  },

  onKeydown(state, e) {
    if (document.activeElement !== state.container) {
      return
    }
    if (e.key === 'Escape') {
      return e.preventDefault()
    }
    if (e.key === 'Enter') {
      state.isActive = true
    }
    this._setInterface(state, 'keyboard')
    this.onMove(state, e)
  },

  onKeyup(state, e) {
    if (e.key === 'Escape') {
      return
    }
    this._setInterface(state, 'keyboard')
    this.onMove(state, e)
    if (e.key === 'Enter' && state.isActive) {
      this.doClick(state)
    }
  },

  onFocus(state) {
    const { vertexMarker, interfaceType } = state
    vertexMarker.style.display = ['touch', 'keyboard'].includes(interfaceType) ? 'block' : 'none'
  },

  onBlur(state, e) {
    if (e.target !== state.container) {
      state.vertexMarker.style.display = 'none'
    }
  },

  onMouseMove(state, e) {
    // Trigger snap detection at mouse position
    if (isSnapEnabled(state)) {
      const snap = getSnapInstance(this.map)
      triggerSnapAtPoint(snap, this.map, e.point)

      // Use snapped coordinates for rubber band if snap is active
      const snappedLngLat = getSnapLngLat(snap)
      if (snappedLngLat) {
        e = { ...e, lngLat: snappedLngLat }
      }
    }

    DrawPolygon.onMouseMove.call(this, state, e)
  },

  onMove(state) {
    if (['touch', 'keyboard'].includes(state.interfaceType)) {
      // Trigger snap detection at center point for touch/keyboard mode
      if (isSnapEnabled(state)) {
        triggerSnapAtCenter(getSnapInstance(this.map), this.map)
      }

      // Use snapped coordinates if available, otherwise use center
      const snap = getSnapInstance(this.map)
      const snappedLngLat = isSnapEnabled(state) && getSnapLngLat(snap)

      if (snappedLngLat) {
        const point = this.map.project([snappedLngLat.lng, snappedLngLat.lat])
        DrawPolygon.onMouseMove.call(this, state, {
          lngLat: snappedLngLat,
          point,
          originalEvent: new MouseEvent('mousemove', {
            clientX: point.x,
            clientY: point.y,
            bubbles: true,
            cancelable: true
          })
        })
        this._ctx.store.render()
      } else {
        this._simulateMouse('mousemove', DrawPolygon.onMouseMove, state)
      }
    }
  },

  onPointerdown(state, e) {
    if (e.pointerType !== 'touch') {
      this._setInterface(state, 'pointer', false)
    }
  },

  onPointermove(state, e) {
    if (e.pointerType !== 'touch') {
      state.vertexMarker.style.display = 'none'
    }
  },
  
  onPointerup(state) {
    this.dispatchVertexChange(state.polygon.coordinates[0])
  },

  toDisplayFeatures(state, geojson, display) {
    DrawPolygon.toDisplayFeatures.call(this, state, geojson, display)

    // Create vertex
    if (geojson.geometry.type === 'Polygon' && geojson.id === state.polygon.id) {
      const ring = geojson.geometry.coordinates[0]
      for (let i = 1; i < ring.length - 2; i++) {
        display(createVertex(geojson.id, ring[i], `0.${i}`))
      }
    }
  },

  onStop(state) {
    DrawPolygon.onStop.call(this, state)
    this._listeners.forEach(([t, e, h]) => t.removeEventListener ? t.removeEventListener(e, h) : t.off(e, h))
    state.vertexMarker.style.display = 'none'
  }
}
