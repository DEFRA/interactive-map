import { RecentImageSets } from './recentImageSets.js'

describe('RecentImageSets', () => {
  it('drops nothing while there are no more than two sizes or styles', () => {
    const sets = new RecentImageSets()
    expect(sets.add('outdoor|2', ['a', 'b'])).toEqual([])
    expect(sets.add('outdoor|3', ['c', 'd'])).toEqual([])
  })

  it('reports the oldest size or style\'s ids when a third is registered', () => {
    const sets = new RecentImageSets()
    sets.add('outdoor|2', ['a', 'b'])
    sets.add('outdoor|3', ['c'])
    expect(sets.add('outdoor|4', ['d'])).toEqual(['a', 'b'])
  })

  it('keeps an id that a kept size or style also uses', () => {
    const sets = new RecentImageSets()
    sets.add('outdoor|2', ['shared', 'a'])
    sets.add('dark|2', ['shared', 'b'])
    expect(sets.add('night|2', ['c'])).toEqual(['a'])
  })

  it('collects every registration for the same size and style, from any caller', () => {
    const sets = new RecentImageSets()
    sets.add('outdoor|2', ['dataset'])
    sets.add('outdoor|2', ['draw'])
    sets.add('outdoor|3', [])
    expect(sets.add('outdoor|4', [])).toEqual(['dataset', 'draw'])
  })

  it('treats registering again as the most recent use, so returning to a size or style keeps it', () => {
    const sets = new RecentImageSets()
    sets.add('outdoor|2', ['a'])
    sets.add('outdoor|3', ['b'])
    sets.add('outdoor|2', ['a'])
    expect(sets.add('outdoor|4', ['c'])).toEqual(['b'])
  })

  it('has no limit on how many images a size or style can hold', () => {
    const sets = new RecentImageSets()
    const manyIds = Array.from({ length: 5000 }, (_, index) => `image-${index}`)
    sets.add('outdoor|2', manyIds)
    expect(sets.add('outdoor|3', manyIds)).toEqual([])
  })
})
