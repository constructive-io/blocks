# Test suite audit

This audit removes tests that restated static structure, catalog contents, mock behavior, or visual implementation. It keeps runtime validation, security and tenancy rules, state transitions, user workflows, serialization, persistence-facing adapters, and difficult failure behavior.

## Result

- The normal test suite moved from 185 to 157 test files and from 1,491 to 1,157 cases.
- 31 test files were deleted, three focused contract files were added, and 27 existing files were rewritten or consolidated.
- 334 Vitest/Node cases and six Playwright cases were removed, for 340 fewer cases in the audited files.
- Nine obsolete snapshot, golden-data, and parity-harness artifacts were deleted.

The counts include the unchanged registry and repository script tests. Playwright is counted separately because `pnpm test` does not run it.

## Application and documentation tests

| File | Decision | Existing assertion and value | Protection and retained coverage |
| --- | --- | --- | --- |
| `apps/blocks/e2e/docs.smoke.spec.ts` | Rewrite, 4 → 1 | Enumerated every catalog page, heading, and example count. That duplicated static catalogs and coupled the test to editorial inventory. | The pages build and generated-content checks protect valid pages. The retained browser test protects the runtime 404 contract for removed and unknown routes. |
| `apps/blocks/e2e/mobile.interaction.spec.ts` | Consolidate, 5 → 2 | Checked breakpoints, CSS overflow, touch-target dimensions, and viewport geometry alongside real interactions. The geometry checks were visual-policy tests. | Retained tests complete mobile navigation and verify modal Escape dismissal plus focus restoration. Layout and target sizing remain visual-review concerns. |
| `apps/blocks/src/app/sitemap.test.ts` | Delete | Compared the sitemap with exact catalog counts and URLs. The test changed whenever documentation inventory changed. | `build:pages`, sitemap compilation, and the browser route tests protect generation and routing. No separate runtime contract was lost. |
| `apps/blocks/src/components/docs/ui-demos.test.tsx` | Delete | Matched the primitive catalog and mounted every demo without asserting a workflow. | Type checking resolves every component, `gen:check` resolves and extracts demo source, and the pages build mounts the documentation graph. |
| `apps/blocks/src/components/site/registry-shell.test.tsx` | Delete | Mounted each shell variant and asserted landmarks and documentation chrome existed. | The application build catches composition failures; focused Console Kit and documentation interaction tests protect behavior. |
| `apps/blocks/src/lib/ai-docs.test.ts` | Delete | Pinned aggregate registry metadata and import strings. | Registry generation and package builds validate these static references. |
| `apps/blocks/src/lib/base-primitives.test.ts` | Delete | Froze the exact primitive catalog, exports, registry entries, and example import paths. | TypeScript, registry generation, and package/registry builds protect resolvability. Exact editorial inventory is intentionally not a runtime test. |
| `apps/blocks/src/lib/billing-blocks.test.ts` | Delete | Froze eight block names, guidance fields, and lookup presence. | The typed catalog and pages/registry builds protect structure and resolution. Billing resource behavior remains tested below. |
| `apps/blocks/src/lib/feature-packs.test.ts` | Delete | Froze seven documentation records, summaries, registry names, and editorial fields. | Typed catalogs, registry manifests, and page generation protect static consistency. Dependency semantics remain in `catalog.test.ts`. |
| `apps/blocks/src/blocks/console-kit/constructive/constructive-console-kit.test.tsx` | Consolidate, 15 → 14 | Included a barrel/existence assertion for the selected feature pack. | Removed only that static assertion. Adapter normalization, policy enforcement, callbacks, errors, and runtime behavior remain covered. |
| `apps/blocks/src/blocks/console-kit/store/console-kit-store.test.ts` | Consolidate, 9 → 7 | Inspected initial internal object shape and revision increments. | Store transition tests retain tenant isolation, resource state, invalidation, and observable update behavior. TypeScript protects the state shape. |
| `apps/blocks/src/components/billing-showcase/billing-showcase-preview.test.tsx` | Consolidate, 8 → 4 | Mounted fixtures, checked labels/loading copy, and asserted scale/layout details in addition to actions. | Retained delegated actions, partial-failure behavior, iframe control state, and full-screen keyboard focus. |
| `apps/blocks/src/components/billing-showcase/billing-showcase-resources.test.ts` | Consolidate, 4 → 2 | Rechecked fixture completeness and all-success aggregation. | Retained runtime value validation and partial-resource failure semantics, which TypeScript cannot protect. |
| `apps/blocks/src/components/site/site-topbar.test.tsx` | Consolidate, 11 → 3 | Checked static buttons, labels, hrefs, and presentational variants. | Retained clipboard behavior, feature-pack install mapping, and suppression on unsupported paths. |
| `apps/blocks/src/feature-packs/catalog.test.ts` | Consolidate, 9 → 5 | Froze exact catalog order, defaults, and sidecar fields. | Retained dependency ordering and malformed-pack rejection. Generated registry checks protect static manifest alignment. |

