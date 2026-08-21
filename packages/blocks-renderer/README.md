# blocks-renderer

React adapter for `blocks-schema` UI documents: a recursive
renderer with layerable widget registries, binding resolution, form state, and
a visible unknown-block fallback.

## Usage

```tsx
import { DocumentRenderer, composeRegistry } from 'blocks-renderer';

const registry = composeRegistry(
  baseRegistry,        // shadcn-style primitives
  appRegistry,         // app-specific blocks
  documentOverrides,   // per-document swaps
);

<DocumentRenderer
  document={document}
  registry={registry}
  scope={{ row, user }}
  initialValues={{ title: 'Draft' }}
  onSubmit={(values) => save(values)}
  onAction={(action, event) => runFlow(action)}
/>;
```

## Concepts

- **Registry layering** — `composeRegistry(...layers)` merges
  `type → component` maps left-to-right, later layers winning. Hosts customize
  widgets (inputs, textareas, rich text, custom blocks) by layering, never by
  forking the renderer.
- **Blocks** — every component receives `{ node, props, children }`, where
  `props` has the node's `bindings` resolved against the current scope and
  `children` are already rendered.
- **Bindings** — `{{ path.to.value }}` templates resolve against
  `scope + values`; a lone placeholder yields the raw value, mixed text
  interpolates.
- **Fields** — widget implementations call `useBlockField(name)` for
  value/error wiring; constraints from the document (`required`, length,
  range, `pattern`) validate on change and on submit.
- **Unknown blocks** — unregistered node types render `UnknownBlock`, a
  visible gap instead of a crash, so documents can name blocks a host has not
  installed.
