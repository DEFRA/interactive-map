# Releasing

A release publishes three packages from `packages/`, all at the same version:

| Package | Folder | Map engine |
|---|---|---|
| `@defra/interactive-map` | `packages/maplibre` | MapLibre |
| `@defra/interactive-map-openlayers` | `packages/openlayers` | OpenLayers |
| `@defra/interactive-map-esri` | `packages/esri` | Esri (ArcGIS) |

The repo root is private and isn't published. Packages are published by the **Publish to NPM** workflow (`publish.yml`) using npm trusted publishing, so no npm token is stored in the repo.

## Releasing a version

1. Check `main` is green and has everything you want to release.
2. On GitHub, go to **Releases → Draft a new release**.
3. Choose a new tag, targeting `main`:
   - `vX.Y.Z` for a standard release, for example `v1.2.0`
   - `vX.Y.Z-alpha.N` or `vX.Y.Z-beta.N` for a pre-release, for example `v1.2.0-alpha.1`
   - `vX.Y.Z-<name>.N` for an experimental release, for example `v1.2.0-fmp.1`
4. Tick **Set as a pre-release** for anything other than a standard release.
5. Add release notes, then **Publish release**.

Publishing the release starts `publish.yml`, which:

1. Runs CI, including the engine package checks
2. Builds the packages with `npm run build:engines`
3. Runs the pre-flight checks below, before anything is changed or published
4. Sets each package's version from the tag, and publishes all three

Merging to `main` doesn't publish anything.

### Dist-tags

| Release | npm dist-tag |
|---|---|
| Standard (`v1.2.0`) | `latest` |
| Pre-release (`-alpha.N` or `-beta.N`, or **Set as a pre-release** ticked) | `pre-release` |
| Experimental (`-fmp.1` or any other label) | the label, for example `fmp` |

An experimental release gets its own dist-tag so it never replaces `latest` or `pre-release`.

### Pre-flight checks

Before publishing, `scripts/publish-package.sh` checks all three packages and lists every problem. If any check fails, nothing is published.

| Message | Meaning | Fix |
|---|---|---|
| `not found on npm` | The package has never been published | [Add the package](#adding-a-package), then publish a new release |
| `couldn't query npm` | npm couldn't be reached, so the check couldn't tell | Publish the release again. If it keeps failing, check [npm's status](https://status.npmjs.org) |
| `isn't greater than …` | The version isn't newer than the package's highest published version in that major line | Use a higher version |
| `no build output` | The packages weren't built | Check the build step in the workflow run |
| `npm publish --dry-run failed` | The package can't be packed, for example because its `package.json` is invalid | Run `npm publish --dry-run` in the package's folder to see why |

A package whose only published version is its seed placeholder shows a reminder to check its trusted publishing is set up. The checks can't confirm that, as it only shows when publishing.

To see what a release would do without publishing, after `npm run build:engines`:

```sh
./scripts/publish-package.sh v1.2.0 false true
```

### Checking a release

Check the workflow run passed, then:

```sh
npm view @defra/interactive-map dist-tags
npm view @defra/interactive-map-openlayers dist-tags
npm view @defra/interactive-map-esri dist-tags
```

## Adding a package

npm only allows trusted publishing on a package that already exists, so `publish.yml` can't publish a new package for the first time. A new package is created on npm first with a placeholder (seeding), then given trusted publishing. This is needed once for each new package, including `@defra/interactive-map-openlayers` and `@defra/interactive-map-esri` before their first release.

The **Seed new packages to NPM** workflow only appears in the Actions tab once it's on `main`, and it seeds the packages in `packages/` on the branch it runs from.

### 1. Seed the package

Seeding publishes the package's `package.json` without any build output, under the `seed` dist-tag, so it never becomes `latest`. Packages that already exist are skipped.

1. On npmjs.com, create a granular access token that can read and write packages in the `@defra` scope and create new packages, with the shortest expiry possible.
2. On GitHub, add it as a repository secret called `NPM_TOKEN` (**Settings → Secrets and variables → Actions**).
3. Run the **Seed new packages to NPM** workflow from `main` with **Dry run** ticked, and check the packages it lists.
4. Run it again with **Dry run** unticked.
5. Check each new package only has the `seed` dist-tag:

   ```sh
   npm view @defra/interactive-map-openlayers dist-tags
   ```

6. Delete the `NPM_TOKEN` secret, and revoke the token on npmjs.com.

### 2. Set up trusted publishing

For each seeded package:

1. Go to the package on npmjs.com, then **Settings**.
2. Under **Trusted Publisher**, choose **GitHub Actions**, and enter:
   - Organization or user: `DEFRA`
   - Repository: `interactive-map`
   - Workflow filename: `publish.yml`
   - Environment: leave blank
3. Save. npm doesn't check these details, so a mistake only shows as an error when publishing.

To check it's set up, make the next release a pre-release.

## Troubleshooting

**A release stopped part way through.** If publishing fails after some packages were published, publishing the same release again fails the pre-flight checks, because those packages already have that version. Publish a new patch version instead, so all three packages are published again at the same version.

**A package failed to publish with an authentication error.** Its trusted publishing isn't set up, or its details are wrong. Check them in the package's settings on npmjs.com.
