#!/bin/bash

# Publishes every package in packages/ at the release tag's version, in lockstep:
# @defra/interactive-map (MapLibre), and the alternatives @defra/interactive-map-openlayers
# and @defra/interactive-map-esri. See RELEASING.md.
#
# Usage: ./scripts/publish-package.sh <tag_name> <is_pre_release> [dry_run]

set -e

VERSION_PATTERN="^v([0-9]{1,}\.[0-9]{1,}\.[0-9]{1,})(-[0-9A-Za-z-].*)?$"
PRE_RELEASE_PATTERN="(-[0-9A-Za-z-].*)$"

# Prerelease labels (case-insensitive) that share the "pre-release" npm dist-tag.
# Any other label (e.g. an experimental feature slug) gets isolated to its own
# dist-tag instead — see determine_release_tag(). Add to this list if another
# shared-channel convention (e.g. "rc") is adopted.
SHARED_PRERELEASE_LABELS=("alpha" "beta")

PACKAGE_DIRS=(packages/*)

validate_arguments() {
  if [ -z "$TAG_NAME" ]; then
    echo "ERROR: TAG_NAME is required"
    echo "Usage: $0 <tag_name> <is_pre_release> [dry_run]"
    exit 1
  fi
}

validate_version_format() {
  if ! [[ "$TAG_NAME" =~ $VERSION_PATTERN ]]; then
    echo "ERROR: FAILED TO MATCH VERSION_PATTERN"
    echo "Tag name must be in format: v1.2.3 or v1.2.3-beta.1"
    exit 1
  fi
}

# The highest version of a package already published in a major line, or 0.0.0
get_published_version() {
  local name=$1
  local major_version=$2
  # Filters the full version list by major rather than asking npm for a range, as a range
  # leaves out prereleases, which are all that's been published of some lines. npm returns
  # a bare JSON string rather than an array when there's one version, and an {"error":…}
  # object on failure, so keep only strings, one per line.
  local matched
  matched=$(npm view "$name" versions --json 2>/dev/null \
    | jq -r --arg major "$major_version" 'if type=="array" then .[] else . end | strings | select(startswith($major + "."))' 2>/dev/null || true)

  # npm lists versions in publish order, not semver order, so sort and take the highest
  local highest=""
  if [ -n "$matched" ]; then
    # shellcheck disable=SC2086 — versions are single tokens; splitting is intended
    highest=$(npx --yes semver --include-prerelease $matched 2>/dev/null | tail -n 1 || true)
  fi

  if [ -z "$highest" ] || [ "$highest" = "null" ]; then
    echo "0.0.0"
  else
    echo "$highest"
  fi
}

is_shared_prerelease_label() {
  local candidate_lower
  candidate_lower=$(echo "$1" | tr '[:upper:]' '[:lower:]')

  local shared_label
  for shared_label in "${SHARED_PRERELEASE_LABELS[@]}"; do
    if [[ "$candidate_lower" == "$shared_label" ]]; then
      return 0
    fi
  done
  return 1
}

determine_release_tag() {
  # Extract the first prerelease identifier: semver splits identifiers on '.',
  # so this stops at the first dot if there is one ("-fmp.2" -> "fmp"), or runs
  # to the end of the string if there isn't ("-fmp-2" -> "fmp-2", since hyphens
  # are legal inside a single identifier). Anything not in
  # SHARED_PRERELEASE_LABELS (matched case-insensitively) gets isolated to its
  # own npm dist-tag either way — this is what prevents a mistyped experimental
  # tag from silently landing in the shared "pre-release" channel, regardless
  # of whether a dot or hyphen was used before the build number, or how the
  # label happens to be capitalised.
  if [[ "$TAG_NAME" =~ -([^.]+) ]]; then
    local label="${BASH_REMATCH[1]}"
    if ! is_shared_prerelease_label "$label"; then
      echo "$label"
      return
    fi
  fi

  if [[ "$IS_PRE_RELEASE" == "true" ]] || [[ "$TAG_NAME" =~ $PRE_RELEASE_PATTERN ]]; then
    echo "pre-release"
  else
    echo "latest"
  fi
}

# Checks every package can be published at the release version before anything is
# changed or published, and reports every problem, so a release never stops part way:
#   1. The package exists on npm (a new package must be seeded first, see RELEASING.md)
#   2. The version is greater than the package's highest published version in its major line
#   3. The package was built and `npm publish --dry-run` passes
# It can't check that a package's trusted publishing is set up, as that only shows when
# publishing. A package still on its seed version gets a reminder instead.
preflight_checks() {
  local version="${TAG_NAME#v}"
  local major_version
  major_version=$(echo "$version" | cut -d. -f1)
  local failures=0

  echo "── Pre-flight: checking every package can publish ${version} (nothing is published yet) ──"

  for pkg_dir in "${PACKAGE_DIRS[@]}"; do
    local name versions_json
    name=$(jq -r '.name' "$pkg_dir/package.json")

    # Only npm's explicit E404 means the package doesn't exist. Any other failure means
    # npm couldn't be reached, so we can't tell.
    if ! versions_json=$(npm view "$name" versions --json 2>/dev/null); then
      if npm view "$name" versions --json 2>&1 >/dev/null | grep -q "E404"; then
        echo "  ✗ ${name}: not found on npm. Seed it and set up trusted publishing (RELEASING.md, 'Adding a package')."
      else
        echo "  ✗ ${name}: couldn't query npm. Run the release again, and check https://status.npmjs.org if it keeps failing."
      fi
      failures=$((failures + 1))
      continue
    fi

    local published_version
    published_version=$(get_published_version "$name" "$major_version")
    # Requires proof the new version is greater, so a failure of the semver check itself
    # also stops the release. --include-prerelease lets 1.2.3-alpha.1 satisfy ">1.2.2".
    if ! npx --yes semver --include-prerelease "$version" -r ">$published_version" >/dev/null 2>&1; then
      echo "  ✗ ${name}: ${version} isn't greater than ${published_version}, its highest published v${major_version}.x version."
      failures=$((failures + 1))
      continue
    fi

    if [ ! -f "$pkg_dir/dist/esm/index.js" ]; then
      echo "  ✗ ${name}: no build output in ${pkg_dir}/dist. Run 'npm run build:engines' first."
      failures=$((failures + 1))
      continue
    fi

    # --tag is needed to dry-run a prerelease version. The ./ stops npm reading
    # packages/<name> as a GitHub owner/repo shorthand.
    if ! npm publish "./${pkg_dir}" --dry-run --tag "$RELEASE_TAG" >/dev/null 2>&1; then
      echo "  ✗ ${name}: 'npm publish --dry-run' failed. Run it in ${pkg_dir} to see why."
      failures=$((failures + 1))
      continue
    fi

    if echo "$versions_json" | jq -e 'if type=="array" then all(.[]; startswith("0.0.0")) else startswith("0.0.0") end' >/dev/null; then
      echo "  ✓ ${name} (first real release: check its trusted publishing is set up, RELEASING.md)"
    else
      echo "  ✓ ${name}"
    fi
  done

  if [ "$failures" -gt 0 ]; then
    echo ""
    echo "Pre-flight failed for ${failures} of ${#PACKAGE_DIRS[@]} packages. Nothing was published."
    echo "Fix the problems above, then publish a new GitHub Release. See RELEASING.md."
    exit 1
  fi

  echo "✓ Pre-flight passed: all ${#PACKAGE_DIRS[@]} packages can publish ${version}"
}

stamp_versions() {
  local version="${TAG_NAME#v}"
  for pkg_dir in "${PACKAGE_DIRS[@]}"; do
    (cd "$pkg_dir" && npm pkg set version="$version")
  done
}

publish_all() {
  local version="${TAG_NAME#v}"

  for pkg_dir in "${PACKAGE_DIRS[@]}"; do
    local name
    name=$(jq -r '.name' "$pkg_dir/package.json")
    echo "Publishing ${name}@${version} to npm with tag: ${RELEASE_TAG}"

    if [ "$DRY_RUN" = "true" ]; then
      echo "[DRY RUN] Would run: npm publish ./${pkg_dir} --access public --tag=${RELEASE_TAG}"
      continue
    fi

    local stamped
    stamped=$(jq -r '.version' "$pkg_dir/package.json")
    if [ "$stamped" != "$version" ]; then
      echo "ERROR: ${pkg_dir}/package.json has version ${stamped}, expected ${version}"
      exit 1
    fi
    npm publish "./${pkg_dir}" --access public --tag="${RELEASE_TAG}"
    echo "✓ Published ${name}@${version}"
  done
}

main() {
  TAG_NAME="${1:-}"
  IS_PRE_RELEASE="${2:-false}"
  DRY_RUN="${3:-false}"

  validate_arguments
  validate_version_format
  RELEASE_TAG=$(determine_release_tag)
  preflight_checks

  # A dry run doesn't change any files
  if [ "$DRY_RUN" = "true" ]; then
    echo "[DRY RUN] Not setting the version in each package.json"
  else
    stamp_versions
  fi

  publish_all
}

main "$@"
