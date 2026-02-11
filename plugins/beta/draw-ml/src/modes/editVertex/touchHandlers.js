import {
  getSnapInstance, isSnapEnabled, triggerSnapAtPoint, getSnapLngLat,
  clearSnapState, clearSnapIndicator
} from '../../utils/snapHelpers.js'
import { coordPathToFlatIndex } from './geometryHelpers.js'
import { isOnSVG } from './helpers.js'

const touchVertexTarget = `
  <svg width='48' height='48' viewBox='0 0 48 48' fill-rule='evenodd' style='display:none;position:absolute;top:50%;left:50%;margin:24px 0 0 -24px' class='touch-vertex-target' data-touch-vertex-target>
    <circle cx='24' cy='24' r='24' fill='currentColor'/>
    <path d="M37.543 25H34a1 1 0 1 1 0-2h3.629l-.836-.837a1 1 0 0 1 1.414-1.414l2.5 2.501A1 1 0 0 1 41 24a1 1 0 0 1-.487.858l-2.306 2.306a1 1 0 0 1-1.414-1.414l.75-.75zM23 10.414l-.793.793a1 1 0 0 1-1.414-1.414l2.5-2.5C23.481 7.105 23.734 7 24 7s.519.105.707.293l2.5 2.5a1 1 0 0 1-1.414 1.414L25 10.414V14a1 1 0 1 1-2 0v-3.586zM7 24a1 1 0 0 1 .293-.75l2.5-2.501a1 1 0 0 1 1.414 1.414l-.836.837H14a1 1 0 1 1 0 2h-3.543l.75.75a1 1 0 0 1-1.414 1.414l-2.306-2.306A1 1 0 0 1 7 24zm16.293 16.707l-2.5-2.5a1 1 0 0 1 1.414-1.414l.793.793V34a1 1 0 1 1 2 0v3.586l.793-.793a1 1 0 0 1 1.414 1.414l-2.5 2.5c-.188.188-.441.293-.707.293s-.519-.105-.707-.293zM24 20c2.208 0 4 1.792 4 4s-1.792 4-4 4-4-1.792-4-4 1.792-4 4-4z" fill="#fff"/>
  </svg>
`

export const touchHandlers = {
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
  }
}
