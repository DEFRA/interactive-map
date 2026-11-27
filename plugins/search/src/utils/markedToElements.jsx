// src/plugins/search/utils/markedToElements.jsx

const MARK_TAG = /^<\/?mark>$/i

/**
 * Converts a suggestion's `marked` string to React children. Bare `<mark>` and `</mark>` tags
 * become `<mark>` elements; everything else, including any other markup, is rendered as text.
 */
export const markedToElements = (marked = '') => {
  let isMarked = false
  let offset = 0
  return marked.split(/(<\/?mark>)/i).flatMap(part => {
    const start = offset
    offset += part.length
    if (MARK_TAG.test(part)) {
      isMarked = part[1] !== '/'
      return []
    }
    if (!part) {
      return []
    }
    // Keyed by the segment's offset in `marked`, which is unique per segment
    return [isMarked ? <mark key={start}>{part}</mark> : part]
  })
}
