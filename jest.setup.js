import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'node:util'

// structuredClone is not exposed by jsdom; polyfill it using JSON round-trip
if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj))
}

// TextEncoder/TextDecoder aren't exposed by jsdom either — ol/webgl/LabelsArray.js (new in
// OL 10.10, for WebGL text rendering) references TextEncoder at module load time, so importing
// any WebGL layer at all now throws in tests without this, even for code paths that never
// render text. Real browsers all have this natively; Node's own util module does too.
if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder
}

// Global mock for window.matchMedia
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // legacy
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  })
}
