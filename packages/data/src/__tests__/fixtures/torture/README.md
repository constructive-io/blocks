# Sheets torture fixtures

Real `_meta`, introspection and row output from one API schema (`sheets_torture`) that holds every column, key, relation and upload shape, served by the Constructive preset (`ConstructivePreset` from `graphile-settings`, PostgreSQL 18 from `constructiveio/postgres-plus:18`).

| File | What it holds |
|---|---|
| `torture-meta.baseline.json` | `{ query, data }`: `_meta` with every field of every Meta type selected, from the plugin before the Sheets additions (an older server). It was captured from the seed before the final round, so it has no `on hold`, `needs-review` or `path_list`: the baseline server cannot build a schema with those labels. |
| `torture-meta.v2.json` | Same, after the additions (`kind`, `description`, `refKeys`, `remoteKeys`, `isComputed`, `file`, `maxLength`/`precision`/`scale`, populated `srid`/`dimensions`). The selection is built from the Meta types, so it includes the new fields. |
| `torture-introspection.json` | `{ data }`: the full `getIntrospectionQuery()` result with the additions (v2 server). Table, input and enum types are identical to the baseline; only the Meta types gained fields and `MetaFileField`. |
| `torture-introspection.baseline.json` | The same introspection from the baseline server, for testing the older-server path. |
| `torture-rows.json` | Per table: `{ table, query, data, errors }`. `query` is the list query with every column and a hand-written sub-selection for each object type; `data` is the first 5 rows as served. The `_meta` additions don't change it (only `now()` timestamps differ between captures). |
| `torture-schema.sql` | A copy of the seed (`graphile/graphile-settings/sql/sheets-torture-seed.sql`). |

## The additions, with real values from `torture-meta.v2.json`

| Field | Example |
|---|---|
| `MetaTable.kind: String!` | `OpenTask.kind = "view"`, every other table `"table"` |
| `MetaTable.description: String` | `OpenTask.description = "Tasks that are not done yet"`; `TaskLabel.description = null` (its comment is only a smart tag) |
| `MetaBelongsToRelation.refKeys: [MetaField!]!` | `Task.warehouseItem`: `keys [warehouseCode, sku]`, `refKeys [warehouseCode, sku]`; `Task.personByAssigneeEmail`: `keys [assigneeEmail]`, `refKeys [email]` |
| `MetaHasRelation.remoteKeys: [MetaField!]!` | `Person.ownedProjects`: `keys [id]`, `remoteKeys [ownerId]`; `Person.reviewedProjects`: `remoteKeys [reviewerId]`; `Person.personProfile` (hasOne): `remoteKeys [personId]` |
| `MetaField.isComputed: Boolean` | `GeneratedValue.total` (stored generated) and `GeneratedValue.id` (identity ALWAYS) are `true`; `serialNo` (identity BY DEFAULT), `createdAt` (`now()`) and every other field are `false`. Null on nested fields. |
| `MetaField.file: MetaFileField` | `DomainKind.gallery.file = { kind: "upload", isMultiple: true, filesType: "AppFile" }`; `avatar` is `image`, `attachmentLink` is `attachment`; `contactEmail.file = null` |
| `MetaType.maxLength / precision / scale: Int` | `ScalarKind.varcharValue.type.maxLength = 40`, `charValue 3`, `bitValue 8`; `numericBounded { precision: 12, scale: 4 }`; `ArrayKind.shortCodeList.maxLength = 5` (per item); unbounded columns `null` |
| `MetaScalarEncoding.srid / dimensions` | `StructuredKind.pin.type.encoding.srid = 4326`, `outline.srid = null` (no SRID declared); `embedding.dimensions = 3`, `anyEmbedding.dimensions = null` |

A client should treat each addition as optional: detect it by the field list of its Meta type (`MetaTable`, `MetaBelongsToRelation`, `MetaHasRelation`, `MetaField`, `MetaType`) and fall back when it is missing, as `torture-meta.baseline.json` shows.

## How to regenerate

In the constructive worktree (`feat/meta-sheets-fields`), with a PostgreSQL that has postgis, vector, ltree and citext, and the test roles bootstrapped (`pgpm admin-users bootstrap --client` and `pgpm admin-users add --test`, as CI does):

```bash
cd graphile/graphile-settings
PGHOST=localhost PGPORT=<port> PGUSER=postgres PGPASSWORD=password \
SHEETS_META_FIXTURES_DIR=<this directory> SHEETS_META_FIXTURES_LABEL=v2 \
pnpm exec jest __tests__/meta-sheets-torture.integration.test.ts
```

`SHEETS_META_FIXTURES_LABEL` names the `_meta` file (`torture-meta.<label>.json`, default `latest`). `torture-introspection.json`, `torture-rows.json` and `torture-schema.sql` are overwritten on every capture; `torture-introspection.baseline.json` was copied by hand before the v2 capture. Without `SHEETS_META_FIXTURES_DIR` the test writes nothing.

