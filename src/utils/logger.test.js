import { logger } from './logger.js'

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('logger', () => {
  it('logger.warn calls console.warn with the [interactive-map] prefix', () => {
    logger.warn('something went wrong')
    expect(console.warn).toHaveBeenCalledWith('[interactive-map]', 'something went wrong')
  })

  it('logger.error calls console.error with the [interactive-map] prefix', () => {
    logger.error('critical failure')
    expect(console.error).toHaveBeenCalledWith('[interactive-map]', 'critical failure')
  })

  it('logger.warn forwards multiple arguments', () => {
    logger.warn('slot', 'invalid', { detail: true })
    expect(console.warn).toHaveBeenCalledWith('[interactive-map]', 'slot', 'invalid', { detail: true })
  })

  it('logger.error forwards multiple arguments', () => {
    logger.error('code', 42, null)
    expect(console.error).toHaveBeenCalledWith('[interactive-map]', 'code', 42, null)
  })
})
