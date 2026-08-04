# Catalog and install workflow

Use this reference when initializing a consumer, installing from either
distribution, updating existing source, enabling MCP, or diagnosing registry
access.

## Establish project context

Choose the command runner from the consumer:

| Project signal | Runner |
| --- | --- |
| `pnpm-lock.yaml` or `packageManager: pnpm` | `pnpm dlx shadcn@latest` |
| `bun.lock` or `packageManager: bun` | `bunx --bun shadcn@latest` |
| npm or no package-manager signal | `npx shadcn@latest` |

Run `shadcn@latest info --json`. Use its `aliases`, `resolvedPaths`, `isRSC`,
`tailwindVersion`, `tailwindCssFile`, `base`, `iconLibrary`, and `framework`
instead of assuming a conventional Next.js layout.

If `info` reports that the project is not initialized, run
`shadcn@latest init`, review the resulting `components.json`, and then add:

```json
{
  "registries": {
    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"
  }
}
```

Keep the existing aliases and other project settings intact. The live catalog
is `https://constructive-io.github.io/blocks/r/registry.json`.

## Discover before installing

Search by the user's intended workflow, then inspect likely roots:

```bash
pnpm dlx shadcn@latest search @constructive -q "schema editor" --json
pnpm dlx shadcn@latest view @constructive/schema-builder
```

Use the item's live `description`, `registryDependencies`, `dependencies`,
`files`, targets, categories, and `docs` to decide. Do not maintain or consult
an embedded item-count snapshot.

For an uninstalled item, preview the complete closure:

```bash
pnpm dlx shadcn@latest add @constructive/schema-builder --dry-run
```

For an installed item, inspect changes one file at a time:

```bash
pnpm dlx shadcn@latest add @constructive/schema-builder --dry-run
pnpm dlx shadcn@latest add @constructive/schema-builder --diff src/components/schema-builder/index.ts
```

Apply upstream changes while preserving local edits. Use `--overwrite` only
when the user explicitly accepts replacing the installed source.

## Use npm intentionally

Install a package without a version suffix when packaged APIs are the intended
ownership model:

```bash
pnpm add @constructive-io/ui
pnpm add @constructive-io/data
pnpm add @constructive-io/sheets
pnpm add @constructive-io/command-palette
pnpm add @constructive-io/schema-builder
```

Inspect the current package exports before importing. A registry item may
legitimately depend on a headless package while still installing its editable
presentation source; `command-palette` is the clearest example.

## Use the official shadcn MCP when available

Initialize the official server for the user's client:

```bash
pnpm dlx shadcn@latest mcp init --client codex
```

The MCP reads the same registry namespace from `components.json`. Do not create
a Blocks-specific MCP or let MCP availability become a prerequisite for the
CLI workflow.

## Handle failures without stale fallbacks

- If the registry is unavailable, report the URL and network error. Do not fall
  back to a bundled catalog snapshot or raw GitHub files.
- If an item is not found, rerun live `search`; do not invent a root from an old
  name.
- If aliases or imports are wrong, rerun `info --json`, inspect installed
  targets, and update imports to the consumer's actual aliases.
- If an update conflicts with local edits, stop after `--dry-run` and `--diff`
  until the merge policy is clear.
- If installation succeeds but compilation fails, read every added file and
  confirm peer dependencies, client boundaries, CSS imports, and package
  exports before changing application behavior.
