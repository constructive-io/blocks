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

- `@constructive-io/ui@0.5.0`
- `@constructive-io/data@0.2.0`
- `@constructive-io/sheets@0.5.0`
- `@constructive-io/schema-builder@0.1.0`

## Verify the exact publish inputs

From the validated tag checkout:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm pack:check
```

`pnpm pack:check` builds all four packages and installs their tarballs into clean
consumers, including an isolated Sheets consumer that checks its runtime icon
dependencies and Tailwind v4 stylesheet export. Before publishing, point a
temporary downstream checkout at the tarballs in `.artifacts/npm`, install from
scratch, and run its typecheck and production build. Do not commit `file:` or
`link:` dependency specifications.

For a downstream lockfile that must keep semver specifications, run
`pnpm local:registry` after `pnpm pack:local`, temporarily point the
`@constructive-io` npm scope at `http://127.0.0.1:4873`, and regenerate the
lockfile. The read-only server serves these four exact tarballs and proxies other
public packages; remove the temporary registry setting afterward and verify the
lockfile contains no localhost URLs.

## Publish

Publish the tarballs themselves so npm receives the exact files that passed the
local checks:

```bash
npm publish .artifacts/npm/constructive-io-ui-0.5.0.tgz --access public
npm publish .artifacts/npm/constructive-io-data-0.2.0.tgz --access public
npm publish .artifacts/npm/constructive-io-sheets-0.5.0.tgz --access public
npm publish .artifacts/npm/constructive-io-schema-builder-0.1.0.tgz --access public
```

Verify all four packages with `npm view` and a clean consumer install. Published
versions are immutable; release corrections as a forward patch.
