#!/bin/bash

set -e

VERSION_PATTERN="^v([0-9]{1,}.[0-9]{1,}.[0-9]{1,})(-[0-9A-Za-z-].*)?$"
PRE_RELEASE_PATTERN="(-[0-9A-Za-z-].*)$"

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

get_published_version() {
  local major_version=$1
  local published=$(npm view "${PACKAGE_NAME}@^${major_version}.0.0" version --json 2>/dev/null | jq -r '.[-1]' 2>/dev/null || echo "")

  if [ -z "$published" ] || [ "$published" = "null" ]; then
    echo "0.0.0"
  else
    echo "$published"
  fi
}

validate_version_bump() {
  local new_version="${TAG_NAME#v}"
  local major_version=$(echo "$new_version" | cut -d. -f1)

  echo "Package: ${PACKAGE_NAME}"
  echo "Checking version constraints for v${major_version}.x line..."

  local published_version=$(get_published_version "$major_version")

  echo "Latest v${major_version}.x published: $published_version"
  echo "New version to publish: $new_version"

  if npx --yes semver "$new_version" -r "<=$published_version" >/dev/null 2>&1; then
    echo "ERROR: Version $new_version is not greater than published version $published_version in the v${major_version}.x line"
    exit 1
  fi

  echo "✓ Version check passed"
}

