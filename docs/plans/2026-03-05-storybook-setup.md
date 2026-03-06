# Storybook Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Storybook with @storybook/react-webpack5 to enable local interaction and visual testing of InteractiveMap permutations across all plugin combinations.

**Architecture:** A `.storybook/` config directory at root configures Storybook with webpack5, SCSS support via `style-loader`, and the existing turf/maplibre module aliases. A shared `InteractiveMapStory` React wrapper in `stories/components/` handles the InteractiveMap lifecycle (mount via dynamic import, destroy on unmount). Individual story files in `stories/` cover each plugin in isolation and in kitchen-sink combinations. Play functions provide interaction tests on key stories.

**Tech Stack:** Storybook 8, @storybook/react-webpack5, @storybook/addon-essentials, @storybook/addon-interactions, @storybook/addon-a11y, @storybook/test-runner, React, MapLibre (maplibreProvider), OS Open Zoomstack tiles (free, no API key required), Nominatim geocoding (free, no API key required).

---

### Task 1: Install Storybook and addon dependencies

**Files:**
- Modify: `package.json` (npm will update this automatically)

**Step 1: Install all Storybook devDependencies in one command**

```bash
npm install --save-dev \
  storybook \
  @storybook/react-webpack5 \
  @storybook/addon-essentials \
  @storybook/addon-interactions \
  @storybook/addon-a11y \
  @storybook/test-runner \
  style-loader
```

`style-loader` is needed to inject SCSS/CSS into the DOM at runtime in Storybook (replaces `MiniCssExtractPlugin.loader` which is for production builds only).

**Step 2: Verify the install succeeded**

```bash
npx storybook --version
```

Expected output: a version number like `8.x.x`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install Storybook and addon dependencies"
```

---

### Task 2: Create `.storybook/main.js`

**Files:**
- Create: `.storybook/main.js`

This file tells Storybook where to find stories, which addons to load, and how to customise the webpack config. The `webpackFinal` function adds SCSS support and deduplicates the same turf/maplibre modules that `webpack.dev.mjs` aliases.

**Step 1: Create the file**

```js
// .storybook/main.js
const path = require('path')

/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const config = {
  stories: ['../stories/**/*.stories.@(js|jsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y'
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {}
  },
  webpackFinal: async (config) => {
    // Add SCSS support. Uses style-loader (injects into DOM) rather than
    // MiniCssExtractPlugin (which writes separate files for production builds).
    config.module.rules.push({
      test: /\.s[ac]ss$/i,
      use: ['style-loader', 'css-loader', 'sass-loader']
    })

    // Deduplicate modules that have nested copies inside maplibre dependencies.
    // Mirrors the alias block in webpack.dev.mjs.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@turf/meta': path.resolve(__dirname, '../node_modules/@turf/meta'),
      '@turf/helpers': path.resolve(__dirname, '../node_modules/@turf/helpers'),
      'robust-predicates': path.resolve(__dirname, '../node_modules/robust-predicates')
    }

    return config
  }
}

module.exports = config
```

**Step 2: Verify Storybook starts (no stories yet is fine)**

```bash
npm run storybook
```

Expected: Storybook opens in the browser at `http://localhost:6006` with an empty or welcome screen. No webpack errors. Stop with Ctrl+C.

**Step 3: Commit**

```bash
git add .storybook/main.js
git commit -m "chore: add Storybook webpack5 config"
```

---

### Task 3: Create `.storybook/preview.js`

**Files:**
- Create: `.storybook/preview.js`

This file sets global parameters available to all stories: custom viewport presets for mobile and desktop testing.

**Step 1: Create the file**

```js
// .storybook/preview.js
import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport'

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    viewport: {
      viewports: {
        ...INITIAL_VIEWPORTS,
        mapMobile: {
          name: 'Map Mobile (375px)',
          styles: { width: '375px', height: '812px' }
        },
        mapDesktop: {
          name: 'Map Desktop (1280px)',
          styles: { width: '1280px', height: '800px' }
        }
      }
    }
  }
}

export default preview
```

**Step 2: Commit**

```bash
git add .storybook/preview.js
git commit -m "chore: add Storybook preview config with viewport presets"
```

---

### Task 4: Create `stories/components/InteractiveMapStory.jsx`

**Files:**
- Create: `stories/components/InteractiveMapStory.jsx`

This is the shared wrapper all stories use. It handles the full lifecycle:
- Dynamic imports of `InteractiveMap` and `maplibreProvider` (same pattern as `demo/DemoMapInline.js`)
- Unique DOM ID per mount using a module-level counter (avoids ID collisions when switching stories)
- Clean `destroy()` on unmount
- Accepts `mapConfig` (overrides defaults) and `plugins` (array of plugin instances)

