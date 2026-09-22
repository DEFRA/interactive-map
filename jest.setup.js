import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'node:util'

// structuredClone is not exposed by jsdom; polyfill it using JSON round-trip
if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj))
}

// TextEncoder/TextDecoder aren't exposed by jsdom either — OL 10.10's WebGL text rendering
// module references TextEncoder at load time, so importing any WebGL layer throws without this.
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
