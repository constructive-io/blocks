# @constructive-io/blocks-ui

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/blocks/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/blocks/actions/workflows/ci.yml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/blocks/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/blocks-ui"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/blocks?filename=packages%2Fblocks-ui%2Fpackage.json"/></a>
</p>

The default widget registry for [`blocks-renderer`](../blocks-renderer): every
Constructive document node type wired to a `@constructive-io/ui` component.

`blocks-renderer` walks a `UIDocument` and asks a registry "what renders a
`Select`?". This package answers that question so a generated document renders
without any host wiring — and, because it is a plain `type → component` map, it
doubles as the worked example for writing your own.

```bash
pnpm add @constructive-io/blocks-ui
```

```tsx
'use client';

import { DocumentRenderer } from 'blocks-renderer';
import { defaultBlockRegistry } from '@constructive-io/blocks-ui';
import { schemaToDocument } from 'json-schema-to-blocks';

const document = schemaToDocument({
  type: 'object',
  required: ['title'],
  properties: {
    title: { type: 'string', maxLength: 120 },
    status: { type: 'string', enum: ['draft', 'review', 'live'] },
    featured: { type: 'boolean' }
  }
});

export function PostForm() {
  return (
    <DocumentRenderer
      document={document}
      registry={defaultBlockRegistry}
      onSubmit={(values) => console.log(values)}
    />
  );
}
```

## Replacing components

The registry is data, so layer over it instead of forking it. `composeRegistry`
applies the later registry on top, type by type:

```tsx
import { composeRegistry } from 'blocks-renderer';
import { defaultBlockRegistry } from '@constructive-io/blocks-ui';

const registry = composeRegistry(defaultBlockRegistry, {
  Select: MyCombobox,
  DataTable: MyDataTable
});
```

Take a subset if the page chrome is yours: `widgetRegistry` (the form
controls), `containerRegistry` (`Page`, `Form`, `Section`, `Grid`, `Tabs`), and
`blockRegistry` (`Button`, `ActionBar`, `Markdown`, `StatCard`, `Nav`,
`NavGroup`, `NavLink`) are exported separately.

Writing an adapter from scratch needs nothing from this package — a registry is
`Record<string, ComponentType<BlockProps>>`. `useNodeField` and `FieldShell` are
exported for reuse, and reading them is the fastest way to see how a node's
`name`, `required`, and `constraints` become renderer form state.

## What is intentionally not registered

`DataTable`, `DetailPanel`, `RelationList`, `Chart`, and `AgentChat` need a
query runtime and a data source, so they are left out and fall back to the
renderer's visible unknown-node placeholder. Register them with your own
data-bound components (for example against `@constructive-io/data`).

`CodeEditor`, `MarkdownEditor`, and `JsonEditor` render as a monospace textarea:
a real editor is a heavy dependency, so it belongs in the host that wants it.
`FileUpload` records the selected file name only — the byte upload needs your
storage adapter.

## Navigation

`Nav`, `NavGroup`, and `NavLink` render the navigation documents
`meta-to-blocks`' `metaToNavDocument` lowers from `_meta`, so a console sidebar
follows the database rather than a hand-maintained route list:

```tsx
<DocumentRenderer
  document={metaToNavDocument(meta.tables)}
  registry={defaultBlockRegistry}
  scope={{ pathname }}
/>
```

A link is a plain anchor, and the current one is whichever `href` matches
`scope.pathname`. Give a node a `click` action (or override `NavLink` with your
framework's `Link`) to keep client-side routing.

## Form state

Widgets own no state. Each one reads and writes the `DocumentRenderer` context
through `useBlockField`, so validation, defaults, and submission stay with the
renderer and the document's declared constraints:

```tsx
export function MyInput({ props }: BlockProps) {
  const field = useNodeField(props);

  return (
    <FieldShell props={props} id={field.id} error={field.error}>
      <input
        id={field.id}
        value={String(field.value ?? '')}
        onChange={(event) => field.setValue(event.target.value)}
        disabled={field.disabled}
      />
    </FieldShell>
  );
}
```

## License

MIT
