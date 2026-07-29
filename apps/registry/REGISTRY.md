# Constructive shadcn registry

The public `@constructive` registry is built from four canonical sources:

- `packages/ui` provides the Constructive primitives, app bar, and app shell.
- `packages/sheets` provides the source-owned data grid and its adapter contracts.
- `packages/schema-builder` provides the source-owned control-plane schema editor.
- `apps/blocks` provides billing blocks, the Command Palette presentation,
  provider-neutral feature packs, optional Console Kit modules, preset roots,
  and `console-kit-nextjs`.

The aggregator validates unique names and install targets, exact feature-pack
and preset roots, and every feature-pack dependency profile without relying on
a fragile whole-registry item count.

## Configure and install

Add the namespace to a consumer's `components.json`:

```json
{
  "registries": {
    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"
  }
}
```

Then install the full console, a backend-aligned preset, one feature pack, or a
standalone primitive:

```bash
pnpm dlx shadcn@latest add @constructive/console-kit-nextjs
pnpm dlx shadcn@latest add @constructive/preset-b2b-storage
pnpm dlx shadcn@latest add @constructive/console-module-users
pnpm dlx shadcn@latest add @constructive/feature-pack-users
pnpm dlx shadcn@latest add @constructive/command-palette
pnpm dlx shadcn@latest add @constructive/sheets
pnpm dlx shadcn@latest add @constructive/schema-builder
pnpm dlx shadcn@latest add @constructive/app-shell
pnpm dlx shadcn@latest add @constructive/billing-settings-page
```

`feature-pack-*` installs are standalone views and write their machine-readable
contract to `.constructive/feature-packs/<id>.json` at the consumer root without
installing Console Kit. A matching `console-module-*` item installs that view
and `console-kit-core` transitively, then adds discovery, navigation, and the
Constructive adapter or pack slice it needs. Presets depend on those console
modules, so they install the same view contracts without duplicating ownership.
The console uses injected endpoints, session state, and action adapters, so
installing source does not embed deployment-specific URLs or generated SDK
fixtures.

Invoke the registry with the current CLI through `shadcn@latest`. UI, Sheets,
Schema Builder, and billing roots copy their visual source and theme into the
consumer. Data feature packs, presets that include data, and
`console-kit-nextjs` install the headless `@constructive-io/data` package while
Sheets remains editable local source. The console also adds Zustand for its
local navigation, runtime, and adapter store.
The Command Palette follows the same ownership split: its registry item installs
editable presentation source and `@constructive-io/command-palette` supplies the
framework-neutral registry, execution, workflow, and background-task state.

After configuring the `@constructive` namespace above, a root item may also be
installed directly by URL. The namespace configuration remains required so
shadcn can resolve nested `@constructive/*` dependencies:

```bash
pnpm dlx shadcn@latest add https://constructive-io.github.io/blocks/r/console-kit-nextjs.json
```

## Build and validate

```bash
pnpm --filter @constructive-io/registry build
pnpm --filter @constructive-io/registry smoke:install
pnpm --filter @constructive-io/registry clean
```

The build first generates the UI, Sheets, and Schema Builder registries, copies
them together with the canonical app block sources into an ignored staging
directory, merges their manifests, namespaces internal dependencies, and runs
`pnpm dlx shadcn@latest build` into `apps/registry/public/r`.

The smoke command performs isolated installs for UI, billing, standalone
feature-pack, Console Kit module, preset, and full-console roots. Every fixture
is typechecked and compiles its Tailwind CSS. The package-backed cases use a
local read-only npm registry and verify the installed feature-pack sidecars,
the console's Zustand store slices, and the Data/Sheets runtime dependencies.
All cases reject
`tw-animate-css`, registry-internal paths, and obsolete generated-SDK sidecars;
source-installed UI files must not retain `@constructive-io/ui` imports.

The Pages workflow publishes the generated JSON beside the static Blocks site
at `https://constructive-io.github.io/blocks/`. It never publishes npm
packages; npm releases are performed manually by a maintainer.

## Architecture

```text
packages/ui/registry.json ─────────────┐
packages/sheets/registry.json ─────────┤
packages/schema-builder/registry.json ─┼─> apps/registry/scripts/build.ts
apps/blocks/registry.json ──────────────┘          │
                                                  ├─> registry.json (ignored)
                                                  └─> public/r/*.json (ignored)
```

Generated staging and output directories are build artifacts. Edit only the
canonical source manifests and their source trees.