## Command palette tests

| File | Decision | Existing assertion and value | Protection and retained coverage |
| --- | --- | --- | --- |
| `packages/command-palette/src/__tests__/keybinding.test.ts` | Rewrite, 32 → 5 | Enumerated many equivalent key strings and exact formatting branches. | Five table-driven contracts retain platform modifiers, editable-target rejection, modifier matching, and user-visible formatting. |
| `packages/command-palette/src/__tests__/multi-step-builder.test.ts` | Consolidate, 10 → 3 | Checked fluent-builder method presence and every intermediate property. | Retained ordered step output and runtime rejection of invalid step configurations. TypeScript protects the fluent API surface. |
| `packages/command-palette/src/__tests__/registry.test.ts` | Consolidate, 17 → 3 | Proved CRUD methods delegated to the current Map/Set implementation and counted notifications. | Retained dynamic replacement/removal and subscriber-visible changes. Registration existence is covered by bootstrap and execution tests. |

## Data tests

| File | Decision | Existing assertion and value | Protection and retained coverage |
| --- | --- | --- | --- |
| `packages/data/src/__tests__/complex-fields.test.ts` | Delete | Mocked every `custom-ast` import, then asserted that the mocks returned their own fixtures. It tested the mock instead of the adapter. | Query-builder integration tests still protect owned GraphQL output. A direct, unmocked complex-field adapter contract is a genuine remaining gap. |
| `packages/data/src/__tests__/data.types.test.ts` | Consolidate, 27 → 21 | Created typed filter objects only to assert their fields at runtime. | TypeScript and package declaration generation protect those assignments. Runtime data conversion and query behavior remain covered. |
| `packages/data/src/__tests__/mutation-input.node.test.ts` | Consolidate, 49 → 47 | Turned `PartialBy` examples into runtime property checks. | The compiler owns this generic type contract; mutation-name, identifier, and input transformation cases remain. |
| `packages/data/src/__tests__/query-builder/__tests__/meta-object.node.test.ts` | Consolidate, 2 → 1 | Snapshotted a very large complete query in addition to checking meaningful meta-type discovery. | Retained runtime meta-type discovery. Query serialization remains protected by the smaller builder snapshot suite. |
| `packages/data/src/__tests__/query-generator.test.ts` | Consolidate, 42 → 41 | Asserted only that the builder object exposed methods. | TypeScript and module resolution protect method existence; generated operation behavior and errors remain covered. |

## Schema Builder tests

