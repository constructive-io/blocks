# Constructive shadcn registry

The public `@constructive` registry is built from two canonical sources:

- `packages/ui` provides the Constructive primitives, app bar, and app shell.
- `apps/blocks` provides billing blocks, provider-neutral feature packs, optional Console Kit modules, preset roots, and `console-kit-nextjs`.

`packages/schema-builder` remains an npm package for platform-operator tooling,
but it is deliberately absent from this application-database registry. The
aggregator validates unique names and install targets, exact feature-pack and
preset roots, and every feature-pack dependency profile without relying on a
fragile whole-registry item count.

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
pnpm dlx shadcn@4.13.1 add @constructive/console-kit-nextjs
pnpm dlx shadcn@4.13.1 add @constructive/preset-b2b-storage
pnpm dlx shadcn@4.13.1 add @constructive/console-module-users
pnpm dlx shadcn@4.13.1 add @constructive/feature-pack-users
pnpm dlx shadcn@4.13.1 add @constructive/app-shell
pnpm dlx shadcn@4.13.1 add @constructive/billing-settings-page
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

The registry requires shadcn 4.13.1 or newer. Standalone UI and billing roots
copy their primitives and theme into the consumer without an npm package. Data
feature packs, presets that include data, and `console-kit-nextjs` are
package-backed installs: they add `@constructive-io/data`,
`@constructive-io/sheets`, and their runtime dependencies. The console also
adds Zustand for its local navigation, runtime, and adapter store.

After configuring the `@constructive` namespace above, a root item may also be
installed directly by URL. The namespace configuration remains required so
shadcn can resolve nested `@constructive/*` dependencies:

```bash
pnpm dlx shadcn@4.13.1 add https://constructive-io.github.io/blocks/r/console-kit-nextjs.json
```

## Build and validate

```bash
pnpm --filter @constructive-io/registry build
pnpm --filter @constructive-io/registry smoke:install
pnpm --filter @constructive-io/registry clean
```

The build first generates the UI registry, copies it together with the
canonical app block sources into an ignored staging directory, merges both
manifests, namespaces internal dependencies, and runs `shadcn build` into
`apps/registry/public/r`.

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
packages/ui/registry.json ─┐
                          ├─> apps/registry/scripts/build.ts
apps/blocks/registry.json ─┘          │
                                     ├─> registry.json (ignored)
                                     └─> public/r/*.json (ignored)
```

Generated staging and output directories are build artifacts. Edit only the
two canonical source manifests and their source trees.
