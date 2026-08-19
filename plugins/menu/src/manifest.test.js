import { manifest } from './manifest.js'
import { Menu } from './components/Key/Menu.jsx'
import { MenuInit } from './initialise/MenuInit.jsx'

jest.mock('./components/Key/Menu.jsx', () => ({ Menu: jest.fn() }))
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

    it('panel render is Menu', () => {
      expect(manifest.panels[0].render).toBe(Menu)
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

    it('button has id menu and links to the menu panel', () => {
      expect(manifest.buttons[0].id).toBe('menu')
      expect(manifest.buttons[0].panelId).toBe('menu')
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