## What each table demonstrates

| Table (GraphQL type) | Demonstrates |
|---|---|
| `scalar_kinds` (`ScalarKind`) | One column per plain type: text, citext, varchar(40), char(3), nullable and required boolean, smallint, integer, bigint, numeric(12,4), unbounded numeric, real, double, money, uuid, date, time, timetz, timestamp, timestamptz, interval, json, jsonb, bytea, inet, cidr, macaddr, bit(8), varbit(16), tsvector, ltree. Rows: typical, extremes (bigint max, 60-digit numeric, money min, year 0001), all nulls. uuid key with a default. |
| `array_kinds` (`ArrayKind`) | text[], int[], uuid[], date[], numeric(10,2)[], varchar(5)[], enum[], ltree[] (`path_list`, served dotted). Rows with a comma and quotes in elements, empty arrays, null elements, null arrays. serial `id` key. |
| `structured_kinds` (`StructuredKind`) | Composite type, int4range, tstzrange, daterange, native point, geometry without and with subtype/SRID (`Point, 4326`, `Polygon` without SRID), geography with and without subtype, vector(3), vector without dimensions. Identity `id` key. Includes an empty range and an unbounded range. |
| `domain_kinds` (`DomainKind`) | The Constructive domains from `public`: email, url, hostname, origin, image, upload, upload[], attachment, with the real `@name` tags. |
| `generated_values` (`GeneratedValue`) | Identity ALWAYS key, identity BY DEFAULT, constant default, stored generated column, `now()` default, a column that cannot be set on create, one that cannot be changed on update, one hidden from the API. |
| `countries` (`Country`) | Single key not named `id` (`iso_code char(2)`), with no default. |
| `warehouse_items` (`WarehouseItem`) | Composite key (`warehouse_code`, `sku`); target of a composite foreign key. |
| `audit_events` (`AuditEvent`) | No primary key (duplicate rows exist). |
| `people` (`Person`) | Self reference (`manager_id`), a unique non-key column (`email`) that another table references, target of two foreign keys from `projects`. |
| `person_profiles` (`PersonProfile`) | hasOne: its key is its foreign key to `people`. Has an `image` column. |
| `projects` (`Project`) | Two foreign keys to `people` (required `owner_id`, optional `reviewer_id`), a foreign key to a char(2) key. |
| `tasks` (`Task`) | Foreign key to a unique non-key column (`assignee_email` → `people.email`, deliberately not indexed), composite foreign key, enum (required and optional; labels include `on hold` and `needs-review`), text column with a fixed list of values. |
| `labels`, `task_labels` (`Label`, `TaskLabel`) | Pure junction (key = both foreign keys), many-to-many enabled. |
| `project_members` (`ProjectMember`) | Junction with extra required columns (`role`, `joined_on`), many-to-many enabled. |
| `open_tasks` (`OpenTask`) | A view (no key). |
| `app_buckets`, `app_files` (`AppBucket`, `AppFile`) | Storage pair tagged like the storage module, so `MetaStorage` and the upload mutations appear. |
| `special_values` (`SpecialValue`) | NaN and ±Infinity in real, double and numeric; `infinity` timestamptz; `-infinity` date. |

## Surprises (what the frontend must not assume)

Schema-level

1. **Fixed in the final round: an enum label with a space or a dash used to break the whole API.** The schema build threw (`Enum type 'TaskStatus' attempted to define a value with invalid name "IN PROGRESS"`). Now each run of characters outside `[A-Za-z0-9_]` becomes `_`: `on hold` is `ON_HOLD`, `needs-review` is `NEEDS_REVIEW`. Every name that was valid before is unchanged (`IN_PROGRESS`, `DONE_ISH`, `_1ST_REVIEW`, `BLOCKED`). See `../backend-meta-final.md` for the full naming rule.
2. **Backward relations need an index.** A hasOne/hasMany is only served when the foreign key columns on the related table are in some index. `tasks.assignee_email` has none, so `Person` has no relation back to `Task`. The forward `Task.personByAssigneeEmail` is still there. `_meta` agrees with the schema (it reports only served relations).
3. **A stored generated column is in the create and patch inputs.** `GeneratedValue.total` has `isWritableOnCreate: true` and `isWritableOnUpdate: true` because PostGraphile puts it in both inputs, but the database rejects any value but DEFAULT (`cannot insert a non-DEFAULT value into column "total"`). Only identity ALWAYS columns are left out of the inputs. The update is rejected too (`column "total" can only be updated to DEFAULT`). The baseline has nothing that marks such a column besides `hasDefault: true`; v2 adds `isComputed: true`, and a grid must not offer an editor when it is set.
4. **A simple view has a create mutation** (`createOpenTask`) but no update or delete (no key). Its fields are all nullable and all `isWritableOnCreate: true`.
5. **`query.one` is null for every table.** Read one row with the list field and a key filter.
6. **hasMany `keys` are this table's columns** (`Person.ownedProjects.keys = [id]`), so with two foreign keys to the same table (`ownedProjects`, `reviewedProjects`) the baseline cannot say which column on `Project` each one uses. v2 answers it with `remoteKeys`; against a baseline server such a relation must stay read-only.
7. **Domains in `public` keep their `@name` scalar names** (`ConstructiveInternalTypeEmail`, `...Url`, `...Image`, `...Upload`, `...Attachment`); `pgType` is the domain name (`email`, `upload`), and `upload[]` is `uploadArray` with `gqlType: ConstructiveInternalTypeUpload`, `isArray: true`.
8. **Geometry columns are typed by interface**, `GeometryInterface` / `GeographyInterface`, whatever the declared subtype. The concrete type comes back in `__typename` (`GeometryPoint`, `GeographyLineString`, ...). Select `{ __typename geojson srid }`.

