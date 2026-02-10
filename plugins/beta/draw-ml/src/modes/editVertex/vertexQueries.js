import {
  getCoords,
  getRingSegments,
  getSegmentForIndex
} from './geometryHelpers.js'
import { spatialNavigate } from '../../utils/spatial.js'

export const vertexQueries = {
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
  }
}
