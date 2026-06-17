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
  stamp_versions

  RELEASE_TAG=$(determine_release_tag)
  publish_all "$RELEASE_TAG"
}

main "$@"
