#!/bin/bash

# One-time bootstrap for NEW workspace packages (providers/* and plugins/*).
#
# npm OIDC trusted publishing can only be configured on a package that already
# exists on the registry — there is no "pending publisher" concept. So a brand
# new package cannot be published by the OIDC-only publish.yml on its first run.
#
# This script publishes a BARE placeholder (just package.json, no dist) for any
# package that does not yet exist on npm, under a dedicated `seed` dist-tag so it
# never occupies `latest`/`beta`/`alpha`. Once the name exists you can configure
# a trusted publisher for it (see RELEASING.md), after which the normal
# release pipeline (publish.yml) takes over via OIDC — no token required again.
#
# Auth: relies on npm being authenticated already (NODE_AUTH_TOKEN / .npmrc).
# Usage: ./scripts/seed-packages.sh [dry_run]

set -e

SEED_TAG="seed"
DRY_RUN="${1:-false}"

seed_all() {
  local seeded=0
  local skipped=0

  for pkg_dir in providers/* plugins/*; do
    [ -f "$pkg_dir/package.json" ] || continue

    local name version
    name=$(jq -r '.name' "$pkg_dir/package.json")
    version=$(jq -r '.version' "$pkg_dir/package.json")

    # Skip anything already on the registry — seeding only registers new names.
    # Use `versions` (the tag-independent packument) rather than `version`, which
    # resolves the `latest` dist-tag: a package that's been seeded but not yet
    # released has no `latest`, and we must still treat it as existing.
    if npm view "$name" versions >/dev/null 2>&1; then
      echo "✓ ${name} already exists on npm — skipping"
      skipped=$((skipped + 1))
      continue
    fi

    # npm view failed: only an explicit E404 means "does not exist". Anything
    # else (network error, registry outage, rate limit) means we cannot tell —
    # abort rather than risk bare-publishing over a package that does exist.
    local view_err
    view_err=$(npm view "$name" versions 2>&1 >/dev/null || true)
    if ! echo "$view_err" | grep -q "E404"; then
      echo "ERROR: could not query npm for ${name} (network/registry error?) — aborting, nothing further seeded."
      echo "$view_err" | head -3
      exit 1
    fi

    echo "Seeding ${name}@${version} to npm with tag: ${SEED_TAG}"
    if [ "$DRY_RUN" = "true" ]; then
      echo "[DRY RUN] Would run: npm publish ./${pkg_dir} --access public --tag=${SEED_TAG}"
    else
      npm publish "./${pkg_dir}" --access public --tag="${SEED_TAG}"
    fi
    echo "✓ Seeded ${name}"
    seeded=$((seeded + 1))
  done

  echo ""
  echo "Done. Seeded: ${seeded}, already existed: ${skipped}."
  if [ "$seeded" -gt 0 ]; then
    echo "Next: configure OIDC trusted publishing for each newly seeded package (see RELEASING.md)."
  fi
}

seed_all
