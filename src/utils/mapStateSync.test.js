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
  })

  describe('setMapStateInURL', () => {
    it('preserves history state and filters params (Line 28)', () => {
      const mockHref = 'http://test.com/path?existing=true'
      setMapStateInURL('map1', { center: [10, 20], zoom: 5 }, mockHref)

      // Verification of Line 28: First arg must be global history state
      expect(globalThis.history.replaceState).toHaveBeenCalledWith(
        globalThis.history.state,
        '',
        expect.stringContaining('map1:center=10,20')
      )
    })

    it('uses fallback localhost URL (Line 17)', () => {
      setMapStateInURL('map1', { zoom: 10 }, null)
      const lastCall = globalThis.history.replaceState.mock.calls[0][2]
      expect(lastCall).toContain('http://localhost')
    })

    it('handles state where zoom is nullish (Line 24)', () => {
      setMapStateInURL('map1', { center: [0, 0], zoom: null }, 'http://test.com')
      const lastCall = globalThis.history.replaceState.mock.calls[0][2]
      expect(lastCall).not.toContain('zoom')
    })

    it('triggers the default href parameter', () => {
      setMapStateInURL('map1', { zoom: 10 })
      expect(globalThis.history.replaceState).toHaveBeenCalled()
    })
  })
})
