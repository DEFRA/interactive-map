import { getTooltipPosition } from './getTooltipPosition'

describe('getTooltipPosition', () => {
  const createRect = ({ top = 0, bottom = 0, left = 0, right = 0 } = {}) => ({
    top,
    bottom,
    left,
    right,
    width: right - left,
    height: bottom - top
  })

  it('returns bottom if triggerEl is not provided', () => {
    expect(getTooltipPosition(null, {})).toBe('bottom')
  })

  it('falls back to closest container if containerEl is not provided', () => {
    const containerEl = document.createElement('div')
    containerEl.classList.add('im-o-app__main')
    document.body.appendChild(containerEl)

    const triggerEl = document.createElement('div')
    containerEl.appendChild(triggerEl)

    // Let's make left space the smallest to avoid horizontal preference logic
    // triggerEl: top=50, bottom=60, left=5, right=15
    // containerEl: top=0, bottom=100, left=0, right=200
    // Spaces: top=50, bottom=40, left=5, right=185
    // Smallest space is left=5, so should return 'right' (opposite of left)
    triggerEl.getBoundingClientRect = jest.fn(() => createRect({ top: 50, bottom: 60, left: 5, right: 15 }))
    containerEl.getBoundingClientRect = jest.fn(() => createRect({ top: 0, bottom: 100, left: 0, right: 200 }))

    expect(getTooltipPosition(triggerEl)).toBe('right')
  })

  it('returns opposite side for horizontal preference when difference <= TOLERANCE', () => {
    const triggerEl = document.createElement('div')
    const containerEl = document.createElement('div')

    // Test case 1: Left space close to smallest vertical space
    // triggerEl: top=45, bottom=55, left=50, right=60
    // containerEl: top=0, bottom=100, left=0, right=200
    // Spaces: top=45, bottom=45, left=50, right=140
    // Smallest is top=45, left space=50, difference is 5 <= 50 (tolerance)
    // Since least side is 'top' (vertical), horizontal preference applies
    // Returns 'right' (opposite of left)
    triggerEl.getBoundingClientRect = jest.fn(() => createRect({ top: 45, bottom: 55, left: 50, right: 60 }))
    containerEl.getBoundingClientRect = jest.fn(() => createRect({ top: 0, bottom: 100, left: 0, right: 200 }))
    expect(getTooltipPosition(triggerEl, containerEl)).toBe('right')

    // Test case 2: Right space close to smallest vertical space
    // triggerEl: top=45, bottom=55, left=140, right=150
    // containerEl: top=0, bottom=100, left=0, right=200
    // Spaces: top=45, bottom=45, left=140, right=50
    // Smallest is top=45, right space=50, difference is 5 <= 50 (tolerance)
    // Since least side is 'top' (vertical), horizontal preference applies
    // Returns 'left' (opposite of right)
    triggerEl.getBoundingClientRect = jest.fn(() => createRect({ top: 45, bottom: 55, left: 140, right: 150 }))
    containerEl.getBoundingClientRect = jest.fn(() => createRect({ top: 0, bottom: 100, left: 0, right: 200 }))
    expect(getTooltipPosition(triggerEl, containerEl)).toBe('left')
  })

  it('returns default opposite side if horizontal not preferred', () => {
    const triggerEl = document.createElement('div')
    const containerEl = document.createElement('div')

    // Make top the smallest, but horizontal spaces too far away to trigger preference
    // triggerEl: top=10, bottom=20, left=150, right=160
    // containerEl: top=0, bottom=100, left=0, right=300
    // Spaces: top=10, bottom=80, left=150, right=140
    // Smallest space is top=10
    // Left space=150, difference is 140 > 50 (tolerance)
    // Right space=140, difference is 130 > 50 (tolerance)
    // No horizontal preference, so return opposite of top = 'bottom'
    triggerEl.getBoundingClientRect = jest.fn(() => createRect({ top: 10, bottom: 20, left: 150, right: 160 }))
    containerEl.getBoundingClientRect = jest.fn(() => createRect({ top: 0, bottom: 100, left: 0, right: 300 }))

    expect(getTooltipPosition(triggerEl, containerEl)).toBe('bottom')
  })
})
