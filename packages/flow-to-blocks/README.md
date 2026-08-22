# flow-to-blocks

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/blocks/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/blocks/actions/workflows/ci.yml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/blocks/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/flow-to-blocks"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/blocks?filename=packages%2Fflow-to-blocks%2Fpackage.json"/></a>
</p>

Evaluate a flow-based-programming graph into a
[`blocks-schema`](../blocks-schema) UI document. Where
[`json-schema-to-blocks`](../json-schema-to-blocks) and
[`meta-to-blocks`](../meta-to-blocks) lower a static description, a flow
*computes* the document: props come from upstream nodes, children can be
generated, and re-evaluating on new data yields a new plain document for the
renderer to diff. No expression language lives in the document itself. Pure
functions, no React.

## Install

```bash
pnpm add flow-to-blocks blocks-schema
```

Built with `makage` and published from `dist`, so deep imports resolve without
an exports map:

```ts
import { flowToDocument } from 'flow-to-blocks';
import { uiNodeDefinitions } from 'flow-to-blocks/definitions';
```

## Usage

```ts
import { flowToDocument } from 'flow-to-blocks';

const document = await flowToDocument(graph, {
  inputs: { schema: taskInputSchema },
  props: { locale: 'en' }
});
```

`graph` is an [`@fbp/types`](https://www.npmjs.com/package/@fbp/types) graph.
Element nodes are contributed by this package, so a graph author composes them
with ordinary data nodes:

```
graphInput(schema) ──▶ ui:FromJsonSchema ──▶ ui:Form ──▶ graphOutput
```

The evaluator is lazy: only the nodes the requested output depends on run, so a
graph describing many screens costs one screen to render.

## Element nodes

| Node | Purpose |
| --- | --- |
| `ui:Page`, `ui:Form`, `ui:Grid`, `ui:Section`, `ui:Tabs`, … | Containers; `children` is a multi input, one slot per edge |
| `ui:Input`, `ui:Select`, `ui:Textarea`, `ui:DatePicker`, … | Field nodes, with the field props `blocks-schema` defines |
| `ui:DataTable`, `ui:Markdown`, `ui:Chart`, `ui:Button`, … | Screen-level blocks |
| `ui:Node` | Any node type, including one a host registry adds |
| `ui:Document` | Wrap a page in the document envelope, naming it and attaching metadata |
| `ui:FromJsonSchema` | Lower a JSON Schema arriving on a wire into field nodes |

Container and field lists are generated from the node types `blocks-schema`
exports, so the palette cannot drift from the document format.

Every element node accepts a `props` input, so any prop can be computed rather
than authored — that is what makes the document dynamic:

```
demo:rows ──▶ (props) ui:DataTable ──▶ graphOutput
```

`bindings` and `actions` are accepted as objects or JSON strings, since a graph
editor's prop field hands over text.

## Host node definitions

Data nodes come from the caller, so a flow can read whatever the host can read:

```ts
await flowToDocument(graph, { definitions: [...defaultDataDefinitions, myRowsDef] });
```

`defaultDataDefinitions` is the evaluator's `coreDefinitions` +
`mathDefinitions` (literals, `json:select`, `flow:branch`, arithmetic); passing
`definitions` replaces it, and element nodes are always included.

## Output

The graph's `graphOutput` may carry either an element or a whole document —
`flowToDocument` wraps the former and passes the latter through, applying
`documentId`/`meta` overrides. A flow whose output is neither raises rather than
producing a half-valid document, and duplicate node keys (the symptom of one
flow node feeding two parents) are rejected by key.

## API

```ts
flowToDocument(graph, options?): Promise<UIDocument>
flowToNode(graph, options?): Promise<UINode>
evaluateFlow(graph, options?): Promise<unknown>
uiNodeDefinitions: NodeDefinitionWithImpl[]
defaultDataDefinitions: NodeDefinitionWithImpl[]
buildElement({ type, inputs, props }): UINode
isElement(value): value is UINode
assertUniqueKeys(page): void
```

`options`: `definitions`, `outputNode`, `outputPort`, `inputs`, `props`,
`documentId`, `meta`.

## License

MIT — see the repository [LICENSE](../../LICENSE).
