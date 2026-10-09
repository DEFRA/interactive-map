import { updateUrl } from './updateUrl.js'
import { attachPluginStateRef } from '../registry/isVisibleWhen.js'

const setSearch = (search) => {
  window.history.replaceState({}, '', search || window.location.pathname)
}

const currentSearch = () => new URL(window.location.href).search

beforeEach(() => {
  setSearch('')
  attachPluginStateRef({})
})

afterAll(() => {
  setSearch('')
})

describe('updateUrl', () => {
  it('sets the search param for a radio group', () => {
    const pluginState = {
      menu: [{ id: 'datasets', type: 'radio' }],
      menuState: { datasets: 'floodZones' }
    }
    updateUrl(pluginState)
    expect(currentSearch()).toBe('?datasets=floodZones')
  })

  it('sets a comma separated search param for the checked checkboxes', () => {
    const pluginState = {
      menu: [{ id: 'layers', items: [{ id: 'flood' }, { id: 'erosion' }, { id: 'coastal' }] }],
      menuState: { flood: true, erosion: false, coastal: true }
    }
    updateUrl(pluginState)
    expect(currentSearch()).toBe('?layers=flood,coastal')
  })

  it('removes the search param when no checkboxes are checked', () => {
    setSearch('?layers=flood')
    const pluginState = {
      menu: [{ id: 'layers', items: [{ id: 'flood' }] }],
      menuState: { flood: false }
    }
    updateUrl(pluginState)
    expect(currentSearch()).toBe('')
  })

  it('removes the search param for a group that is not visible', () => {
    setSearch('?datasets=floodZones')
    const pluginState = {
      menu: [{ id: 'datasets', type: 'radio', visibleWhen: false }],
      menuState: { datasets: 'floodZones' }
    }
    updateUrl(pluginState)
    expect(currentSearch()).toBe('')
  })

  it('honours a visibleWhen menu condition against the current menu state', () => {
    const menuState = { datasets: 'coastalErosion', timeframe: '2050' }
    attachPluginStateRef({ current: { menuState } })
    const pluginState = {
      menu: [
        { id: 'datasets', type: 'radio' },
        { id: 'timeframe', type: 'radio', visibleWhen: { menu: { datasets: ['floodZones'] } } }
      ],
      menuState
    }
    updateUrl(pluginState)
    expect(currentSearch()).toBe('?datasets=coastalErosion')
  })

  it('leaves unrelated search params untouched', () => {
    setSearch('?zoom=12')
    const pluginState = {
      menu: [{ id: 'datasets', type: 'radio' }],
      menuState: { datasets: 'floodZones' }
    }
    updateUrl(pluginState)
    expect(currentSearch()).toBe('?zoom=12&datasets=floodZones')
  })

  it('replaces the history entry rather than pushing a new one', () => {
    const replaceState = jest.spyOn(window.history, 'replaceState')
    const pushState = jest.spyOn(window.history, 'pushState')
    updateUrl({ menu: [{ id: 'datasets', type: 'radio' }], menuState: { datasets: 'floodZones' } })
    expect(replaceState).toHaveBeenCalled()
    expect(pushState).not.toHaveBeenCalled()
    replaceState.mockRestore()
    pushState.mockRestore()
  })
})
