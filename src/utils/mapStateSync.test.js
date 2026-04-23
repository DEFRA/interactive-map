import { setMapStateInURL, getInitialMapState } from './mapStateSync'

describe('mapStateSync utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(globalThis.history, 'replaceState').mockImplementation(() => {})
  })

  describe('getInitialMapState', () => {
    it('returns state from a custom search string', () => {
      const state = getInitialMapState({ id: 'map1' }, '?map1:center=10,20&map1:zoom=5')
      expect(state.zoom).toBe(5)
      expect(state.center).toEqual([10, 20])
    })

    it('uses the global search default parameter', () => {
      // Hits the default search = globalThis.location.search
      const state = getInitialMapState({ id: 'map1', center: [1, 2], zoom: 3 })
      expect(state.center).toEqual([1, 2])
    })

    it('returns null internal state if params are missing', () => {
      // Hits the "if (!centerStr || !zoomStr) return null" block
      const state = getInitialMapState({ id: 'map1', center: [1, 1] }, '?foo=bar')
      expect(state.center).toEqual([1, 1])
    })

    it('returns bounds if URL state is missing (Line 46)', () => {
      const bounds = [[0, 0], [10, 10]]
      const state = getInitialMapState({ id: 'map1', bounds }, '')
      expect(state.bounds).toEqual(bounds)
    })

    it('ignores URL params when urlPosition is none', () => {
      const state = getInitialMapState(
        { id: 'map1', center: [1, 2], zoom: 3, urlPosition: 'none' },
        '?map1:center=10,20&map1:zoom=5'
      )
      expect(state.center).toEqual([1, 2])
      expect(state.zoom).toBe(3)
    })

    it('reads URL params when urlPosition is readOnly', () => {
      const state = getInitialMapState(
        { id: 'map1', center: [1, 2], zoom: 3, urlPosition: 'readOnly' },
        '?map1:center=10,20&map1:zoom=5'
      )
      expect(state.center).toEqual([10, 20])
      expect(state.zoom).toBe(5)
    })
  })

  describe('setMapStateInURL', () => {
    it('writes center and zoom into the URL', () => {
      const mockHref = 'http://test.com/path?existing=true'
      setMapStateInURL('map1', { center: [10, 20], zoom: 5 }, mockHref)

      expect(globalThis.history.replaceState).toHaveBeenCalledWith(
        globalThis.history.state,
        '',
        expect.stringContaining('map1:center=10,20')
      )
    })

    it('replaces existing map params when already present in the URL', () => {
      setMapStateInURL('map1', { center: [10, 20], zoom: 5 }, 'http://test.com?map1:center=1,2&map1:zoom=3')
      const url = globalThis.history.replaceState.mock.calls[0][2]
      expect(url).toContain('map1:center=10,20')
      expect(url).toContain('map1:zoom=5')
      expect(url).not.toContain('map1:center=1,2')
    })

    it('preserves unrelated existing params (e.g. mv)', () => {
      setMapStateInURL('map1', { center: [10, 20], zoom: 5 }, 'http://test.com/path?mv=map1')
      const url = globalThis.history.replaceState.mock.calls[0][2]
      expect(url).toContain('mv=map1')
      expect(url).toContain('map1:center=10,20')
    })

    it('uses fallback localhost URL when href is null', () => {
      setMapStateInURL('map1', { zoom: 10 }, null)
      const url = globalThis.history.replaceState.mock.calls[0][2]
      expect(url).toContain('http://localhost')
    })

    it('omits zoom when zoom is null', () => {
      setMapStateInURL('map1', { center: [0, 0], zoom: null }, 'http://test.com')
      const url = globalThis.history.replaceState.mock.calls[0][2]
      expect(url).not.toContain('zoom')
    })

    it('uses window.location.href when no href is provided', () => {
      setMapStateInURL('map1', { zoom: 10 })
      expect(globalThis.history.replaceState).toHaveBeenCalled()
    })

    it('produces a URL with no search string when state is empty and no existing params', () => {
      setMapStateInURL('map1', {}, 'http://test.com/path')
      const url = globalThis.history.replaceState.mock.calls[0][2]
      expect(url).toBe('http://test.com/path')
    })
  })
})
