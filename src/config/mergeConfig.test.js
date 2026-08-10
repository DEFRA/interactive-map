// mergeConfig.test.js
import { mergeConfig } from './mergeConfig.js'
import defaults from './defaults.js'

describe('mergeConfig', () => {
  it('returns defaults when no userConfig is provided', () => {
    const result = mergeConfig()
    expect(result).toEqual(defaults)
  })

  it('merges defaults with userConfig', () => {
    const userConfig = { customKey: 'customValue' }
    const result = mergeConfig(userConfig)
    // should include everything from defaults, plus userConfig override
    expect(result).toMatchObject({ ...defaults, customKey: 'customValue' })
  })

  it('overrides defaults when keys overlap', () => {
    // Assume defaults has a key "theme"
    const userConfig = { theme: 'dark' }
    const result = mergeConfig(userConfig)
    expect(result.theme).toBe('dark')
  })

  it('maps deprecated mapViewParamKey to mapViewQueryParam', () => {
    const result = mergeConfig({ mapViewParamKey: 'view' })
    expect(result.mapViewQueryParam).toBe('view')
  })

  it('warns when deprecated mapViewParamKey is used', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mergeConfig({ mapViewParamKey: 'view' })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('mapViewParamKey is deprecated'))
    warnSpy.mockRestore()
  })

  it('does not warn when mapViewParamKey is not used', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mergeConfig({ mapViewQueryParam: 'view' })
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('sanitises hasExitButton to false for mapOnly behaviour', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const result = mergeConfig({ behaviour: 'mapOnly', hasExitButton: true })
    expect(result.hasExitButton).toBe(false)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("hasExitButton has no effect when behaviour is 'mapOnly'"))
    warnSpy.mockRestore()
  })

  it('leaves hasExitButton alone for non-mapOnly behaviours', () => {
    const result = mergeConfig({ behaviour: 'buttonFirst', hasExitButton: true })
    expect(result.hasExitButton).toBe(true)
  })

  it('does not warn when hasExitButton is already false for mapOnly', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mergeConfig({ behaviour: 'mapOnly', hasExitButton: false })
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