| File | Decision | Existing assertion and value | Protection and retained coverage |
| --- | --- | --- | --- |
| `packages/schema-builder/src/__tests__/schema-builder-layout-motion.test.tsx` | Delete | Inspected CSS classes, motion props, crossfade decomposition, and scroll affordances. | Visual review owns layout and motion. Keyboard, drag-and-drop, route selection, and state behavior remain tested. |
| `packages/schema-builder/src/schema/schema-builder-policies/components/tables/create-table-card.test.tsx` | Delete | Mocked callback refs and counted scroll-listener allocation and cleanup for a shadow effect. | This was an internal implementation test for visual polish. Browser lifecycle and Strict Mode remain exercised by integration builds and higher-level component tests. |
| `packages/schema-builder/src/__tests__/schema-builder-render.test.tsx` | Rewrite, 3 → 1 | Included mount-without-crashing and static copy checks. | Retained cross-database scope rejection, which is an observable tenancy boundary. |
| `packages/schema-builder/src/__tests__/schema-builder-selectors.test.tsx` | Consolidate, 3 → 2 | Counted selector identities and rerenders caused by the current store decomposition. | Retained the host-data boundary and clearing an invalid user selection. |

## Sheets tests

| File | Decision | Existing assertion and value | Protection and retained coverage |
| --- | --- | --- | --- |
| `packages/sheets/src/cell-model/__tests__/kind-parity.test-d.ts` | Delete | Proved an internal migration type was assignable to its predecessor. | Package type checking and declaration generation protect the current type graph; the removed predecessor is not a public contract. |
| `packages/sheets/src/cell-model/__tests__/create-sheets-cell.test.ts` | Add focused contract | Replaces broad parity and registry fixtures with owned transformation behavior. | Protects email normalization, relation label/overflow rules, and suppression of draft placeholder IDs. |
| `packages/sheets/src/cell-model/views/__tests__/geometry-view.test.tsx` | Delete | Checked icons, abbreviated labels, and empty visual output. | Cell-type resolution remains covered; iconography and labels are visual presentation. |
| `packages/sheets/src/cell-model/views/__tests__/image-view.test.tsx` | Delete | Checked wrappers, CSS classes, placeholders, and every thumbnail/file-chip presentation branch. | Image editor upload behavior remains covered. Presentational rendering moves to Storybook/visual review. |
| `packages/sheets/src/cell-model/views/__tests__/loading-view.test.tsx` | Delete | Checked skeleton markup, animation class, and absence of text. | Loading-state functionality remains in the grid loading-skeleton test; shimmer styling is visual. |
| `packages/sheets/src/cell-model/views/__tests__/relation-view.test.tsx` | Delete | Checked badge and chip markup for four display variants. | The new cell contract test protects relation data semantics; relation-editor tests protect user behavior. Badge layout remains visual. |
| `packages/sheets/src/cell-model/views/__tests__/draft-action-view.test.tsx` | Consolidate, 7 → 4 | Included default label, static rendering, and no-handler checks. | Retained submit, saving, error/retry, and disabled-action behavior. |
| `packages/sheets/src/cell-types/__tests__/registry-sheetscell.test.ts` | Delete | Proved registered functions/components were returned and missing keys returned `undefined`. | The dynamic customization seam, registry gating, cell routing, and real DOM host tests protect registry behavior without restating Map lookups. |
| `packages/sheets/src/commands/__tests__/default-commands.test.ts` | Delete | Asserted exact mock calls for thin default-command delegates. | Pure selection/navigation helpers, command dispatch, keymaps, clipboard, fill, undo, and editor workflow tests protect the underlying behavior. |
| `packages/sheets/src/commands/__tests__/keymap.test.ts` | Consolidate, 15 → 14 | Froze the full default keymap object. | Retained meaningful key matching and platform behavior; static keymap shape is visible in code and exercised through dispatch. |
| `packages/sheets/src/commands/__tests__/registry.test.ts` | Consolidate, 4 → 3 | Included one test that only proved default command IDs were registered. | Retained dynamic override and isolation behavior; bootstrap/build protects static registration. |
| `packages/sheets/src/grid-dom/__tests__/sheets-dom.parity.test.tsx` | Delete | Compared every rendered fixture cell with a frozen migration golden. | Focused DOM interaction and render-safety tests remain. The removed comparison described the retired implementation rather than the current public contract. |
| `packages/sheets/src/grid-dom/__tests__/sheets-dom.smoke.test.tsx` | Delete | Asserted that a hand-fed grid rendered cells and no canvas. | Real editor, active-cell, virtualization, and render-safety tests already cross the same DOM boundary with meaningful behavior. |
| `packages/sheets/src/grid-dom/editors/__tests__/edit-intent.test.ts` | Rewrite, 23 → 3 | Enumerated every cell type and mirrored the routing table. | Three contracts retain family routing, readonly rejection, and explicit registry override precedence. |
| `packages/sheets/src/grid/__golden__/cell-display.sheets.parity.test.ts` | Delete | Compared all factory projections with frozen migration output. | Focused factory semantics and live editor tests protect owned behavior. Static family coverage is handled by TypeScript and the registry build. |
| `packages/sheets/src/grid/__golden__/coverage.meta.test.ts` | Delete | Tested whether the test fixtures covered every union member and branch. | This was coverage of the harness, not product behavior. TypeScript checks the cell-type records. |
| `packages/sheets/src/grid/__golden__/harness.self.test.ts` | Delete | Tested projection helpers and asserted the harness maps stayed aligned. | The deleted migration harness no longer has a product role. |
| `packages/sheets/src/grid/__golden__/post-processing.golden.test.ts` | Delete | Froze relation and draft post-processing plus fixture constants. | Row-model tests protect non-enumerable draft metadata. Focused `createSheetsCell` tests now protect relation transformation. |
| `packages/sheets/src/grid/__golden__/resolver.golden.test.ts` | Replace, 4 → 3 | Froze more than 80 table-driven mapping outputs and test-fixture size. | `cell-type-resolver.test.ts` retains metadata precedence, readonly identifiers/timestamps, and viewer-only search vectors. Static table inventory is intentionally not frozen. |
| `packages/sheets/src/grid/__tests__/cell-type-resolver.test.ts` | Add focused contract | Replaces the resolver golden with representative semantic branches. | Protects precedence across aliases, arrays, backend metadata, GraphQL fallback, readonly rules, and viewer-only activation. |
| `packages/sheets/src/grid/__golden__/selection.golden.test.ts` | Delete | Ran a large operation table and compared one aggregate JSON blob. | The focused `range-set.test.ts` cases make merge, split, offset, and large-range failures local and readable. |
| `packages/sheets/src/grid/__tests__/registry-fidelity.test.ts` | Delete | Repeated factory output across 21 cases and asserted that the fixture touched every family. | Focused cell contracts, editor behavior, and routing tests protect owned semantics without testing fixture completeness. |
| `packages/sheets/src/selection/__tests__/range-set.golden.test.ts` | Replace, 24 → 4 | Replayed the retired implementation's captured output across many sequences. | `range-set.test.ts` protects the interval invariants that matter: merging, splitting, offsets, and sparse large ranges. |
| `packages/sheets/src/selection/__tests__/range-set.test.ts` | Add focused contract | Replaces captured parity with direct domain assertions. | The tests fail on observable selection results and no longer depend on the old implementation. |
| `packages/sheets/src/stories/__tests__/stories-render.test.tsx` | Rewrite, 14 → 1 | Mounted every story, mostly proving it did not throw, then duplicated the 10k virtualization assertion. | Retained one 10,000-row DOM-window contract. Individual visual stories remain for manual review. |
| `packages/sheets/src/table/__tests__/grid-viewport-active-cell.test.tsx` | Rewrite assertions, 3 → 3 | Mixed active-cell ARIA behavior with a selected CSS-class assertion. | Removed the styling assertion; retained active-descendant and active-cell accessibility behavior. |
| `packages/sheets/src/table/__tests__/grid-viewport-header.test.tsx` | Consolidate, 4 → 3 | Included a static header-exists check. | Retained sort toggling, resize behavior, and keyboard interaction. |
| `packages/sheets/src/table/__tests__/grid-viewport-rowmarker.test.tsx` | Consolidate, 4 → 2 | Included static marker existence and absent-marker rendering checks. | Retained row selection and select-all behavior. |
| `packages/sheets/src/testing/__tests__/mock-execute-roundtrip.test.ts` | Delete | Validated that the repository's test mock recognized queries and echoed mutations. | Real query builders, the PostGraphile adapter, and `sheets-execute` tests protect production behavior. The mock does not receive its own contract suite. |

