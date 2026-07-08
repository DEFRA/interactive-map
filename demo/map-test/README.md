# Defra Interactive Map Test

A GOV.UK Prototype Kit site with a collection of examples using the DEFRA InteractiveMap component, imported from [defra-design/map-test](https://github.com/defra-design/map-test).

The purpose of this site is **accessibility testing only**. It provides a consistent set of scenarios to verify accessibility behaviour, identify issues, and validate fixes across different browsers, assistive technologies, and devices.

It also exercises the UMD builds end-to-end: every page loads the core, provider and plugin bundles as plain `<script>` tags via the prototype kit's `/plugin-assets/` route, so it doubles as a smoke test that the UMD output of this repo still works for script-tag consumers.

## Running locally

The `@defra/interactive-map` dependency points at this repository (`file:../..`), so the prototype kit serves whatever is in the local `dist` directories.

From the repository root:

```bash
npm install        # repo dependencies
npm run build      # produces dist/umd for core and every provider/plugin
```

Then in this directory:

```bash
npm install
cp ../../.env .env # OS vector tile style URLs (OS_API_KEY needed for tiles to render)
npm run dev
```

## Public Test Site

The public test site (built from the original repository) is available here:

[Defra Interactive Map Test Site](https://map-test-63a349157ea3.herokuapp.com/)
