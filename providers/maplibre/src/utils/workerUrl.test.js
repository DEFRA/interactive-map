import { getWorkerUrl } from './workerUrl.js'

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
