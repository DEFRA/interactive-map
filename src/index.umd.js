// src/index.umd.js
// Import using React entrypoints so externals resolve to Preact globals

import React, { useState } from 'react' // Import at least ONE hook to force react-hooks → preact/hooks
import * as JSXRuntime from 'react/jsx-runtime'

import InteractiveMap from './index.js'

const g = typeof window !== 'undefined' ? window : globalThis

// Create `defra` namespace if missing
g.defra = g.defra || {}

// Expose globals exactly like CDN version
g.preactCompat = React // maps to preact/compat
g.preactJsxRuntime = JSXRuntime
g.preactHooks = { useState } // the act of importing keeps the module alive

// Attach the main map
g.defra.InteractiveMap = InteractiveMap

// Ensure compat.default exists
if (!g.preactCompat.default) {
  g.preactCompat.default = g.preactCompat
}

// Add createRoot shim
if (!g.preactCompat.createRoot) {
  g.preactCompat.createRoot = function (container) {
    return {
      render (vnode) {
        g.preactCompat.render(vnode, container)
      },
      unmount () {
        g.preactCompat.render(null, container)
      }
    }
  }
}

// *Prevent tree-shaking - might be needed?
// export const __keep = {
//   React,
//   ReactDOM,
//   JSXRuntime,
//   useState
// }

export default InteractiveMap
