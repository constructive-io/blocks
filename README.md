# Constructive Blocks

Constructive Blocks is the public home for the Constructive shadcn registry,
component documentation, and published React packages.

## Workspaces

- `apps/blocks` — primitive documentation and canonical block source.
- `apps/registry` — private builder for the `@constructive` shadcn registry.
- `packages/ui` — the `@constructive-io/ui` npm package and UI registry source.
- `packages/data` — runtime GraphQL generation and the strict July 2026 `_meta` contract.
- `packages/sheets` — the metadata-driven application CRUD grid.
- `packages/command-palette` — the headless command registry, shortcuts, workflows, and background-task engine.
- `packages/schema-builder` — the source-installable Schema Builder, its host-adapter contract, and its npm package.

The documentation site is published at
<https://constructive-io.github.io/blocks/>. Registry JSON is served from
`https://constructive-io.github.io/blocks/r/{name}.json`.

The npm and registry distributions are independent. Console Kit source installs
expect an existing shadcn project; initialize one if the application does not
already contain `components.json`:

```bash
pnpm dlx shadcn@4.13.1 init
```

Keep the generated alias configuration, then map the public registry in
`components.json` once:

```json
{
  "registries": {
    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"
  }
}
```

Then choose the smallest surface that owns the workflow you need:

| Goal | Install root |
| --- | --- |
| Full tenant console with all seven packs | `console-kit-nextjs` |
| Backend-aligned official composition | `preset-auth-hardened`, `preset-b2b-storage`, or `preset-full` |
| Custom Console Kit composition | `console-kit-core` plus selected `console-module-*` items |
| Provider-neutral view with host-owned data and actions | `feature-pack-*` |
| Application command center with editable presentation | `command-palette` |
| Reusable primitive | npm subpath or namespaced primitive registry item |

```bash
pnpm dlx shadcn@4.13.1 add @constructive/console-kit-nextjs
```

Render the installed umbrella with a secret-free tenant descriptor returned by
provisioning. Endpoint URLs are explicit because Console Kit never derives a
sibling host or silently crosses an authorization boundary:

```tsx
'use client';

import {
  ConstructiveConsoleKit,
  type ConstructiveTenantDatabase
} from '@/blocks/console-kit/constructive';

const database = {
  id: 'tenant_database_id',
  name: 'Acme application',
  endpoints: {
    data: 'https://data.example.com/graphql',
    auth: 'https://auth.example.com/graphql',
    admin: 'https://admin.example.com/graphql'
  }
} satisfies ConstructiveTenantDatabase;

export function TenantConsole() {
  return <ConstructiveConsoleKit database={database} />;
}
```

During integration, pass
`showDiagnostics={process.env.NODE_ENV !== 'production'}` to expose endpoint and
capability evidence without shipping tenant diagnostics in the production UI.

Use the npm surface for packaged primitives, or install editable primitive
source through the same namespace:

```bash
pnpm add @constructive-io/ui
pnpm dlx shadcn@4.13.1 add @constructive/button
```

The UI package exposes its Tailwind foundation at
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

Console Kit and the feature packs are source-installed blocks. They accept
database-scoped endpoints, a host-owned session, and provider-neutral adapters;
they do not require generated SDKs or environment-specific global clients. A
Console Kit instance owns one Zustand store composed from separate navigation,
runtime, and adapter slices, which keeps state isolated across mounts and
server requests.

## Agent inspection

An agent can resolve an install without reading component source or contacting a
tenant. The inspector rebuilds the local aggregate registry, follows its exact
dependency graph, joins the installed packs to their canonical manifests, and
emits deterministic, discriminated JSON containing the CLI command, npm
dependencies, canonical preset profiles, registry targets and source
provenance, endpoint/capability/`_meta` requirements, degraded-state rules,
tenant/routing/store/auth contracts, and verification steps. A file target
classified as `shadcn-alias` resolves through the consumer aliases in
`components.json`; `project-root` targets install outside `src` at the project
root:

```bash
pnpm --silent console-kit:inspect --list
pnpm --silent console-kit:inspect --item preset-b2b-storage
pnpm --silent console-kit:inspect --item console-module-storage --compact
pnpm check:console-kit-inspector
```

`--silent` keeps stdout valid JSON for piping into `jq` or another agent tool.
Unknown roots fail with the complete valid-choice list. The default command
rebuilds the aggregate registry from canonical local inputs; `--no-build` reads
the existing artifact and makes freshness the caller's responsibility. Once
workspace dependencies are installed, inspection contacts neither a tenant nor
the public registry. Installed compatibility manifests remain under
`.constructive/feature-packs`; they describe backend evidence and never grant
frontend or database authority.

After installing into a consumer, run the plan's static verification commands
without tenant credentials. Registry maintainers can exercise every root in an
isolated generated consumer with the cross-platform smoke gate:

```bash
pnpm --filter @constructive-io/registry smoke:install
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
