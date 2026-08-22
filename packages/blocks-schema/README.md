# blocks-schema

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

Portable JSON UI document specification for Constructive Blocks: the storage
format, runtime validators, JSON Schema export, and pure document-manipulation
API. No React — this package is safe in servers, workers, and agents.

## Install

```bash
pnpm add blocks-schema
```

The package is built with `makage` and published from `dist`, so every module is
a root-level entry point and deep imports need no exports map:

```ts
import { parseDocument } from 'blocks-schema';
import { composeDocument } from 'blocks-schema/compose';
import { validateField } from 'blocks-schema/validation';
```

## Overview

| Layer | Purpose | File |
|-------|---------|------|
| **Envelope** | `UIDocument` container (`formatVersion`, `id`, `page`) | `envelope.ts` |
| **Nodes** | Recursive `UINode` tree, known node type sets | `node.ts` |
| **Validation** | Zod parsers for documents and nodes | `zod.ts` |
| **JSON Schema** | Exported JSON Schema of the format (for agents/tooling) | `json-schema.ts` |
| **Compose** | Pure fragment/slot/override composition | `compose.ts` |
| **Fields** | Field collection helpers and constraint validation | `node.ts`, `validation.ts` |

Rendering lives in adapters — `blocks-renderer` is the React
adapter over this spec.

## Storage Schema

### Document

```json
{
  "formatVersion": "1.0",
  "type": "UISchema",
  "id": "orders-form",
  "meta": { "title": "Orders" },
  "page": { "type": "Page", "key": "page", "props": {}, "children": [] }
}
```

### Node

```typescript
interface UINode {
  type: string;        // Known block type or any registry-resolved type
  key: string;         // Unique within the document; identity for overrides
  props: UINodeProps;  // Static props (label, name, defaultValue, constraints, ...)
  children: UINode[];
  bindings?: Record<string, string>;  // prop → "{{ scope.path }}" template
  actions?: Record<string, UIAction>; // event → flow/handler action
}
```

Unknown node types are valid documents — resolution happens at render time,
and adapters must render a visible fallback rather than throw.

## Normative Rules

- `key` must be unique within a document; it is the node's identity for
  overrides, slots, and tooling.
- Documents are plain declarative JSON: no expressions beyond `{{ path }}`
  bindings, no embedded code.
- `Fragment` nodes reference reusable subtrees via `props.ref`.
- `Slot` nodes declare named insertion points via `props.name`; their children
  are the default content when no filler is supplied.
- Composition is pure and never mutates its input.

## API

```typescript
import {
  parseDocument, safeParseDocument, isUIDocument,   // validation
  toDocumentJsonSchema, toNodeJsonSchema,            // JSON Schema export
  composeDocument,                                   // fragments/slots/overrides
  collectFieldNames, collectDefaultValues,
  collectFieldConstraints, validateField,            // form helpers
  walkNodes, findNodeByKey,
} from 'blocks-schema';

const composed = composeDocument(document, {
  fragments: { address: addressSubtree },
  slots: { header: customHeaderNode },
  overrides: { title: { props: { label: 'Headline' } }, legacy: { remove: true } },
});
```
