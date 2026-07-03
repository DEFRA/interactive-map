import {
  getSnapInstance, isSnapEnabled, triggerSnapAtPoint, getSnapLngLat,
  clearSnapState, clearSnapIndicator
} from '../../utils/snapHelpers.js'
import { coordPathToFlatIndex } from './geometryHelpers.js'
import { isOnSVG } from './helpers.js'
import { createTouchTarget, applyTouchTargetColors } from '../../../../utils/touchTarget.js'
import { COLORS } from '../../defaults.js'
import { getValueForStyle } from '../../../../utils/getValueForStyle.js'

export const applyTouchVertexColors = (el, mapStyle) => {
  if (!el) { return }
  const scheme = mapStyle?.mapColorScheme ?? 'light'
  const colors = {
    editActive: getValueForStyle(COLORS.editActive, scheme),
    editHalo: getValueForStyle(COLORS.editHalo, scheme),
    editVertex: getValueForStyle(COLORS.editVertex, scheme)
  }
  applyTouchTargetColors(el, colors)
}

export const touchHandlers = {
  addTouchVertexTarget (state) {
    state.touchVertexTarget = createTouchTarget(state.container)
    applyTouchVertexColors(state.touchVertexTarget, this.map._drawCurrentMapStyle)
  },

  updateTouchVertexTarget (state, point) {
    if (point && state.interfaceType === 'touch' && state.selectedVertexIndex >= 0) {
      Object.assign(state.touchVertexTarget.style, { display: 'block', top: `${point.y}px`, left: `${point.x}px` })
    } else {
      state.touchVertexTarget.style.display = 'none'
    }
  },

  hideTouchVertexIndicator (state) {
    state.touchVertexTarget.style.display = 'none'
  },

  onPointerevent (state, e) {
    state.interfaceType = e.pointerType === 'touch' ? 'touch' : 'mouse'
    state.isPanEnabled = true
    if (e.pointerType === 'touch' && e.type === 'pointermove' && !isOnSVG(e.target.parentNode) && !state._ignorePointermoveDeselect) {
      this.changeMode(state, { selectedVertexIndex: -1, selectedVertexType: null, coordPath: null })
    }
  },

  // Empty stubs required by DirectSelect
  onTouchStart () {},
  onTouchMove () {},
  onTouchEnd () {},

  onTouchend (state) {
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

  onTap (state, e) {
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

  onTouchstart (state, e) {
    clearSnapState(getSnapInstance(this.map))
    // Always get fresh vertex data in case coordinates changed during previous edits
    const freshVertices = this.getVerticies(state.featureId)
    const vertex = freshVertices?.[state.selectedVertexIndex]
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

  onTouchmove (state, e) {
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
  }
}