Default config uses free OS Open Zoomstack tiles centred on England — no API key needed.

**Step 1: Create the wrapper component**

```jsx
// stories/components/InteractiveMapStory.jsx
import { useEffect, useRef } from 'react'

let counter = 0

export default function InteractiveMapStory ({ mapConfig = {}, plugins = [] }) {
  const id = useRef(`story-map-${++counter}`).current
  const mapRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      import('../../src/index.js'),
      import('../../providers/maplibre/src/index.js')
    ]).then(([{ default: InteractiveMap }, { default: maplibreProvider }]) => {
      if (cancelled) return

      mapRef.current = new InteractiveMap(id, {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        mapStyle: {
          url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
          attribution: `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`,
          backgroundColor: '#f5f5f0'
        },
        center: [-1.6, 53.1],
        zoom: 6,
        containerHeight: '500px',
        enableZoomControls: true,
        ...mapConfig,
        plugins
      })
    })

    return () => {
      cancelled = true
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [])

  return <div id={id} style={{ minHeight: '50px' }} />
}
```

**Note on unique IDs:** `useRef` initialises once per component instance. The module-level `counter` increments on each mount so every story gets a unique element ID even if you navigate between stories rapidly.

**Note on `cancelled` flag:** If the component unmounts before the dynamic imports resolve (e.g. navigating away quickly), `cancelled = true` prevents `new InteractiveMap()` from being called after `destroy()`.

**Step 2: Commit**

```bash
git add stories/components/InteractiveMapStory.jsx
git commit -m "feat: add InteractiveMapStory shared wrapper component"
```

---

### Task 5: Create `stories/InteractiveMap.stories.js`

**Files:**
- Create: `stories/InteractiveMap.stories.js`

Two stories covering core behaviour modes — `inline` and `buttonFirst` — each with a play function.

**Step 1: Create the story file**

```js
// stories/InteractiveMap.stories.js
import { within, waitFor, expect, userEvent } from '@storybook/test'
import InteractiveMapStory from './components/InteractiveMapStory.jsx'

export default {
  title: 'InteractiveMap',
  component: InteractiveMapStory
}

export const Inline = {
  args: {
    mapConfig: { behaviour: 'inline' },
    plugins: []
  },
  play: async ({ canvasElement }) => {
    // The map renders a <canvas> element once MapLibre initialises.
    // Wait up to 15s to allow tile fetch and render.
    await waitFor(
      () => expect(canvasElement.querySelector('canvas')).not.toBeNull(),
      { timeout: 15000 }
    )
  }
}

export const ButtonFirst = {
  args: {
    mapConfig: { behaviour: 'buttonFirst', containerHeight: '500px' },
    plugins: []
  },
  play: async ({ canvasElement }) => {
    // The buttonFirst behaviour renders an <a role="button"> before the map container.
    // It is inserted as a DOM sibling (beforebegin) of the story's root div,
    // so it is still within canvasElement.
    const button = await within(canvasElement).findByRole('button', {}, { timeout: 5000 })
    await userEvent.click(button)

    // After click, InteractiveMap loads asynchronously and renders the map canvas.
    await waitFor(
      () => expect(canvasElement.querySelector('canvas')).not.toBeNull(),
      { timeout: 15000 }
    )
  }
}
```

**Step 2: Run Storybook and verify both stories render**

```bash
npm run storybook
```

Navigate to `InteractiveMap > Inline` — expect a map centred on England to render.
Navigate to `InteractiveMap > ButtonFirst` — expect a button to appear, clicking it should open the map.

**Step 3: Commit**

```bash
git add stories/InteractiveMap.stories.js
git commit -m "feat: add Inline and ButtonFirst Storybook stories"
```

---

### Task 6: Create `stories/Plugins.stories.js`

**Files:**
- Create: `stories/Plugins.stories.js`

One story per plugin to verify it loads correctly, plus two kitchen-sink stories. All use `behaviour: 'inline'` unless noted.

**Plugin import paths** (from `demo/js/index.js`):
- search → `../../plugins/search/src/index.js`
- interact → `../../plugins/interact/src/index.js`
- scale-bar → `../../plugins/beta/scale-bar/src/index.js`
- map-styles → `../../plugins/beta/map-styles/src/index.js`
- use-location → `../../plugins/beta/use-location/src/index.js`
- datasets → `../../plugins/beta/datasets/src/index.js`
- draw-ml → `../../plugins/beta/draw-ml/src/index.js`
- frame → `../../plugins/beta/frame/src/index.js`

Each per-plugin story uses `usePlugins` — a helper that dynamically imports the plugin factory and returns its instance. Because stories are defined statically, plugin instances are built inside a render wrapper.

**Step 1: Create the story file**

