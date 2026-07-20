# Constructive shadcn registry

The public `@constructive` registry is built from three canonical sources in
this repository:

- `packages/ui`: UI primitives distributed through both npm and shadcn.
- `packages/schema-builder`: the seven-part schema-builder family, also
  distributed through npm and shadcn.
- `apps/blocks`: application blocks, runtime helpers, flows, and the chat
  widget distributed as source through shadcn.

The aggregator rejects duplicate item names, duplicate install targets, missing
source files, and any combined item count other than 157.

## Configure and install

Add the namespace to a consumer's `components.json`:

```json
{
  "registries": {
    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"
  }
}
```

Then install any item by name:

```bash
pnpm dlx shadcn@4.13.1 add @constructive/button
pnpm dlx shadcn@4.13.1 add @constructive/auth-sign-in-card
pnpm dlx shadcn@4.13.1 add @constructive/chat
pnpm dlx shadcn@4.13.1 add @constructive/schema-builder
```

The registry requires shadcn 4.13.1 or newer. Registry installs copy the UI
primitives and theme into the consumer; `@constructive-io/ui` is not an npm
prerequisite.

After configuring the `@constructive` namespace above, a root item may also be
installed directly by URL. The namespace configuration remains required so
shadcn can resolve that item's nested `@constructive/*` dependencies:

```bash
pnpm dlx shadcn@4.13.1 add https://constructive-io.github.io/blocks/r/button.json
```

## Build and validate

```bash
pnpm --filter @constructive-io/registry build
pnpm --filter @constructive-io/registry smoke:install
pnpm --filter @constructive-io/registry clean
```

The build first runs each public package's `build:registry` script, copies the
generated sources plus the verbatim app block sources into an ignored staging
directory, merges all manifests, namespaces internal dependencies, and runs
`shadcn build` into `apps/registry/public/r`.

The smoke command performs package-free isolated installs of a primitive, an
overlay, a custom-alias stack, an auth block, a schema-builder leaf, and the
complete schema-builder. Every fixture typechecks and compiles its Tailwind CSS;
the command rejects any installed `@constructive-io/ui` or `tw-animate-css`
reference.

The Pages workflow publishes the generated JSON beside the static Blocks site
at `https://constructive-io.github.io/blocks/`. It never publishes npm
packages; npm releases are performed manually by a maintainer.

## Architecture

```text
packages/ui/registry.json ─────────────┐
packages/schema-builder/registry.json ├─> apps/registry/scripts/build.ts
apps/blocks/registry.json ─────────────┘          │
                                                  ├─> registry.json (ignored)
                                                  └─> public/r/*.json (ignored)
```

Generated staging and output directories are build artifacts. Edit only the
three canonical source manifests and their source trees.
