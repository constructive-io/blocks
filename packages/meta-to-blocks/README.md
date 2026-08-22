# meta-to-blocks

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/blocks/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/blocks/actions/workflows/ci.yml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/blocks/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/meta-to-blocks"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/blocks?filename=packages%2Fmeta-to-blocks%2Fpackage.json"/></a>
</p>

Lower Constructive `_meta` database metadata into
[`blocks-schema`](../blocks-schema) UI documents: generated form, list, and
detail screens with no hand-authored JSON. Columns lower through JSON Schema, so
this shares the widget-rule pipeline with
[`json-schema-to-blocks`](../json-schema-to-blocks). Pure functions, no React.

## Install

```bash
pnpm add meta-to-blocks blocks-schema
```

Built with `makage` and published from `dist`, so deep imports resolve without
an exports map:

```ts
import { tableToFormDocument } from 'meta-to-blocks';
import { tableToSchema } from 'meta-to-blocks/schema';
```

## Usage

```ts
import { tableToFormDocument, tableToListDocument, tableToDetailDocument } from 'meta-to-blocks';

const form = tableToFormDocument(table); // Page > Form > field nodes
const list = tableToListDocument(table); // Page > DataTable
const detail = tableToDetailDocument(table); // Page > DetailPanel > RelationList*
```

Create forms omit the columns the database fills in (primary keys, audit
timestamps); `mode: 'update'` includes them and disables the primary key.

## Customization

```ts
tableToFormDocument(table, {
  title: 'New post',
  mode: 'create',
  omitFields: ['search_vector'],
  fieldOrder: ['title', 'body'],
  fields: {
    body: { widget: 'MarkdownEditor', label: 'Post body' },
    author_id: { description: 'Who wrote it' }
  },
  rules: [(schema) => (schema.format === 'uuid' ? { type: 'Input' } : undefined)]
});
```

Custom `rules` run ahead of the JSON Schema defaults unless
`replaceDefaultRules` is set.

## Lowering

| `_meta` | Result |
| --- | --- |
| Scalar encoding, then Postgres type, then GraphQL scalar | JSON Schema type/format, most specific source first |
| `enumValues` | `enum`, so a small set lowers to `RadioGroup` and a larger one to `Select` |
| `character varying(n)` | `maxLength: n` |
| `isNotNull && !hasDefault` | required field |
| nullable column | type union with `null` |
| array column | repeatable `Section` |
| foreign key | `Select` with `relation` props, labelled without the id suffix |
| `hasMany` / `manyToMany` relation | `RelationList` on the detail screen |

## API

```ts
tableToFormDocument(table, options?): UIDocument
tableToListDocument(table, options?): UIDocument
tableToDetailDocument(table, options?): UIDocument
tableToNodes(table, options?): UINode[]
tableToSchema(table, options?): JSONSchema
fieldToSchema(table, field, override?): JSONSchema
typeToSchema(type): JSONSchema
selectFields(table, options?): MetaField[]
isSystemField(field): boolean
titleize(name): string
```

## License

MIT — see the repository [LICENSE](../../LICENSE).
