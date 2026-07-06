import {
  getSnapInstance, isSnapEnabled, getSnapLngLat, triggerSnapAtPoint, triggerSnapAtCenter
} from '../../utils/snapHelpers.js'

/**
 * Pointer / touch handling for the shared draw mode: touch and mouse interface
 * switching, rubber-band movement (with snapping) and blur. Part of createDrawMode.
 */
export const createPointerHandlers = ({ ParentMode, getFeature, getCoords }) => ({
  onTouchStart (state, e) {
    this._setInterface(state, 'touch')
    this.onMove(state, e)
  },

  onTouchEnd (state, e) {
    this._setInterface(state, 'touch')
    this.onMove(state, e)
  },

  onBlur (state, e) {
    if (e.target !== state.container) {
      this._hideCrossHair(state)
    }
  },

  onMouseMove (state, e) {
    if (isSnapEnabled(state)) {
      const snap = getSnapInstance(this.map)
      triggerSnapAtPoint(snap, this.map, e.point)

      const snappedLngLat = getSnapLngLat(snap)
      if (snappedLngLat) {
        e = { ...e, lngLat: snappedLngLat }
      }
    }

    this.map.fire('draw.geometrychange', state.polygon || state.line)

    ParentMode.onMouseMove.call(this, state, e)
  },

  onMove (state) {
    if (['touch', 'keyboard'].includes(state.interfaceType)) {
      if (isSnapEnabled(state)) {
        triggerSnapAtCenter(getSnapInstance(this.map), this.map)
      }

      const snap = getSnapInstance(this.map)
      const snappedLngLat = isSnapEnabled(state) && getSnapLngLat(snap)

      if (snappedLngLat) {
        const point = this.map.project([snappedLngLat.lng, snappedLngLat.lat])
        ParentMode.onMouseMove.call(this, state, {
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
        this._simulateMouse('mousemove', ParentMode.onMouseMove, state)
      }
    }
  },

  onPointerdown (state, e) {
    if (e.pointerType !== 'touch') {
      this._setInterface(state, 'mouse', false)
    }
  },

  onPointermove (state, e) {
    if (e.pointerType !== 'touch') {
      this._hideCrossHair(state)
    }
  },

  onPointerup (state) {
    this.dispatchVertexChange(getCoords(getFeature(state)))
  }
})
