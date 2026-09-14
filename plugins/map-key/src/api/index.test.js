import { api } from './index.js'
import { addKeyItem } from './addKeyItem.js'
import { removeKeyItem } from './removeKeyItem.js'

describe('api/index', () => {
  it('exports the addKeyItem API', () => {
    expect(api.addKeyItem).toBe(addKeyItem)
  })

  it('exports the removeKeyItem API', () => {
    expect(api.removeKeyItem).toBe(removeKeyItem)
  })
})
