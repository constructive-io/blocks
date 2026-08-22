# json-schema-to-blocks

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

Lower a JSON Schema into a [`blocks-schema`](../blocks-schema) UI document: any
schema-described value gets a form with no hand-authored JSON. Pure functions,
no React — usable in servers, workers, and agents.

## Install

```bash
pnpm add json-schema-to-blocks blocks-schema
```

Built with `makage` and published from `dist`, so deep imports resolve without
an exports map:

```ts
import { schemaToDocument } from 'json-schema-to-blocks';
import { defaultWidgetRules } from 'json-schema-to-blocks/rules';
```

## Usage

```ts
import { schemaToDocument } from 'json-schema-to-blocks';

const document = schemaToDocument({
  $id: 'invite-user',
  title: 'Invite user',
  type: 'object',
  required: ['email'],
  properties: {
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['viewer', 'editor', 'admin'] },
    notes: { type: 'string' },
  },
});
```

The result is an ordinary `UIDocument` — persist it, render it with
`blocks-renderer`, hand-edit it in the form builder, or layer overrides on it
with `composeDocument`.

## Lowering rules

| Schema | Node |
|--------|------|
| `properties` | `Section` per nested object, widget node per leaf, field `name` is the dot path |
| `required`, `minLength`, `maxLength`, `pattern`, `minimum`/`maximum`, `exclusiveMinimum`/`exclusiveMaximum` | `props.required` and `props.constraints` |
| `enum` | `RadioGroup` (≤ 3 values) or `Select`, with `props.options` |
| `boolean` | `Switch` |
| `number` / `integer` | `NumberInput` (`multipleOf` → `step`) |
| `string` + `format` | `DatePicker`, `DateTimePicker`, `TimePicker`, `PhoneInput`, `MarkdownEditor`, `CodeEditor`, `JsonEditor`, `FileUpload`, or `Input` with an `inputType` |
| `string` (unbounded or long `maxLength`) | `Textarea` |
| `array` | repeatable `Section` holding the item's nodes (`minItems`/`maxItems` carried through) |
| `oneOf` / `anyOf` | `Tabs` with one `Tab` per variant |
| `allOf` | flattened into the parent group |
| `$ref` (local) | resolved against `$defs`/`definitions`; unresolved refs lower to `JsonEditor` |
| `title`, `description`, `default`, `const`, `readOnly` | `label`, `description`, `defaultValue`, `disabled` |

## Composability

Widget selection is an ordered rule list, so an app prepends rules rather than
forking the converter — the first match wins:

```ts
import { schemaToDocument } from 'json-schema-to-blocks';

const document = schemaToDocument(schema, {
  rules: [
    {
      name: 'rich-text',
      match: (ctx) => ctx.type === 'string' && ctx.schema.format === 'html',
      node: 'MarkdownEditor',
    },
  ],
});
```

Pass `replaceDefaultRules: true` to drop the defaults entirely. Per-field
overrides live inline in the schema under `x-ui`:

```json
{
  "type": "string",
  "x-ui": { "widget": "CodeEditor", "label": "Query", "order": 1, "props": { "language": "sql" } }
}
```

`meta-to-blocks` (`_meta` → document) shares this rule/annotation shape, so a
widget preference set once applies to both database-derived and
schema-derived forms.

## Options

| Option | Default | Purpose |
|--------|---------|---------|
| `id` | schema `$id` or `'document'` | Document id |
| `rules` | — | Rules tried before the defaults |
| `replaceDefaultRules` | `false` | Use only the supplied rules |
| `form` | `true` | Wrap fields in a `Form` node |
| `submitLabel` | — | `Form` submit label |
| `rootKey` | `'page'` | Root node key |
| `includeReadOnly` | `true` | Emit `readOnly` properties as disabled fields |

## API

```ts
schemaToDocument(schema, options?) // → UIDocument
schemaToNodes(schema, options?)    // → UINode[] (no envelope)
defaultWidgetRules                 // the ordered default rule list
toConstraints(schema)              // validation keywords → UINodeConstraints
createResolver(root)               // local $ref resolution
mergeAllOf(schema, resolve)        // allOf flattening
```
