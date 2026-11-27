#!/bin/bash

# Creates any package in packages/ that doesn't exist on npm yet, so its trusted publishing
# can be set up. npm only allows a trusted publisher on a package that already exists, so
# publish.yml can't publish a new package for the first time.
#
# Publishes a placeholder (package.json only, no build output) under the `seed` dist-tag,
# so it never becomes `latest`. Packages that already exist are skipped, so it's safe to
# run again. See RELEASING.md.
#
# Needs npm to be logged in (NODE_AUTH_TOKEN or .npmrc).
# Usage: ./scripts/seed-packages.sh [dry_run]

set -e

SEED_TAG="seed"
DRY_RUN="${1:-false}"

seeded=0
skipped=0

for pkg_dir in packages/*; do
  name=$(jq -r '.name' "$pkg_dir/package.json")
  version=$(jq -r '.version' "$pkg_dir/package.json")

  # `versions` doesn't depend on a dist-tag, so a package that's only been seeded (with no
  # `latest`) still counts as existing
  if npm view "$name" versions >/dev/null 2>&1; then
    echo "✓ ${name} already exists on npm, skipping"
    skipped=$((skipped + 1))
    continue
  fi

  # Only npm's explicit E404 means the package doesn't exist. Stop on anything else, rather
  # than risk publishing over a package that does.
  if ! npm view "$name" versions 2>&1 >/dev/null | grep -q "E404"; then
    echo "ERROR: couldn't query npm for ${name}. Stopping, nothing more was seeded."
    exit 1
  fi

  echo "Seeding ${name}@${version} with tag: ${SEED_TAG}"
  if [ "$DRY_RUN" = "true" ]; then
    echo "[DRY RUN] Would run: npm publish ./${pkg_dir} --access public --tag=${SEED_TAG}"
  else
    npm publish "./${pkg_dir}" --access public --tag="${SEED_TAG}"
  fi
  seeded=$((seeded + 1))
done

echo ""
echo "Seeded: ${seeded}, already on npm: ${skipped}"
if [ "$seeded" -gt 0 ]; then
  echo "Next: set up trusted publishing for each seeded package (RELEASING.md)"
fi
