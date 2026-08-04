---
name: constructive-blocks
description: Discover, install, compose, update, and verify current Constructive Blocks from the @constructive shadcn registry or @constructive-io npm packages. Use for Constructive primitives, AI chat, command palette, Sheets, Schema Builder, org chart, storage, billing, feature packs, Console Kit, presets, registry configuration, or Blocks integration and debugging.
---

# Constructive Blocks

Use the live `@constructive` registry and the consumer's current project
configuration as the source of truth. Never require a Blocks commit, branch,
catalog snapshot, or fixed package version.

## Choose the distribution

- Use the `@constructive` shadcn registry when the application should own and
  edit the installed source. Console Kit, feature packs, presets, application
  blocks, and registry primitives use this path.
- Use an `@constructive-io/*` npm package when the application wants a packaged
  API. The UI, data, Sheets, command-palette, and Schema Builder packages are
  independent of their source-installable registry surfaces.
- Do not install both distributions for the same presentation surface unless
  the item's live registry metadata explicitly declares a package dependency.

Read [surface selection and ownership](references/surfaces-and-ownership.md)
before choosing a root for an application block, feature pack, or Console Kit.

## Follow the live workflow

Examples use pnpm. Match the consumer's package manager: `npx`, `pnpm dlx`, or
`bunx --bun`.

1. Inspect the project before changing it:

   ```bash
   pnpm dlx shadcn@latest info --json
   ```

   Read `components.json`, installed components, framework, RSC mode, Tailwind
   CSS file, aliases, base library, icon library, and package manager. If the
   project has no `components.json`, initialize shadcn first.

2. Configure the namespace once when it is absent:

   ```json
   {
     "registries": {
       "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"
     }
   }
   ```

3. Search by intent instead of guessing an item name:

   ```bash
   pnpm dlx shadcn@latest search @constructive -q "AI chat"
   pnpm dlx shadcn@latest search @constructive -q "storage browser"
   ```

4. Inspect the current item, including its files, dependencies, install
   targets, and embedded docs:

   ```bash
   pnpm dlx shadcn@latest view @constructive/ai
   pnpm dlx shadcn@latest view @constructive/storage-browser
   ```

   Use `shadcn@latest docs` for any upstream shadcn primitives involved in the
   composition.

5. Preview before installing or updating:

   ```bash
   pnpm dlx shadcn@latest add @constructive/ai --dry-run
   pnpm dlx shadcn@latest add @constructive/ai --diff path/to/installed-file.tsx
   ```

   Preserve consumer edits. Never use `--overwrite` without explicit approval.

6. Install the smallest root that owns the requested workflow:

   ```bash
   pnpm dlx shadcn@latest add @constructive/ai
   ```

7. Read the installed files and the item docs before composing them. Resolve
   imports from the actual targets and aliases reported by the CLI; do not copy
   repository-internal paths or assume the default `@/` alias.

8. Run the consumer's typecheck, tests, and production build. Exercise the
   relevant loading, empty, error, permission-denied, and successful states.

Read [catalog and install workflow](references/catalog-and-install.md) for
initialization, npm usage, updates, MCP, and failure handling. Read [runtime and
verification](references/runtime-and-verification.md) before connecting Blocks
to endpoints, sessions, adapters, or tenant data.

## Route by intent

| Intent | Start with |
| --- | --- |
| General UI primitive or bundle | Search for the component, `form-kit`, `overlay-kit`, or `layout-kit` |
| Application shell | `app-shell` |
| AI or agent UI | `ai` |
| Global commands and workflows | `command-palette` |
| Metadata-driven data grid | `sheets` |
| PostgreSQL schema workspace | `schema-builder` |
| Reporting hierarchy | `org-chart` |
| Object storage workspace | `storage-browser` or a focused storage leaf |
| Customer billing | `billing-settings-page` or a focused billing block |
| Provider-neutral domain screen | `feature-pack-<id>` |
| Selected Console Kit integration | `console-kit-core` plus `console-module-<id>` |
| Backend-aligned Console composition | Search `preset` and inspect the current preset roots |
| Full Next.js tenant console | `console-kit-nextjs` |

Treat these as search starting points. Confirm every root through live `search`
and `view` before installation.

## Preserve ownership boundaries

- Keep model runtimes, GraphQL clients, generated SDKs, routing, persistence,
  telemetry, credentials, authorization decisions, and destructive
  confirmations in the host application.
- Pass explicit endpoints, sessions, adapters, resources, and callbacks through
  each installed block's public contract. Do not infer sibling hosts.
- Treat registry metadata, `_meta`, introspection, and hidden UI controls as
  capability evidence only. PostgreSQL privileges and RLS authorize every
  tenant request.
- Inspect each installed provider boundary. Do not assume every Blocks surface
  shares one state store or one provider.
- Never change secure backend or RLS behavior merely to satisfy a frontend
  assumption.

## Optional MCP workflow

The public registry implements the standard shadcn registry contract, so the
official shadcn MCP can search, inspect, and install Blocks after the namespace
is present in `components.json`:

```bash
pnpm dlx shadcn@latest mcp init --client codex
```

Use the user's actual MCP client value. Keep the CLI workflow available because
the skill must also work in agents without MCP support.
