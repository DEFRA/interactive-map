import { getSnapInstance, clearSnapState, clearSnapIndicator } from '../../utils/snapHelpers.js'
import { coordPathToFlatIndex } from './geometryHelpers.js'
import { isOnSVG, scalePoint } from './helpers.js'
import { createTouchTarget, applyTouchTargetColors } from '../../../../utils/touchTarget.js'
import { resolveColors } from '../../../../utils/resolveColors.js'
import { getTouchPoint, computeTouchDragAnchors, resolveTouchDragCoord } from '../../utils/touchDragMath.js'

export const applyTouchVertexColors = (el, mapStyle, pluginConfig = {}) => {
  if (!el) { return }
  const { editActive, editHalo, editVertex } = resolveColors(mapStyle, pluginConfig)
  applyTouchTargetColors(el, { editActive, editHalo, editVertex })
}

export const touchHandlers = {
  addTouchVertexTarget (state) {
    state.touchVertexTarget = createTouchTarget(state.container)
    applyTouchVertexColors(state.touchVertexTarget, this.map._drawCurrentMapStyle, this.map._drawPluginConfig)
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

      // Re-sync the target to the vertex's actual final coordinate. Mid-drag it tracks the
      // raw finger 1:1 from its touchstart-time offset (see onTouchmove) — a mid-drag snap
      // moves the vertex without moving the target by the same amount, leaving them out of
      // alignment. Left uncorrected, the next onTouchstart's delta math re-anchors off that
      // drifted position, compounding a little further with every snapped drag (same fix as
      // editPointMode's own onTouchend, for the same reason).
      const vertex = state.vertecies[state.selectedVertexIndex]
      if (vertex) {
        this.updateTouchVertexTarget(state, scalePoint(this.map.project(vertex), state.scale))
      }
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

    const touch = getTouchPoint(e)
    Object.assign(state, computeTouchDragAnchors(this.map, state.touchVertexTarget, touch, vertex, state.scale))
  },

  onTouchmove (state, e) {
    if (state.selectedVertexIndex < 0 || !isOnSVG(e.target.parentNode)) {
      return
    }

    state._touchMoved = true

    const touch = getTouchPoint(e)
    this.moveVertex(state, resolveTouchDragCoord(this.map, state, touch))
    this.updateTouchVertexTarget(state, { x: touch.x - state.deltaTarget.x, y: touch.y - state.deltaTarget.y })
  }
}
