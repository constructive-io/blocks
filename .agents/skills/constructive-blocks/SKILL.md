---
name: constructive-blocks
description: Overview of Constructive Blocks and how to consume them — the two distributions (npm packages and the @constructive shadcn registry), picking the right install root (console-kit-nextjs, a preset, console-kit-core + console-module-*, a standalone feature-pack, command-palette, or a primitive), running the shadcn add command, and rendering Console Kit with a secret-free tenant descriptor. Use when asked about Constructive Blocks, or to "add a block", "install console kit", "add a feature pack", "use the @constructive registry", or "resolve an install with the inspector".
compatibility: Node 24 LTS, pnpm 10.28.0; consumer must be a shadcn project (components.json)
metadata:
  author: constructive-io
  version: "1.0.0"
---

# Constructive Blocks

Constructive Blocks are distributed two independent ways:

- **npm packages** — `@constructive-io/ui`, `@constructive-io/data`,
  `@constructive-io/sheets`, `@constructive-io/command-palette`,
  `@constructive-io/schema-builder` (packaged primitives).
- **The `@constructive` shadcn registry** — editable source copied into the
  consumer app (Console Kit, feature packs, presets, and primitives).

This skill covers consuming Blocks, focused on the **registry / "add a block"
path**. The registry is served from
`https://constructive-io.github.io/blocks/r/{name}.json`.

## 1. One-time consumer setup

Blocks install into an existing shadcn project. If the consumer has no
`components.json`, initialize one:

```bash
pnpm dlx shadcn@latest init
```

Keep the generated alias config, then register the `@constructive` namespace in
`components.json` **once**:

```json
{
  "registries": {
    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"
  }
}
```

Registry installs copy the required UI source + Constructive theme into the
consumer; they do **not** add the npm package. Always invoke the CLI via
`shadcn@latest`.

## 2. Pick the smallest install root that owns your workflow

| Goal | Install root |
| --- | --- |
| Full tenant console, all seven packs, one command | `console-kit-nextjs` |
| Backend-aligned official composition | `preset-auth-hardened`, `preset-b2b-storage`, `preset-full` |
| Custom Console Kit composition | `console-kit-core` + selected `console-module-<id>` |
| Provider-neutral view, host owns data/actions (no Console Kit) | `feature-pack-<id>` |
| Application command center | `command-palette` |
| A single reusable primitive | npm subpath, or `@constructive/<primitive>` (e.g. `button`) |

Install command (every item, same shape):

```bash
pnpm dlx shadcn@latest add @constructive/console-kit-nextjs
pnpm dlx shadcn@latest add @constructive/preset-b2b-storage
pnpm dlx shadcn@latest add @constructive/console-module-storage
pnpm dlx shadcn@latest add @constructive/button
```

### Feature packs and modules

Seven feature-pack ids: `data`, `auth`, `users`, `organizations`, `storage`,
`billing`, `notifications`.

- `feature-pack-<id>` — installs only the provider-neutral view + its
  compatibility manifest. Renderable by a host that does not use Console Kit;
  the host owns resources, policy, action callbacks, and selection/routing
  state. Does **not** pull in Console Kit.
- `console-module-<id>` — installs `console-kit-core` **and** the standalone
  feature-pack view transitively, then adds the module's discovery bindings,
  Constructive adapter, metadata resolver, and pack-owned state.

### Presets (core + an exact module set)

| Preset root | Installed modules |
| --- | --- |
| `preset-auth-hardened` | Data, Auth, Users |
| `preset-b2b-storage` | Data, Auth, Users, Organizations, Storage |
| `preset-full` | Data, Auth, Users, Organizations, Storage, Billing, Notifications |

Navigation at runtime is the **intersection** of installed modules and the
capabilities actually discovered for the active tenant — installing a pack does
not prove its backend capability is exposed or authorized.

## 3. Render Console Kit

Console Kit takes a **secret-free** tenant descriptor (from provisioning) with
explicit per-endpoint URLs. It never derives a sibling host or crosses an
authorization boundary:

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

- Required descriptor fields: `id`, `endpoints`. Optional: `name`.
- A host-owned session must declare the same `databaseId`; a mismatch fails
  closed.
- During integration only, pass
  `showDiagnostics={process.env.NODE_ENV !== 'production'}` to expose endpoint
  and capability evidence. Never ship diagnostics in production.
- Each Console Kit instance owns **one** per-instance Zustand store composed
  from modular slices — never a process-wide store, never credentials in
  Zustand, never a second provider per pack.

## 4. Resolve an install with the inspector (agent-friendly)

Before/without touching a tenant, ask the local inspector exactly what an item
installs — CLI command, npm deps, preset profile, registry targets, endpoint /
capability / `_meta` requirements, and verification steps — as deterministic
JSON:

```bash
pnpm --silent console-kit:inspect --list
pnpm --silent console-kit:inspect --item preset-b2b-storage
pnpm --silent console-kit:inspect --item console-module-storage --compact
```

`--silent` keeps stdout valid JSON for `jq`. The default rebuilds the aggregate
registry from local inputs; `--no-build` reads the existing artifact (freshness
is then the caller's responsibility). Unknown roots fail with the full
valid-choice list.

## 5. Verify after installing (no tenant/credentials needed)

Run from the **consumer** project root, after installing its deps:

```bash
pnpm exec tsc --noEmit
pnpm build
```

Then confirm each installed pack's `.constructive/feature-packs/<id>.json`
manifest exists and matches the endpoint/capability/`_meta` requirements in the
inspector plan. Schema evidence (`_meta`, introspection) is **not**
authorization evidence — exercise authenticated reads/writes with the intended
tenant role to prove RLS authority.

## Invariants (do not violate)

- Every install command uses the `@constructive` namespace; the combined
  registry stays collision-free.
- Never edit generated registry output; canonical source lives in `apps/blocks`
  and `packages/*`.
- Blocks take injected endpoints, sessions, and adapters — do not add generated
  SDK trees or make normal CI depend on live endpoints.
- Registry installation and schema discovery never grant authority; PostgreSQL
  grants and RLS remain authoritative for every request.

## References

- `README.md` — install quick start, registry mapping, render example,
  inspector usage.
- `AGENTS.md` / `CLAUDE.md` — repository invariants, toolchain (Node 24 LTS,
  pnpm 10.28.0), verify pipeline (`pnpm check` / `check:full` / `build:pages` /
  `pack:local`).
- `docs/CONSOLE_KIT_BACKEND_COMPATIBILITY.md` — install surfaces, preset module
  sets, the four evidence layers (reachability → `_meta` → introspection →
  runtime authority), and per-pack requirements.
- `scripts/inspect-console-kit.ts` — the inspector and the
  `ConsoleKitInstallPlan` schema it emits.
- `apps/blocks/src/feature-packs/manifest.ts` — canonical `FEATURE_PACK_IDS`
  and `PRESET_PROFILE_IDS`.
</content>
</invoke>
