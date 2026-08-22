# Releasing npm packages

Publishing is intentionally manual. GitHub Actions validates release commits
and tags but has no npm credentials and does not run `npm publish`.

## Prepare versions and tags

1. Start from a clean `main` checkout and run `pnpm check`.
2. Run `pnpm release:version` and select independent package versions.
3. Review the generated changelogs, package versions, lockfile, release commit,
   and Lerna package tags.
4. Run `pnpm pack:check`; package verification must pass before building the
   Pages artifact, because the site must describe the exact package inputs that
   were validated for release.
5. Run `pnpm build:pages`, then push the release commit and tags and wait for
   tag validation to pass. CI enforces the same package-before-Pages sequence.

For the repository cutover, the intended releases are:

- `@constructive-io/ui@0.8.0`
- `@constructive-io/data@0.5.0`
- `@constructive-io/sheets@0.8.0`
- `@constructive-io/command-palette@0.4.0`
- `@constructive-io/schema-builder@0.4.0`

`json-renderer`, `blocks-schema`, `blocks-renderer`, `json-schema-to-blocks`,
`meta-to-blocks`, and `flow-to-blocks` release independently of that cutover set.
`blocks-schema` depends on `json-renderer`, so publish `json-renderer` first.
They are built with `makage` and publish from `dist` (`publishConfig.directory`),
so their entry points are root-level files and consumers get deep imports
(`blocks-schema/compose`, `json-renderer/compose`) without an exports map. `pnpm pack:check` verifies that
layout in an isolated consumer, including packed dependents resolving the packed
schema.

### The `dist` manifest must be rebuilt after every version bump

`lerna version` rewrites the *source* `package.json`; the manifest that actually
reaches npm is `dist/package.json`, written by `makage assets`. So a `dist` tree
built before the bump publishes the previous version number with the new code,
and `lerna publish` reports success while doing it. Always run
`pnpm build:packages` (or rely on each package's `prepack`) between the version
bump and the publish.

Those packages also depend on each other through `workspace:^`, which `npm
publish` cannot resolve — only `pnpm publish`/`pnpm pack` rewrite it. Their build
therefore ends with `node ../../scripts/resolve-dist-workspace-deps.mjs &&
makage check-publish`, which turns `"blocks-schema": "workspace:^"` into
`"^0.3.0"` in the dist manifest and then fails the build if any workspace range
survived. `pnpm check:dist-manifests` (part of `pnpm check`) re-checks both
properties — dist version equals source version, no `workspace:` ranges — across
all six packages.

## Verify the exact publish inputs

From the validated tag checkout:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm pack:check
```

`pnpm pack:check` builds every package and installs the tarballs into clean
consumers, including an isolated Sheets consumer that checks its runtime icon
dependencies and Tailwind v4 stylesheet export. Before publishing, point a
temporary downstream checkout at the tarballs in `.artifacts/npm`, install from
scratch, and run its typecheck and production build. Do not commit `file:` or
`link:` dependency specifications.

For a downstream lockfile that must keep semver specifications, run
`pnpm local:registry` after `pnpm pack:local`, temporarily point the
`@constructive-io` npm scope at `http://127.0.0.1:4873`, and regenerate the
lockfile. The read-only server serves these five exact tarballs and proxies other
public packages; remove the temporary registry setting afterward and verify the
lockfile contains no localhost URLs.

## Publish

Publish the tarballs themselves so npm receives the exact files that passed the
local checks:

```bash
npm publish .artifacts/npm/constructive-io-ui-0.8.0.tgz --access public
npm publish .artifacts/npm/constructive-io-data-0.5.0.tgz --access public
npm publish .artifacts/npm/constructive-io-sheets-0.8.0.tgz --access public
npm publish .artifacts/npm/constructive-io-command-palette-0.4.0.tgz --access public
npm publish .artifacts/npm/constructive-io-schema-builder-0.4.0.tgz --access public
```

Publish the naked-name packages the same way, `json-renderer` first because
`blocks-schema` depends on it:

```bash
npm publish .artifacts/npm/json-renderer-0.1.0.tgz --access public
npm publish .artifacts/npm/blocks-schema-0.3.0.tgz --access public
npm publish .artifacts/npm/blocks-renderer-0.2.0.tgz --access public
npm publish .artifacts/npm/json-schema-to-blocks-0.2.1.tgz --access public
npm publish .artifacts/npm/meta-to-blocks-0.2.1.tgz --access public
npm publish .artifacts/npm/flow-to-blocks-0.2.1.tgz --access public
```

Publishing the verified tarballs is the supported path. `lerna publish` packs
the live `dist` directory instead, so it only produces the same bytes when the
build ran after the version bump.

Verify every package with `npm view <name> version`, confirm the published
manifest carries no `workspace:` ranges (`npm view <name> dependencies`), and do
a clean consumer install. Published versions are immutable; release corrections
as a forward patch and `npm deprecate` the bad version.
