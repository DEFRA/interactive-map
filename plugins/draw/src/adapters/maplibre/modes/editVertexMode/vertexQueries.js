import {
  getCoords,
  getMidpointCoords,
  getRingSegments,
  getSegmentForIndex
} from './geometryHelpers.js'
import { spatialNavigate } from '../../../../../../../src/utils/spatialNavigate.js'

export const vertexQueries = {
  findVertexIndex (coords, targetCoord, currentIdx) {
    // Search for vertex, preferring matches near currentIdx to handle duplicate coords (e.g., closing vertices)
    const matches = []
    coords.forEach((c, i) => {
      if (c[0] === targetCoord[0] && c[1] === targetCoord[1]) {
        matches.push(i)
      }
    })

    if (matches.length === 0) { return -1 }
    if (matches.length === 1) { return matches[0] }

    // Multiple matches - pick closest to current selection
    if (currentIdx >= 0) {
      return matches.reduce((best, idx) =>
        Math.abs(idx - currentIdx) < Math.abs(best - currentIdx) ? idx : best
      , matches[0])
    }
    return matches[0]
  },

  getCoordPath (state, idx) {
    const feature = this.getFeature(state.featureId)
    if (!feature) { return '0' }

    const segments = getRingSegments(feature)
    const result = getSegmentForIndex(segments, idx)
    if (!result) { return '0' }

    const { segment, localIdx } = result
    return [...segment.path, localIdx].join('.')
  },

  syncVertices (state) {
    state.vertices = this.getVertices(state.featureId)
    state.midpoints = this.getMidpoints(state.featureId)
  },

  getVertices (featureId) {
    return getCoords(this.getFeature(featureId))
  },

  getMidpoints (featureId) {
    return getMidpointCoords(this.getFeature(featureId))
  },

  getVertexOrMidpoint (state, direction) {
    // Ensure vertices and midpoints are populated
    if (!state.vertices?.length) {
      state.vertices = this.getVertices(state.featureId)
      state.midpoints = this.getMidpoints(state.featureId)
    }
    if (!state.vertices?.length) {
      return [-1, null]
    }
    const project = (p) => p ? Object.values(this.map.project(p)) : null
    const pixels = [...state.vertices.map(project), ...state.midpoints.map(project)].filter(Boolean)
    if (!pixels.length) {
      return [-1, null]
    }
    const start = pixels[state.selectedVertexIndex] || Object.values(this.map.project(this.map.getCenter()))
    const idx = spatialNavigate(start, pixels, direction)
    return [idx, idx < state.vertices.length ? 'vertex' : 'midpoint']
  },

  getVertexIndexFromMidpoint (state, coordPath) {
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
        return state.vertices.length + midpointOffset + localMidpointIdx
      }
      // Count midpoints in this segment (must match getMidpoints calculation)
      const segMidpoints = seg.closed ? seg.length : seg.length - 1
      midpointOffset += segMidpoints
    }

    // Fallback
    return state.vertices.length
  }
}