## UI tests

| File | Decision | Existing assertion and value | Protection and retained coverage |
| --- | --- | --- | --- |
| `packages/ui/test/app-shell.test.tsx` | Consolidate, 4 → 1 | Checked region presence, class names, and static layout composition. | Retained the sidebar's accessible collapsed/expanded state transition. |
| `packages/ui/test/button-as-child.test.tsx` | Consolidate, 5 → 2 | Checked CSS, touch-target, and motion classes in addition to slot semantics. | Retained ref/event composition through `asChild` and native button behavior. |
| `packages/ui/test/field-empty.test.tsx` | Delete | Checked legacy slots, upstream surface, CSS classes, and standard empty markup. | TypeScript and the package build protect exports and composition; visual examples own presentation. |
| `packages/ui/test/select-transition.test.tsx` | Delete | Inspected entering/exiting data attributes for a visual transition. | Select interaction tests in consumers and visual review protect user behavior; the animation implementation is not a stable contract. |
| `packages/ui/test/stack-animation.test.tsx` | Delete | Mocked motion internals and asserted exact tween/spring sequencing. | Stack context behavior remains covered. Timing and animation curves are visual implementation details. |

## Removed support artifacts

The audit deleted the unused Data snapshots `builder.test.ts.snap`, `meta-object.node.test.ts.snap`, and `meta-object.test.ts.snap`. It also deleted the Sheets migration harness, five golden JSON files, and their stale parity comments. The smaller `builder.node.test.ts.snap` remains because serialized GraphQL output is a public adapter contract.