Wire shapes (see `torture-rows.json`)

9. **bigint and numeric are strings**, exact to the last digit (`"9007199254740993"`, 60-digit numerics). numeric `NaN`/`Infinity` come back as the strings `"NaN"`, `"Infinity"`.
10. **real and double NaN/±Infinity cannot be served.** The field is null and the response carries one error per cell (`Float cannot represent non numeric value: NaN`), path `specialValues.nodes.0.realValue`. The rest of the row is served. A grid must show partial rows and per-cell errors, not fail the page.
11. **Infinite timestamps and dates come back as null** without an error (`infinity`, `-infinity`). A null cell may not mean "no value"; writing null back would lose data.
12. **money is a Float**, so the money minimum `-92233720368547758.08` is served as `-92233720368547760`.
13. **ltree is served with slashes, but a list of paths is not.** A plain `ltree` column is served as `"/top/science/astronomy"`; an `ltree[]` column is served dotted (`["top.science", "a"]`), because the list keeps the plain codec it was built from. Fixed in the final round: `_meta` `encoding.dotPath` now follows the column (`ltreeValue` false, `pathList` true); the baseline said `true` for both.
14. **timetz is normalized to UTC** (`13:45:30+07` comes back as `06:45:30.000000+00:00`); times and timestamps carry 6 fractional digits.
15. **char(n) is padded** (`"ab "` for `char(3)`).
16. **An empty range and an unbounded range look alike.** `'empty'::daterange` is `{ start: null, end: null }`, the same as `(,)`. A closed daterange `[2024-01-01,2024-01-31]` comes back canonical: end `2024-02-01`, `inclusive: false`.
17. **bytea is base64** (`"3q2+7w=="`), **vector is a number array**, **tsvector is its text form** (`"'brown':3 'fox':4 ..."`), **interval is an object** `{ years months days hours minutes seconds }` (seconds is a Float).
18. **Composite values come back as an object** even when only one attribute is set; a null composite is null.
19. **Array columns**: empty arrays are `[]`, null elements are kept (`[null, "after null"]`), enum arrays carry GraphQL enum names.
20. **Geometry SRID**: an unconstrained geometry reports `srid: 0` on the wire; geography defaults to 4326. In the baseline `_meta`, `encoding.srid` and `encoding.dimensions` are always null; v2 fills them from the declared type (`srid` stays null when no SRID is declared, even though the wire then reports `srid: 0`).
21. **Encodings are null** for ranges, macaddr, bit/varbit, tsvector, money, json; `MetaScalarEncoding.kind` is set for bigint, numeric (also `bigint`), dates and times, interval, uuid, geometry (`geojson`), point, inet/cidr, ltree, vector, bytea, composite.
22. **Sorting**: every column in these tables has an order-by value, json included; tables with a full-text or text column also get search-score values (`TSVECTOR_VALUE_TSV_RANK_ASC`, `LABEL_TRGM_SIMILARITY_ASC`, `SEARCH_SCORE_ASC`).

## What v2 still does not tell a client

- **Generated columns** (surprise 3) still report `isWritableOnCreate/Update: true`, because those flags describe the inputs, which still contain the column. Read `isComputed` first. Against a baseline server, which has no `isComputed`, such a column looks writable and fails on save.
- **A domain's own length** (`CREATE DOMAIN code AS varchar(10)`) is not read; `maxLength` covers lengths declared on the column itself.
- **`refKeys` / `remoteKeys` are not filtered by visibility**, like `keys`: if the other table hides a key column, the name is still listed. Check that each name is a field of the target type before writing through it.
- **`file.filesType`** is the same for every file column of the API (the only files table, or null). `kind` says what the column stores: a file document for `image`/`upload`, a link for `attachment`.