```jsx
// stories/Plugins.stories.js
import { useEffect, useRef, useState } from 'react'
import { waitFor, expect } from '@storybook/test'

// Nominatim dataset used by search stories (free, no API key)
const nominatimDataset = {
  name: 'nominatim',
  urlTemplate: 'https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=8&countrycodes=gb',
  parseResults: (json, query) => {
    if (!Array.isArray(json)) return []
    const esc = q => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const rx = new RegExp(`(${esc(query)})`, 'i')
    return json.map(r => {
      const [south, north, west, east] = r.boundingbox.map(Number)
      const text = (r.display_name || '').slice(0, 79)
      return {
        id: String(r.place_id),
        bounds: [west, south, east, north],
        point: [+r.lon, +r.lat],
        text,
        marked: text.replace(rx, '<mark>$1</mark>'),
        type: 'nominatim'
      }
    })
  }
}

const OS_ATTRIBUTION = `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`

const MAP_STYLES = [
  {
    id: 'outdoor',
    label: 'Outdoor',
    url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
    attribution: OS_ATTRIBUTION,
    backgroundColor: '#f5f5f0'
  },
  {
    id: 'night',
    label: 'Night',
    url: 'https://labs.os.uk/tiles/styles/open-zoomstack-night/style.json',
    attribution: OS_ATTRIBUTION,
    mapColorScheme: 'dark',
    appColorScheme: 'dark'
  }
]

// ─── Shared wrapper for plugin stories ───────────────────────────────────────
// Accepts a `buildPlugins` async function that resolves to an array of plugin
// instances. This is needed because plugin factory imports are async.

let counter = 0

function PluginStory ({ buildPlugins, mapConfig = {} }) {
  const id = useRef(`story-map-${++counter}`).current
  const mapRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      import('../src/index.js'),
      import('../providers/maplibre/src/index.js'),
      buildPlugins()
    ]).then(([{ default: InteractiveMap }, { default: maplibreProvider }, plugins]) => {
      if (cancelled) return

      mapRef.current = new InteractiveMap(id, {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        mapStyle: {
          url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
          attribution: OS_ATTRIBUTION,
          backgroundColor: '#f5f5f0'
        },
        center: [-1.6, 53.1],
        zoom: 6,
        containerHeight: '500px',
        enableZoomControls: true,
        ...mapConfig,
        plugins
      })
    })

    return () => {
      cancelled = true
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [])

  return <div id={id} style={{ minHeight: '50px' }} />
}

// ─── Play function helper ─────────────────────────────────────────────────────
const waitForCanvas = async (canvasElement) => {
  await waitFor(
    () => expect(canvasElement.querySelector('canvas')).not.toBeNull(),
    { timeout: 15000 }
  )
}

// ─── Story metadata ───────────────────────────────────────────────────────────
export default {
  title: 'Plugins',
  render: (args) => <PluginStory {...args} />
}

// ─── Individual plugin stories ────────────────────────────────────────────────

export const WithSearch = {
  args: {
    buildPlugins: async () => {
      const { default: searchPlugin } = await import('../plugins/search/src/index.js')
      return [searchPlugin({ customDatasets: [nominatimDataset], showMarker: true })]
    }
  },
  play: async ({ canvasElement }) => {
    await waitForCanvas(canvasElement)
    await waitFor(
      () => expect(canvasElement.querySelector('[class*="search"]')).not.toBeNull(),
      { timeout: 5000 }
    )
  }
}

export const WithInteract = {
  args: {
    buildPlugins: async () => {
      const { default: createInteractPlugin } = await import('../plugins/interact/src/index.js')
      // Use marker mode — does not require specific vector tile layers
      return [createInteractPlugin({ interactionMode: 'marker' })]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const WithScaleBar = {
  args: {
    buildPlugins: async () => {
      const { default: scaleBarPlugin } = await import('../plugins/beta/scale-bar/src/index.js')
      return [scaleBarPlugin({ units: 'metric' })]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const WithMapStyles = {
  args: {
    buildPlugins: async () => {
      const { default: mapStylesPlugin } = await import('../plugins/beta/map-styles/src/index.js')
      return [mapStylesPlugin({ mapStyles: MAP_STYLES })]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const WithUseLocation = {
  args: {
    buildPlugins: async () => {
      const { default: useLocationPlugin } = await import('../plugins/beta/use-location/src/index.js')
      return [useLocationPlugin()]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const WithDatasets = {
  args: {
    buildPlugins: async () => {
      const { default: createDatasetsPlugin } = await import('../plugins/beta/datasets/src/index.js')
      // Empty datasets array — verifies the plugin initialises without needing a live API
      return [createDatasetsPlugin({ datasets: [] })]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const WithDrawML = {
  args: {
    buildPlugins: async () => {
      const { default: createDrawPlugin } = await import('../plugins/beta/draw-ml/src/index.js')
      return [createDrawPlugin({})]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const WithFrame = {
  args: {
    buildPlugins: async () => {
      const { default: createFramePlugin } = await import('../plugins/beta/frame/src/index.js')
      return [createFramePlugin({ aspectRatio: 1.5 })]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

// ─── Kitchen sink stories ─────────────────────────────────────────────────────

export const KitchenSink = {
  args: {
    buildPlugins: async () => {
      const [
        { default: searchPlugin },
        { default: createInteractPlugin },
        { default: scaleBarPlugin },
        { default: mapStylesPlugin },
        { default: useLocationPlugin },
        { default: createDatasetsPlugin },
        { default: createDrawPlugin },
        { default: createFramePlugin }
      ] = await Promise.all([
        import('../plugins/search/src/index.js'),
        import('../plugins/interact/src/index.js'),
        import('../plugins/beta/scale-bar/src/index.js'),
        import('../plugins/beta/map-styles/src/index.js'),
        import('../plugins/beta/use-location/src/index.js'),
        import('../plugins/beta/datasets/src/index.js'),
        import('../plugins/beta/draw-ml/src/index.js'),
        import('../plugins/beta/frame/src/index.js')
      ])

      return [
        searchPlugin({ customDatasets: [nominatimDataset], showMarker: true }),
        createInteractPlugin({ interactionMode: 'marker' }),
        scaleBarPlugin({ units: 'metric' }),
        mapStylesPlugin({ mapStyles: MAP_STYLES }),
        useLocationPlugin(),
        createDatasetsPlugin({ datasets: [] }),
        createDrawPlugin({}),
        createFramePlugin({ aspectRatio: 1.5 })
      ]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const ButtonFirstKitchenSink = {
  args: {
    mapConfig: { behaviour: 'buttonFirst', containerHeight: '500px' },
    buildPlugins: KitchenSink.args.buildPlugins
  },
  play: async ({ canvasElement }) => {
    const { within, userEvent } = await import('@storybook/test')
    const button = await within(canvasElement).findByRole('button', {}, { timeout: 5000 })
    await userEvent.click(button)
    await waitForCanvas(canvasElement)
  }
}
```

