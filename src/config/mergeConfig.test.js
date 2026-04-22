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
})
