import { resolveStepAmount } from './resolveNudgeStep.js'

describe('resolveStepAmount', () => {
  it('returns the small value when isLargeStep is false', () => {
    expect(resolveStepAmount(false, 5, 100)).toBe(5)
  })

  it('returns the large value when isLargeStep is true', () => {
    expect(resolveStepAmount(true, 5, 100)).toBe(100)
  })
})
