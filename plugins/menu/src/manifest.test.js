import { manifest } from './manifest.js'
import { LayersMenu } from './components/Menu/Menu.jsx'
import { MenuInit } from './initialise/MenuInit.jsx'

jest.mock('./components/Menu/Menu.jsx', () => ({ LayersMenu: jest.fn() }))
jest.mock('./initialise/MenuInit.jsx', () => ({ MenuInit: jest.fn() }))
jest.mock('./registry/getDatasetRegistry.js', () => ({}))

describe('manifest', () => {
  it('sets InitComponent to MenuInit', () => {
    expect(manifest.InitComponent).toBe(MenuInit)
  })

  describe('panels', () => {
    it('defines one panel', () => {
      expect(manifest.panels).toHaveLength(1)
    })

    it('panel has id menu', () => {
      expect(manifest.panels[0].id).toBe('menu')
    })

    it('panel render is LayersMenu', () => {
      expect(manifest.panels[0].render).toBe(LayersMenu)
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

    it('button has id menuButton and links to the menu panel', () => {
      expect(manifest.buttons[0].id).toBe('menuButton')
      expect(manifest.buttons[0].panelId).toBe('menu')
    })

    it('button references the layers icon', () => {
      expect(manifest.buttons[0].iconId).toBe('layers')
    })
  })

  describe('icons', () => {
    it('defines one icon', () => {
      expect(manifest.icons).toHaveLength(1)
    })

    it('icon id is key', () => {
      expect(manifest.icons[0].id).toBe('key')
    })

    it('icon has svgContent', () => {
      expect(manifest.icons[0].svgContent).toBeTruthy()
    })
  })
})