stamp_versions() {
  local version="${TAG_NAME#v}"
  npm pkg set version="$version"
  for pkg_dir in providers/* plugins/*; do
    [ -f "$pkg_dir/package.json" ] || continue
    npm pkg set version="$version" --prefix "$pkg_dir"
    npm pkg set "peerDependencies.@defra/interactive-map"="$version" --prefix "$pkg_dir"
  done
}

assert_version() {
  local pkg_dir=$1
  local expected=$2
  local actual
  actual=$(jq -r '.version' "${pkg_dir}/package.json")
  if [ "$actual" != "$expected" ]; then
    echo "ERROR: version mismatch in $pkg_dir — expected $expected, got $actual"
    exit 1
  fi
}

determine_release_tag() {
  if [[ "$IS_PRE_RELEASE" == "true" ]] || [[ "$TAG_NAME" =~ $PRE_RELEASE_PATTERN ]]; then
    echo "alpha"
  else
    echo "latest"
  fi
}

determine_pkg_tag() {
  local pkg_dir=$1
  if [[ "$IS_PRE_RELEASE" == "true" ]] || [[ "$TAG_NAME" =~ $PRE_RELEASE_PATTERN ]]; then
    echo "alpha"
    return
  fi
  jq -r '.publishConfig.tag // "latest"' "$pkg_dir/package.json"
}

# Pre-flight gate — runs after version validation (and after the build, which
# happens in the workflow before this script), but BEFORE any package.json is
# stamped and BEFORE anything is published. It asserts every package (core + all
# workspaces) can be published at the target version, so a problem aborts the
# whole release while nothing has been mutated or published yet — instead of
# dying mid-loop and leaving a partial, inconsistent release.
#
# It checks all packages and reports every failure (does not stop at the first),
# so the operator can fix everything in one pass.
#
# What it catches:
#   1. Package not registered on npm   → a new package that was never bootstrapped
#                                         (seed + trusted publishing). See RELEASING.md.
#   2. Target version already published → collision / re-run of a partial release.
#   3. Package not publishable          → missing build output or invalid package.json
#                                         (via `npm publish --dry-run`, no registry/auth).
#
# What it CANNOT catch: whether OIDC trusted publishing is correctly configured
# for a package that *does* exist — there is no way to exercise the OIDC token
# exchange without actually publishing. Check 1 catches the common case (a brand
# new package that was never seeded). For a package's first real release we still
# print a reminder to confirm trusted publishing is set up.
preflight_checks() {
  local version="${TAG_NAME#v}"
  local release_tag
  release_tag=$(determine_release_tag)
  local failures=0
  local count=0

  echo "── Pre-flight: verifying every package can publish ${version} (nothing is published yet) ──"

  local pkg_dirs=(".")
  for d in providers/* plugins/*; do
    [ -f "$d/package.json" ] && pkg_dirs+=("$d")
  done

  for pkg_dir in "${pkg_dirs[@]}"; do
    count=$((count + 1))
    local name versions_json
    name=$(jq -r '.name' "$pkg_dir/package.json")

    # 1. Registered on npm? (tag-independent — a seeded package has no `latest` yet)
    if ! versions_json=$(npm view "$name" versions --json 2>/dev/null); then
      echo "  ✗ ${name}: not found on npm — needs one-time bootstrap (seed + trusted publishing)."
      echo "      Fix: follow RELEASING.md → 'One-time bootstrap', then re-run the release."
      failures=$((failures + 1))
      continue
    fi

    # 2. Target version not already published?
    if echo "$versions_json" | jq -e --arg v "$version" \
        'if type=="array" then index($v) else . == $v end' >/dev/null; then
      echo "  ✗ ${name}: version ${version} is already published — bump the release version."
      echo "      Fix: see RELEASING.md → 'Troubleshooting' (a partial release usually needs a new patch version)."
      failures=$((failures + 1))
      continue
    fi

    # 3. Packable? (no registry/auth — validates build output + package.json).
    #    --tag is required or npm refuses to (dry-)publish a prerelease version.
    if ! npm publish "$pkg_dir" --dry-run --tag "$release_tag" >/dev/null 2>&1; then
      echo "  ✗ ${name}: 'npm publish --dry-run' failed — missing build output or invalid package.json."
      echo "      Fix: see RELEASING.md → 'Troubleshooting'."
      failures=$((failures + 1))
      continue
    fi

    # Reminder: a package whose only published versions are 0.0.0 seed placeholders
    # is having its first real release — the moment a missing OIDC config would bite.
    if echo "$versions_json" | jq -e \
        'if type=="array" then all(.[]; startswith("0.0.0")) else startswith("0.0.0") end' >/dev/null; then
      echo "  ✓ ${name}  (ℹ first real release — confirm trusted publishing is configured, RELEASING.md Step 2)"
    else
      echo "  ✓ ${name}"
    fi
  done

  if [ "$failures" -gt 0 ]; then
    echo ""
    echo "Pre-flight FAILED: ${failures} of ${count} package(s) cannot be published. Nothing was published."
    echo "Resolve the issues above, then create a new GitHub Release to re-run."
    echo "See RELEASING.md for the full release and bootstrap procedure: https://github.com/DEFRA/interactive-map/blob/main/RELEASING.md"
    exit 1
  fi

  echo "✓ Pre-flight passed — all ${count} packages can publish ${version}."
}

publish_all() {
  local release_tag=$1
  local version="${TAG_NAME#v}"

  echo "Publishing ${PACKAGE_NAME}@${version} to npm with tag: ${release_tag}"

  if [ "$DRY_RUN" = "true" ]; then
    echo "[DRY RUN] Would run: npm publish --access public --tag=${release_tag}"
  else
    assert_version "." "$version"
    npm publish --access public --tag="${release_tag}"
  fi

  echo "✓ Published ${PACKAGE_NAME}@${version}"

  for pkg_dir in providers/* plugins/*; do
    [ -f "$pkg_dir/package.json" ] || continue
    local pkg_name
    pkg_name=$(jq -r '.name' "$pkg_dir/package.json")
    local pkg_tag
    pkg_tag=$(determine_pkg_tag "$pkg_dir")

    echo "Publishing ${pkg_name}@${version} to npm with tag: ${pkg_tag}"

    if [ "$DRY_RUN" = "true" ]; then
      echo "[DRY RUN] Would run: npm publish ./${pkg_dir} --access public --tag=${pkg_tag}"
    else
      assert_version "$pkg_dir" "$version"
      npm publish "./${pkg_dir}" --access public --tag="${pkg_tag}"
    fi

    echo "✓ Published ${pkg_name}@${version}"
  done
}

main() {
  PACKAGE_NAME=$(jq -r '.name' package.json)
  TAG_NAME="${1:-}"
  IS_PRE_RELEASE="${2:-false}"
  DRY_RUN="${3:-false}"

  validate_arguments
  validate_version_format
  validate_version_bump
  preflight_checks
  stamp_versions

  RELEASE_TAG=$(determine_release_tag)
  publish_all "$RELEASE_TAG"
}

main "$@"
