# Constructive Blocks

Constructive Blocks is the public home for the Constructive shadcn registry,
component documentation, and published React packages.

## Workspaces

- `apps/blocks` — primitive documentation and canonical block source.
- `apps/registry` — private builder for the `@constructive` shadcn registry.
- `packages/ui` — the `@constructive-io/ui` npm package and UI registry source.
- `packages/schema-builder` — the shared schema-builder npm package and registry source.

The documentation site is published at
<https://constructive-io.github.io/blocks/>. Registry JSON is served from
`https://constructive-io.github.io/blocks/r/{name}.json`.

The npm and registry distributions are independent. After mapping the
`@constructive` namespace in `components.json`, either surface can be used on
its own:

```bash
pnpm add @constructive-io/ui
pnpm dlx shadcn@4.13.1 add @constructive/button
```

The package exposes its Tailwind foundation at
`@constructive-io/ui/globals.css`. Registry installs copy the required UI
source and Constructive theme into the consumer and do not install the npm
package. Registry consumers require shadcn CLI 4.13.1 or newer.

## Development

```bash
pnpm install
pnpm check
pnpm build:pages
pnpm pack:local
```

Development and release verification use Node 24 LTS and pnpm 10.28.0. All
first-party executable tooling is TypeScript and runs through `tsx`.
Use `pnpm check:full` when validating Storybook, registry installation, and
publishable package artifacts together.

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