**Step 2: Run Storybook and verify all plugin stories render**

```bash
npm run storybook
```

Work through each story in the `Plugins` group and confirm the map renders and the plugin UI appears. Expect the canvas element to be present in all stories.

**Step 3: Commit**

```bash
git add stories/Plugins.stories.js
git commit -m "feat: add per-plugin and kitchen sink Storybook stories"
```

---

### Task 7: Add npm scripts to `package.json`

**Files:**
- Modify: `package.json`

**Step 1: Add three scripts to the `"scripts"` block**

Open `package.json`. In the `"scripts"` object, add:

```json
"storybook": "storybook dev -p 6006",
"build:storybook": "storybook build",
"test:storybook": "test-storybook"
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add storybook, build:storybook, and test:storybook npm scripts"
```

---

### Task 8: Install Playwright and run the test-runner end-to-end

`@storybook/test-runner` requires Playwright browsers to be installed separately.

**Step 1: Install Playwright browsers**

```bash
npx playwright install --with-deps chromium
```

**Step 2: Start Storybook in one terminal**

```bash
npm run storybook
```

Wait until you see `Storybook X.X.X started` in the terminal output.

**Step 3: In a second terminal, run the test-runner**

```bash
npm run test:storybook
```

Expected output: all stories pass, play functions show green checkmarks. Any failures will print the failing assertion and the story name.

**Step 4: Commit if all tests pass**

```bash
git add .
git commit -m "feat: Storybook setup complete with interaction tests for all plugin permutations"
```

---

## Notes for common issues

**MapLibre canvas not rendering in JSDOM:** `@storybook/test-runner` uses a real Chromium browser via Playwright, so WebGL and canvas rendering work correctly. If you run play functions in Jest (JSDOM), canvas will not render — always use `test:storybook` for these tests.

**SCSS import errors:** If you see `Module parse failed: ... .scss` errors, confirm `style-loader` is in devDependencies and the SCSS rule in `.storybook/main.js` is using `style-loader` (not `MiniCssExtractPlugin.loader`).

**Storybook HMR and duplicate map instances:** Because InteractiveMap mounts into a real DOM node, Storybook's HMR can occasionally leave a stale instance if the cleanup `useEffect` return doesn't run. If you see this, do a full page refresh in Storybook.

**ButtonFirst button not found:** The `<a role="button">` is inserted `beforebegin` the story's root div, meaning it becomes a sibling inside Storybook's canvas root. `within(canvasElement).findByRole('button')` will find it because Storybook's canvas element is the common parent.
