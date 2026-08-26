#!/bin/bash

set -e

VERSION_PATTERN="^v([0-9]{1,}.[0-9]{1,}.[0-9]{1,})(-[0-9A-Za-z-].*)?$"
PRE_RELEASE_PATTERN="(-[0-9A-Za-z-].*)$"

# Prerelease labels (case-insensitive) that share the "pre-release" npm dist-tag.
# Any other label (e.g. an experimental feature slug) gets isolated to its own
# dist-tag instead — see determine_release_tag(). Add to this list if another
# shared-channel convention (e.g. "rc") is adopted.
SHARED_PRERELEASE_LABELS=("alpha" "beta")

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

publish_package() {
  local release_tag=$1
  local new_version="${TAG_NAME#v}"
  
  echo "Publishing ${PACKAGE_NAME}@${new_version} to npm with tag: ${release_tag}"
  
  if [ "$DRY_RUN" = "true" ]; then
    echo "[DRY RUN] Would run: npm version --no-git-tag-version ${TAG_NAME}"
    echo "[DRY RUN] Would run: npm publish --access public --tag=${release_tag}"
  else
    npm version --no-git-tag-version "${TAG_NAME}"
    npm publish --access public --tag="${release_tag}"
  fi
  
  echo "✓ Successfully published ${PACKAGE_NAME}@${new_version}"
}

main() {
  PACKAGE_NAME=$(npm pkg get name | tr -d '"')
  TAG_NAME="${1:-}"
  IS_PRE_RELEASE="${2:-false}"
  DRY_RUN="${3:-false}"
  
  validate_arguments
  validate_version_format
  validate_version_bump
  
  RELEASE_TAG=$(determine_release_tag)
  publish_package "$RELEASE_TAG"
}

main "$@"
