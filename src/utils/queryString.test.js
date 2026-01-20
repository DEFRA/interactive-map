import { getQueryParam } from './queryString.js'

describe('getQueryParam', () => {
  it('should work when a search string is provided', () => {
    expect(getQueryParam('name', '?name=test')).toBe('test')
  })

  it('should work when using the default global location', () => {
    expect(getQueryParam('name')).toBeNull()
  })
})
