# Constructive Blocks

Constructive Blocks is the public home for the Constructive shadcn registry,
component documentation, and published React packages.

## Workspaces

- `apps/blocks` — documentation, demos, flows, and canonical block source.
- `apps/registry` — private builder for the `@constructive` shadcn registry.
- `packages/ui` — the `@constructive-io/ui` npm package and UI registry source.
- `packages/schema-builder` — the shared schema-builder npm package and registry source.

The documentation site is published at
<https://constructive-io.github.io/blocks/>. Registry JSON is served from
`https://constructive-io.github.io/blocks/r/{name}.json`.

## Development

```bash
pnpm install
pnpm check
pnpm build:pages
pnpm pack:local
```

`pnpm pack:local` builds the public packages and writes publishable tarballs to
the ignored `.artifacts/npm` directory. Consume those tarballs from downstream
projects before publishing so validation exercises the real package contents.

## Releases

Releases use independent Lerna versions. A maintainer runs
`pnpm release:version`, pushes the reviewed release commit and tags, waits for
CI, runs `pnpm pack:local` from the validated tag, and publishes each tarball
manually with npm. GitHub Actions never publishes npm packages.

## License

MIT
