# Releasing

This repo is an npm workspaces monorepo. A single release publishes the core
package and every provider/plugin **in lockstep at the same version**:

| Package | npm name |
| --- | --- |
| Core | `@defra/interactive-map` |
| Providers | `@defra/interactive-map-provider-*` |
| Plugins | `@defra/interactive-map-plugin-*` |

Publishing is driven by [`scripts/publish-package.sh`](scripts/publish-package.sh)
and runs entirely on **npm OIDC trusted publishing** — there is no long-lived
npm token in CI.

There are two distinct flows:

- **[One-time bootstrap](#one-time-bootstrap-new-packages-only)** — required once
  per brand-new package before it can ever be released.
- **[Cutting a release](#cutting-a-release)** — the normal, repeatable flow.

---

## One-time bootstrap (new packages only)

> Skip this entirely if every package already exists on npm. You only do this
> when you add a *new* provider or plugin.

### Steps at a glance

For a brand-new package, all four steps are required and **in this order** —
don't stop after seeding:

1. **Merge** the PR (new packages + workflows) to `main`.
2. **[Step 1 — Seed](#step-1--seed-the-new-package-names)** the package names
   onto npm, using a temporary token.
3. **[Step 2 — Configure OIDC trusted publishing](#step-2--configure-oidc-trusted-publishing-on-npmjs)**
   on npmjs.com, **once per new package**. Skipping this makes the release in the
   next step fail with an auth error.
4. **[Cut a release](#cutting-a-release)** — the normal flow; publishes the real
   packages via OIDC.

Steps 2–3 are one-time per package. After that, every future release is just
step 4.

### Why it's needed

npm OIDC trusted publishing can only be configured on a package that **already
exists** on the registry — there is no "pending publisher" concept. So the
OIDC-only release pipeline cannot publish a package for the very first time:
there is no trusted-publisher config to authenticate against yet.

The fix is a two-step bootstrap: **seed** the package name onto npm with a
short-lived token, then **configure trusted publishing** on it. After that the
normal OIDC pipeline owns it forever.

> **Order matters: merge first.** A `workflow_dispatch` workflow only appears in
> the Actions UI once it's on the **default branch** (`main`), and the seed job
> checks out whatever branch it's dispatched from. So the new packages and the
> seed workflow must both be on `main` before you can seed. The full first-time
> sequence is: **merge the PR to `main` → seed (Step 1, from `main`) → configure
> OIDC (Step 2) → cut the first release.**

### Step 1 — Seed the new package names

This publishes a bare placeholder (just `package.json`, no build output) under a
dedicated `seed` dist-tag, so it never occupies `latest`/`beta`/`alpha`. It only
touches packages that don't yet exist on npm, so it's safe to re-run.

1. On npmjs.com, create a **granular access token**:
   - Scope: **Read and write** packages under `@defra`.
   - Permission to **create new packages** in the scope.
   - Shortest practical expiry (e.g. 1 day).
2. In GitHub → repo **Settings → Secrets and variables → Actions**, add a
   repository secret named **`NPM_TOKEN`** with that token.
3. Run the **"Seed new packages to NPM"** workflow
   (Actions tab → select workflow → **Run workflow**):
   - First with **`dry_run: true`** and confirm the list of packages to be
     seeded looks right.
   - Then with **`dry_run: false`** to actually seed them.
4. Confirm each seeded package landed **only** under the `seed` dist-tag and has
   no `latest` (a bare seed under `latest` would make `npm install` resolve an
   empty, build-less package):

   ```bash
   npm view @defra/interactive-map-plugin-<x> dist-tags   # expect: { seed: '...' }, no latest
   ```
5. **Immediately delete the `NPM_TOKEN` secret** and **revoke the token** on
   npmjs.com. The token has done its job and must not linger.

> Why a temporary secret rather than a workflow input: GitHub secrets are
> encrypted, auto-masked, and never shown in the UI. `workflow_dispatch` inputs
> are not — they're recorded in run metadata in plaintext, so they're the wrong
> place for a credential even for a one-off.

### Step 2 — Configure OIDC trusted publishing on npmjs

Do this **once per newly-seeded package** (the core package is already
configured). For each new package:

1. Go to `https://www.npmjs.com/package/<package-name>` → **Settings** tab.
2. Find the **Trusted Publisher** section → **Select your publisher** →
   **GitHub Actions**.
3. Fill in:
   - **Organization / owner:** `DEFRA`
   - **Repository:** `interactive-map`
   - **Workflow filename:** `publish.yml`
   - **Environment:** leave blank (the publish job does not use one).
4. Save. (npm does not validate the config on save — a wrong value only surfaces
   as an auth failure at publish time, so double-check the fields.)

Each package can have only one trusted publisher. Once configured, that package
is published by OIDC on every future release with no token.

> Tip: this is the tedious part — you repeat it for each new package. Verify it
> worked by doing your next release as a **pre-release** first (see below) and
> checking every package published.

---

## Cutting a release

Once all packages exist and have trusted publishing configured, releasing is just
creating a GitHub Release. **Merging to `main` does not publish anything** — CI
on `main` only runs lint/test. The release pipeline triggers **only** on a
published GitHub Release.

### 1. Pick the version

- All packages are versioned in lockstep from the release **tag**.
- The tag must be `vX.Y.Z` (e.g. `v1.4.0`) or a pre-release `vX.Y.Z-alpha.N`
  (e.g. `v1.4.0-alpha.1`).
- The version must be **greater than the latest already-published version in the
  same major line** for the core package, or the pipeline aborts
  (`validate_version_bump`).

### 2. Create the GitHub Release

1. Make sure `main` is green and contains the commit you want to ship.
2. GitHub → **Releases → Draft a new release**.
3. **Choose a tag** → type the new tag (e.g. `v1.4.0`) → **Create new tag on
   publish**, targeting `main`.
4. Add release notes.
5. **Pre-release vs standard:**
   - Tick **"Set as a pre-release"** (or use an `-alpha.N` tag suffix) to publish
     everything under the `alpha` dist-tag — use this to validate a release
     safely.
   - Leave it unticked for a standard release.
6. **Publish release.**

That triggers the **"Publish to NPM"** workflow:

1. Runs CI (lint/test) and builds all packages.
2. **Pre-flight gate** — before anything is published or stamped,
   `scripts/publish-package.sh` asserts that **every** package (core + all
   providers/plugins) can be published at the target version. If any package
   fails, the whole release aborts here with **nothing published**, so you can
   never get a partial release. See [Pre-flight checks](#3-pre-flight-checks)
   below.
3. Stamps the release version into every `package.json` (and pins each package's
   `@defra/interactive-map` peer dependency to that exact version).
4. Publishes core first, followed by every provider and plugin.

### 3. Pre-flight checks

The pre-flight gate runs once over all packages and reports **every** problem
before publishing starts. The failure modes and how to fix each:

| Pre-flight failure | Meaning | Fix |
| --- | --- | --- |
| `not found on npm — needs bootstrap` | A new package was never seeded / OIDC-configured (npm returned an explicit E404) | Do the [One-time bootstrap](#one-time-bootstrap-new-packages-only), then re-release |
| `could not query npm (network/registry error)` | npm couldn't be reached — the gate can't tell whether the package exists | Re-run the release; if it persists, check [status.npmjs.org](https://status.npmjs.org) |
| `version X is already published` | This version exists (often a partial earlier release) | Cut a new patch version — see [Troubleshooting](#troubleshooting) |
| `npm publish --dry-run failed` | Missing build output or invalid `package.json` | Fix the package/build — see [Troubleshooting](#troubleshooting) |

It also prints an **ℹ first real release** reminder for any package still on only
its `seed` placeholder version, so you double-check trusted publishing is
configured before its first real publish.

> **Residual gap:** the gate can confirm a package *exists* on npm, but cannot
> verify its OIDC trusted-publisher config is correct without actually publishing
> (there's no way to exercise the OIDC token exchange in a dry run). The safest
> validation is to cut a **pre-release** first — it publishes every package under
> `alpha` and surfaces any auth problem without touching `latest`/`beta`.

### 4. Dist-tags — what lands where

| Release type | Core | `provider-maplibre`, `plugin-interact`, `plugin-search` | All other providers/plugins |
| --- | --- | --- | --- |
| **Pre-release** (pre-release flag **or** `-alpha.N` tag) | `alpha` | `alpha` | `alpha` |
| **Standard release** | `latest` | `latest` | `beta` |

The split on a standard release comes from each package's
`publishConfig.tag`: packages considered stable have none (→ `latest`), the rest
carry `"publishConfig": { "tag": "beta" }`.

> **Consequence to be aware of:** a package published only under `beta` has **no
> `latest` dist-tag**, so a plain `npm install @defra/interactive-map-plugin-<x>`
> (which resolves `latest`) will fail for the beta packages — consumers must use
> `@beta`. The stable packages (core, `provider-maplibre`, `plugin-interact`,
> `plugin-search`) install normally. If you want a package to start resolving on
> `latest`, remove its `publishConfig.tag`.

**Graduating a package to stable** is a three-place change: remove its
`publishConfig.tag`, remove its directory from `sonar.exclusions` in
`sonar-project.properties`, and remove it from `coveragePathIgnorePatterns` in
`jest.config.mjs` — beta packages are deliberately outside the Sonar quality
gate and coverage collection (carried over from the old `beta/` directory
layout), and a stable package should be inside both.

### 5. Verify

Check the Actions run succeeded, then spot-check npm:

```bash
npm view @defra/interactive-map version dist-tags
npm view @defra/interactive-map-provider-maplibre version dist-tags
npm view @defra/interactive-map-plugin-datasets dist-tags   # expect a beta tag
```

---

## Troubleshooting

**A release failed partway through.** The publish loop uses `set -e` and is **not
resumable**: if it dies after publishing some packages, the rest are missing, and
re-running the release fails immediately because the already-published packages
(and core) can't be republished at the same version. Recovery options:

- Publish the missing packages by hand at the same version (requires appropriate
  npm auth), **or**
- Cut a new patch release (e.g. `v1.4.1`) so every package re-publishes cleanly
  in lockstep. This is usually the simpler path.

**A new package failed to publish with an auth error.** It almost certainly skipped
the [one-time bootstrap](#one-time-bootstrap-new-packages-only) — it was never
seeded, or its trusted publisher isn't configured. Complete both steps, then
re-release.

**Version rejected.** The new version isn't greater than the latest published in
that major line. Bump higher.
