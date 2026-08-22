# json-renderer

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/blocks/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/blocks/actions/workflows/ci.yml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/blocks/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/json-renderer"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/blocks?filename=packages%2Fjson-renderer%2Fpackage.json"/></a>
</p>

The framework-agnostic core of a declarative JSON UI document: the document
envelope and node tree, runtime validation, JSON Schema export, composition
(fragments, slots, per-node overrides, merge), binding resolution, and the
**adapter contract** a renderer implements.

No React, no component library, and no node vocabulary of its own — a document
names whatever node types its registry can satisfy. `blocks-schema` is the
Constructive vocabulary over this core, and `blocks-renderer` is its React
adapter.

## Install

```bash
pnpm add json-renderer
```

Built with `makage` and published from `dist`, so every module is a root-level
entry point and deep imports need no exports map:

```ts
import { createEnvelope, parseEnvelope } from 'json-renderer';
import { composeEnvelope } from 'json-renderer/compose';
import { resolveBinding } from 'json-renderer/bindings';
```

## Overview

| Layer | Purpose | File |
|-------|---------|------|
| **Envelope** | `DocumentEnvelope` container (`formatVersion`, `type`, `id`, `page`) | `envelope.ts` |
| **Nodes** | Recursive `DocumentNode` tree, traversal and mapping | `node.ts` |
| **Validation** | Zod schema factories for the envelope and node tree | `zod.ts` |
| **Constraints** | Framework-free field constraint checking | `constraints.ts` |
| **Fields** | Field name, default value, and constraint collection | `fields.ts` |
| **JSON Schema** | Exported JSON Schema of the format, for agents and tooling | `json-schema.ts` |
| **Compose** | Fragment expansion, slot filling, overrides, merge | `compose.ts` |
| **Bindings** | `{{ scope.path }}` resolution and scope layering | `bindings.ts` |
| **Registry** | Layered node type → handler resolution | `registry.ts` |
| **Adapter** | The interface a renderer implements | `adapter.ts` |

## Document

```json
{
  "formatVersion": "1.0",
  "type": "UISchema",
  "id": "orders-form",
  "meta": { "title": "Orders" },
  "page": { "type": "Page", "key": "page", "props": {}, "children": [] }
}
```

A node is `{ type, key, props, children, bindings?, actions? }`. `type` is any
string: unknown types are valid documents, because resolution happens at render
time and an adapter must render a visible fallback rather than throw.

`DocumentNode` and `DocumentEnvelope` are generic over the vocabulary, so a
format narrows them without redeclaring the tree:

```ts
type UINode = DocumentNode<UINodeType, UINodeProps>;
type UIDocument = DocumentEnvelope<UINode, 'UISchema', '1.0'>;
```

## Composition

```ts
const composed = composeEnvelope(document, {
  fragments: { address: addressSubtree },
  slots: { header: customHeaderNode },
  overrides: { title: { props: { label: 'Headline' } }, legacy: { remove: true } },
});
```

Composition is pure and never mutates its input. An unresolved fragment stays in
the tree so the renderer surfaces the gap. A vocabulary that spells its
indirection nodes differently configures `vocabulary` instead of forking
composition:

```ts
composeEnvelope(document, { fragments, vocabulary: { fragmentNodeType: 'include' } });
```

## Adapter contract

A renderer is generic over the handler it resolves a node type to (`THandler`)
and the output it produces (`TOutput`), and owes three answers:

1. **Registry resolution** — node type → handler, layered with `composeRegistry`
   so a host adds or replaces node types without forking the renderer.
2. **Binding scope access** — the scope a node's bindings resolve against.
3. **Unknown-node handling** — `UnknownNodePolicy`; the default is a visible
   placeholder, never a thrown render.

```ts
import type { RendererAdapter } from 'json-renderer';

const stringAdapter: RendererAdapter<(props: NodeProps) => string, string> = {
  name: 'example/string',
  resolve: (type, context) => resolveNode(context.registry, type),
  resolveProps: (node, context) => resolveNodeProps(node, context.scope),
  renderNode: (node, context) => { /* ... */ },
  renderUnknown: (node) => `<!-- unknown: ${node.type} -->`,
  renderDocument: (document, context) => { /* ... */ },
};
```

`blocks-renderer` is the reference implementation (React + shadcn); its
`reactAdapter` export states the contract its components satisfy.

## License

MIT
