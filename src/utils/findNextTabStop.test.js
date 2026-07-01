/**
 * @jest-environment jsdom
 */

import { findTabStop } from './findNextTabStop.js'

// --- MOCK SETUP ---
// Helper to create mock elements. The default value (tabIndex = 0)
// is covered below by creating 'el1' without the second argument.
const createMockElement = (id, tabIndex = 0, offsetParent = {}) => ({
  id,
  tabIndex,
  offsetParent,
  // Required so Jest knows which element is which in the array lookup
  toString: () => id
})

// Setup global mock for document.querySelectorAll
const mockFocusableElements = (elements) => {
  // We mock this function because in a Node/Jest environment, the browser DOM doesn't exist.
  document.querySelectorAll = jest.fn(() => elements)
}

describe('findTabStop', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Test 1: Covers: 'next' direction, successful list[index + 1], filtering, AND helper default value.
  it('should find the next tab stop, skipping negative tabIndex', () => {
    // Arrange
    // el1 uses the default tabIndex = 0, ensuring full coverage of the helper function default.
    const el1 = createMockElement('el1') // index 0 in filtered list
    const el2 = createMockElement('el2', -1) // Skipped
    const el3 = createMockElement('el3', 1) // index 1 in filtered list

    mockFocusableElements([el1, el2, el3])

    // Act: Start from el1 and search for the 'next' tab stop.
    const result = findTabStop({ el: el1, direction: 'next' })

    // Assert: The result should be el3.
    expect(result).toBe(el3)

    expect(document.querySelectorAll).toHaveBeenCalledTimes(1)
  })

  // Test 2: Covers: 'prev' direction (index - 1 side of the ternary).
  it('should find the previous tab stop when direction is "prev"', () => {
    // Arrange
    const el1 = createMockElement('el1', 0)
    const el2 = createMockElement('el2', 1)

    mockFocusableElements([el1, el2])

    // Act: Start from el2 (index 1) and search for 'prev' -> list[1 - 1] -> el1
    const result = findTabStop({ el: el2, direction: 'prev' })

    // Assert: The previous element is el1.
    expect(result).toBe(el1)
  })

  // Test 3: Covers: Fallback logic (list[0] side of the || operator).
  it('should wrap to the first element (list[0]) when searching "next" from the last element', () => {
    // Arrange
    const el1 = createMockElement('el1', 0)
    const el2 = createMockElement('el2', 1)

    mockFocusableElements([el1, el2])

    // Act: Start from the last element (el2) and search for 'next'.
    // list[index + 1] is undefined, triggering the || list[0] fallback.
    const result = findTabStop({ el: el2, direction: 'next' })

    // Assert: It wraps around to the first element, el1.
    expect(result).toBe(el1)
  })

  // Test 4: Covers: skipping elements with no offsetParent (hidden, e.g. wrong-breakpoint duplicates).
  it('should skip hidden elements (no offsetParent) even when tabIndex is valid', () => {
    const el1 = createMockElement('el1', 0)
    const hiddenEl = createMockElement('hidden', 0, null)
    const el3 = createMockElement('el3', 0)

    mockFocusableElements([el1, hiddenEl, el3])

    const result = findTabStop({ el: el1, direction: 'next' })

    expect(result).toBe(el3)
  })

  it('accepts a custom root to scope the search', () => {
    const el1 = createMockElement('el1')
    const scopedRoot = { querySelectorAll: jest.fn(() => [el1]) }

    findTabStop({ el: el1, direction: 'next', root: scopedRoot })

    expect(scopedRoot.querySelectorAll).toHaveBeenCalledTimes(1)
    expect(document.querySelectorAll).not.toHaveBeenCalled()
  })
})
