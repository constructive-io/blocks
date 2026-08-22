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
- `packages/json-renderer` — the framework-agnostic `json-renderer` core: document envelope and node tree, validation, composition, binding resolution, and the renderer adapter contract.
- `packages/blocks-schema` — the `blocks-schema` JSON UI document format, validators, and composition API, specializing `json-renderer` with the Constructive block vocabulary.
- `packages/blocks-renderer` — the `blocks-renderer` React adapter for those documents.
- `packages/json-schema-to-blocks` — the `json-schema-to-blocks` lowering of JSON Schema into those documents.
- `packages/meta-to-blocks` — the `meta-to-blocks` lowering of database metadata into generated form, list, and detail documents.
- `packages/flow-to-blocks` — the `flow-to-blocks` evaluation of a flow graph into a computed document.

The documentation site is published at
<https://constructive-io.github.io/blocks/>. Registry JSON is served from
`https://constructive-io.github.io/blocks/r/{name}.json`.

The npm and registry distributions are independent. Console Kit source installs
expect an existing shadcn project; initialize one if the application does not
already contain `components.json`:

```bash
pnpm dlx shadcn@latest init
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

## Build with an AI agent

Install the repository's canonical Agent Skill from the latest default branch:

```bash
npx skills add constructive-io/blocks
```

The skill teaches agents to inspect the consumer, search the live registry,
preview the dependency closure, install the smallest useful root, and verify
the result without relying on a Blocks commit or catalog snapshot. It works
with the shadcn CLI alone:

```bash
pnpm dlx shadcn@latest info --json
pnpm dlx shadcn@latest search @constructive -q "AI chat"
pnpm dlx shadcn@latest view @constructive/ai
pnpm dlx shadcn@latest add @constructive/ai --dry-run
pnpm dlx shadcn@latest add @constructive/ai
```

Agents with MCP support can use the official shadcn registry server after the
`@constructive` namespace is present in `components.json`:

```bash
pnpm dlx shadcn@latest mcp init --client codex
```

Use the client value for the agent being configured. The public
[`llms.txt`](https://constructive-io.github.io/blocks/llms.txt) links the live
registry and every major Blocks documentation surface for agents that begin
from the deployed site.

Example requests:

- “Add a streaming agent chat with tool and approval states using Constructive
  Blocks; keep model execution and persistence in my host.”
- “Inspect the current registry and add a spreadsheet CRUD surface for my
  tenant endpoint.”
- “Choose the smallest current Console Kit composition for data, users,
  organizations, and storage, then verify allowed and denied operations.”

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
pnpm dlx shadcn@latest add @constructive/console-kit-nextjs
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
pnpm dlx shadcn@latest add @constructive/button
```

The UI package exposes its Tailwind foundation at
`@constructive-io/ui/globals.css`. Registry installs copy the required UI
source and Constructive theme into the consumer and do not install the npm
package. Registry consumers should invoke the current shadcn CLI through
`shadcn@latest`.

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
they do not require generated SDKs or environment-specific global clients.
Console Kit core owns an isolated modular store, while installed feature
surfaces may mount their documented providers. Read the installed source before
composing roots instead of assuming every Blocks surface shares one store or
provider.

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