## High-value coverage retained

- Console Kit still covers authorization, tenant isolation, capability policy, callback/error translation, provisioning cleanup, and fail-closed behavior.
- Data still covers query serialization, mutation input semantics, schema compatibility, error classification, row identity, and policy provisioning.
- Command Palette still covers execution, cancellation/background work, reducer transitions, key matching, runtime configuration validation, and dynamic registry changes.
- Sheets still covers selection invariants, adapter behavior, uploads, batch commit, undo/redo, editors, draft rows, cache/state lifecycles, error gating, accessibility, and virtualization.
- Schema Builder still covers keyboard and drag behavior, runtime providers, policy CRUD/masks, selection changes, and cross-database scope rejection.
- UI still covers portals, modal dismissal, SSR, controlled state, accessibility state, and child ref/event composition.

## Remaining coupling and gaps

- `console-kit-effects.test.tsx`, `feature-pack-interactions.test.tsx`, `constructive-console-kit.test.tsx`, and `schemas-route-selection.test.tsx` still have large mock surfaces. Their assertions protect real policy and workflow behavior, but future work should move more setup into contract fixtures or browser-level flows.
- Several Sheets editor and batch-commit tests mock host context heavily. They protect failure and side-effect behavior, but a small adapter integration harness would reduce coupling.
- The Data complex-field adapter has no direct unmocked contract test against `@constructive-io/graphql-query/custom-ast`; this is the clearest runtime coverage gap found.
- Public package types are validated by `tsc` and declaration builds, but there is no dedicated compatibility suite for intentional developer-facing type contracts.
- Layout, motion, responsive overflow, and ordinary component appearance now rely on Storybook and visual review by design; they should use visual regression only if the repository adopts a stable visual baseline workflow.
- Live provider behavior remains outside the normal suite and requires the existing explicit live-E2E environment. The local suite continues to test only repository-owned adapter behavior.
