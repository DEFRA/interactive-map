import { api } from './index.js'
import { addSymbol } from './addSymbol.js'
import { removeSymbol } from './removeSymbol.js'

describe('api/index', () => {
  it('exports the addSymbol API', () => {
    expect(api.addSymbol).toBe(addSymbol)
  })

  it('exports the removeSymbol API', () => {
    expect(api.removeSymbol).toBe(removeSymbol)
  })
})
