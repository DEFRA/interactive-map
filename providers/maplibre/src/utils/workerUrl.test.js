import { getWorkerUrl, isUnbundledWorkerUrl } from './workerUrl.js'

describe('getWorkerUrl', () => {
  test('resolves the maplibre-gl worker file relative to this module', () => {
    const url = new URL(getWorkerUrl('6.0.0'))

    expect(url.protocol).toBe('file:')
    expect(url.pathname).toMatch(/\/maplibre-gl\/dist\/maplibre-gl-worker\.mjs$/)
  })

  test('adds the MapLibre version as a cache-busting query', () => {
    expect(new URL(getWorkerUrl('6.0.0')).searchParams.get('v')).toBe('6.0.0')
  })
})

describe('isUnbundledWorkerUrl', () => {
  test('is true for a URL a bundler left as written', () => {
    expect(isUnbundledWorkerUrl('https://example.com/assets/maplibre-gl/dist/maplibre-gl-worker.mjs?v=6.0.0')).toBe(true)
    expect(isUnbundledWorkerUrl(getWorkerUrl('6.0.0'))).toBe(true)
  })

  test('is false for a worker file a bundler copied into the build', () => {
    expect(isUnbundledWorkerUrl('https://example.com/assets/maplibre-gl-worker-BrB25tGK.mjs')).toBe(false)
    expect(isUnbundledWorkerUrl('https://example.com/dist/113b7bc9b8a3c9226e4e.mjs')).toBe(false)
    expect(isUnbundledWorkerUrl('https://example.com/umd/im-maplibre-worker.76230dd4.js')).toBe(false)
  })
})
