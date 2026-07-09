# Defra Interactive Map Test

A GOV.UK Prototype Kit site with a collection of examples using the DEFRA InteractiveMap component, imported from [defra-design/map-test](https://github.com/defra-design/map-test).

The purpose of this site is **accessibility testing only**. It provides a consistent set of scenarios to verify accessibility behaviour, identify issues, and validate fixes across different browsers, assistive technologies, and devices.

It also validates the UMD builds through the exact consumer path: each provider and plugin is installed as its own packed npm package (`@defra/interactive-map-provider-maplibre`, `@defra/interactive-map-plugin-search`, …) so npm resolves peer dependencies for real, and every page loads the bundles with standard `<script src>` tags — no bundler, no prototype-kit plugin magic.

## Running locally

```bash
./scripts/install-local-packages.sh   # build monorepo, pack each package, npm install
                                      # the tarballs, vendor dist -> app/assets/vendor
cp ../../.env .env                    # OS vector tile style URLs (OS_API_KEY needed
                                      # for tiles to render)
npm run dev
```

The script is the local stand-in for `npm install @defra/interactive-map @defra/interactive-map-provider-maplibre …` from the registry: the packages aren't published yet on this branch, so it packs them from the monorepo instead. Everything downstream of `npm pack` — tarball contents, peer dependency resolution, file layout — is what a real consumer gets.

The vendor copy step (`node_modules/@defra/*/dist` → `app/assets/vendor/`) is the standard pattern for script-tag consumers: browsers can't fetch from `node_modules`, so packages' static files are copied into the app's own assets (or served from a CDN such as unpkg once published). Re-run the script after changing library source.

## Public Test Site

The public test site (built from the original repository) is available here:

[Defra Interactive Map Test Site](https://map-test-63a349157ea3.herokuapp.com/)
