# Storybook Setup Design

**Date:** 2026-03-05

## Goal

Add Storybook to the project to support local interaction and visual testing of `InteractiveMap` permutations. Currently the project has unit tests only — this fills the gap with integration-level stories covering different behaviours and plugin combinations.

## Approach

Storybook with `@storybook/react-webpack5`. Consistent with the existing Webpack toolchain, and avoids MapLibre WebWorker incompatibilities that can arise with Vite.

## Directory structure

```
.storybook/
  main.js       ← framework, addons, webpack customisation
  preview.js    ← global CSS imports, viewport presets

stories/
  components/
    InteractiveMapStory.jsx   ← reusable React wrapper (useEffect/useRef/destroy pattern)
  InteractiveMap.stories.js   ← core behaviour permutations
  Plugins.stories.js          ← per-plugin and kitchen sink stories
```

`.storybook/` is Storybook-convention for config. `stories/` sits at root alongside `demo/`.

## Shared wrapper

`InteractiveMapStory.jsx` accepts `mapConfig` and `plugins` as props. On mount it calls `new InteractiveMap(elementId, { ...mapConfig, plugins })`. On unmount it calls `destroy()`. All stories use this component to avoid repeating lifecycle boilerplate.

Tile source: free OS Open Zoomstack (`labs.os.uk`) + Nominatim for search — same as the existing demo files, no API key needed.

## Stories

| Story | `behaviour` | Plugins |
|---|---|---|
| `Inline` | `inline` | none |
| `ButtonFirst` | `buttonFirst` | none |
| `WithSearch` | `inline` | search |
| `WithInteract` | `inline` | interact |
| `WithScaleBar` | `inline` | scale-bar |
| `WithMapStyles` | `inline` | map-styles |
| `WithUseLocation` | `inline` | use-location |
| `WithDatasets` | `inline` | datasets |
| `WithDrawML` | `inline` | draw-ml |
| `WithFrame` | `inline` | frame |
| `KitchenSink` | `inline` | all plugins |
| `ButtonFirstKitchenSink` | `buttonFirst` | all plugins |

## Addons

- `@storybook/addon-essentials` — controls, actions, docs, viewport, backgrounds
- `@storybook/addon-interactions` — play functions with pass/fail steps in the UI
- `@storybook/addon-a11y` — per-story accessibility audit panel

## Interaction tests

Play functions on key stories using `@testing-library/user-event` and `@storybook/test`:

- `Inline` — map canvas renders
- `ButtonFirst` — clicking the button opens the map
- `WithSearch` — search input is focusable and accepts text
- `KitchenSink` — all major UI elements are present

## Test runner

`@storybook/test-runner` (Playwright-backed). Runs all play functions headlessly via `npm run test:storybook` against a running Storybook instance.

## New npm scripts

```json
"storybook": "storybook dev -p 6006",
"build:storybook": "storybook build",
"test:storybook": "test-storybook"
```

## New devDependencies

```
storybook
@storybook/react-webpack5
@storybook/addon-essentials
@storybook/addon-interactions
@storybook/addon-a11y
@storybook/test-runner
```

`@testing-library/react`, `@testing-library/dom`, and `@testing-library/jest-dom` are already present.

## Webpack customisation

In `.storybook/main.js`, extend Storybook's webpack config to:

1. Add `sass-loader` rule for `.scss` files (already installed)
2. Add `resolve.alias` to deduplicate `maplibre-gl` and `react`/`react-dom` — same pattern as `webpack.dev.mjs`
