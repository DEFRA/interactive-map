#!/usr/bin/env bash
# Install the @defra/interactive-map packages exactly as a consumer would:
# build the monorepo, pack each package this app uses into a tarball, and
# npm-install the tarballs (so npm resolves peer dependencies for real).
# Each package ships a govuk-prototype-kit.config.json, so the prototype kit
# serves its dist under /plugin-assets/<encoded package name>/dist/... and
# pages load the UMD bundles from there with standard <script src> tags.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/../.." && pwd)"
TARBALL_DIR="$APP_DIR/.tarballs"

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

echo "==> Done. Start the app with: npm run dev"
