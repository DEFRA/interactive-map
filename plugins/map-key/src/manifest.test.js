import { manifest } from './manifest.js'
import { MapKey } from './components/Key/MapKey.jsx'
import { MapKeyInit } from './initialise/MapKeyInit.jsx'

jest.mock('./components/Key/MapKey.jsx', () => ({ MapKey: jest.fn() }))
jest.mock('./initialise/MapKeyInit.jsx', () => ({ MapKeyInit: jest.fn() }))
jest.mock('./registry/getDatasetRegistry.js', () => ({}))

describe('manifest', () => {
  it('sets InitComponent to MapKeyInit', () => {
    expect(manifest.InitComponent).toBe(MapKeyInit)
  })

  describe('panels', () => {
    it('defines one panel', () => {
      expect(manifest.panels).toHaveLength(1)
    })

    it('panel has id mapKey', () => {
      expect(manifest.panels[0].id).toBe('mapKey')
    })

    it('panel render is MapKey', () => {
      expect(manifest.panels[0].render).toBe(MapKey)
    })

    it('panel defines mobile, tablet and desktop slots', () => {
      const { mobile, tablet, desktop } = manifest.panels[0]
      expect(mobile.slot).toBe('drawer')
      expect(tablet.slot).toBe('left-top')
      expect(desktop.slot).toBe('left-top')
    })
  })

  describe('buttons', () => {
    it('defines one button', () => {
      expect(manifest.buttons).toHaveLength(1)
    })

    it('button has id mapKey and links to the mapKey panel', () => {
      expect(manifest.buttons[0].id).toBe('mapKey')
      expect(manifest.buttons[0].panelId).toBe('mapKey')
    })

    it('button references the key icon', () => {
      expect(manifest.buttons[0].iconId).toBe('key')
    })
  })

  describe('icons', () => {
    it('defines one icon', () => {
      expect(manifest.icons).toHaveLength(1)
    })

    it('icon id matches the button iconId', () => {
      expect(manifest.icons[0].id).toBe(manifest.buttons[0].iconId)
    })

    it('icon has svgContent', () => {
      expect(manifest.icons[0].svgContent).toBeTruthy()
    })
  })
})
