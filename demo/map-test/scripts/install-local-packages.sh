#!/usr/bin/env bash
# Install the @defra/interactive-map packages exactly as a consumer would:
# build the monorepo, pack each package this app uses into a tarball,
# npm-install the tarballs (so npm resolves peer dependencies for real),
# then copy each installed package's dist into app/assets/vendor so pages
# can load the UMD bundles with standard <script src> tags.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/../.." && pwd)"
TARBALL_DIR="$APP_DIR/.tarballs"
VENDOR_DIR="$APP_DIR/app/assets/vendor"

WORKSPACES=(
  "."
  "providers/maplibre"
  "providers/open-names"
  "plugins/interact"
  "plugins/search"
  "plugins/datasets"
  "plugins/map-styles"
  "plugins/draw-ml"
)

echo "==> Building UMD/ESM bundles"
(cd "$REPO_ROOT" && npm run build)

echo "==> Packing tarballs"
rm -rf "$TARBALL_DIR"
mkdir -p "$TARBALL_DIR"
for ws in "${WORKSPACES[@]}"; do
  if [ "$ws" = "." ]; then
    (cd "$REPO_ROOT" && npm pack --pack-destination "$TARBALL_DIR")
  else
    (cd "$REPO_ROOT" && npm pack --workspace "$ws" --pack-destination "$TARBALL_DIR")
  fi
done

echo "==> Installing packed tarballs"
(cd "$APP_DIR" && npm install "$TARBALL_DIR"/*.tgz)

echo "==> Vendoring dist files into app/assets/vendor"
rm -rf "$VENDOR_DIR"
mkdir -p "$VENDOR_DIR"
for pkg_dir in "$APP_DIR"/node_modules/@defra/interactive-map*; do
  name="$(basename "$pkg_dir")"    # interactive-map, interactive-map-provider-maplibre, ...
  short="${name#interactive-map-}" # provider-maplibre, plugin-search, ... (core keeps full name)
  cp -R "$pkg_dir/dist/." "$VENDOR_DIR/$short/"
  echo "    $name -> app/assets/vendor/$short"
done

echo "==> Done. Start the app with: npm run dev"
