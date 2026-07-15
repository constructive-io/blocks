# Blocks

Docs and live-demo showcase for the **Constructive blocks registry** — the `@constructive` shadcn registry of data-bound blocks and UI primitives. Every block renders as a real, interactive demo next to its install command, props, and source.

Live: **https://constructive-io.github.io/blocks/** (GitHub Pages, static export under basePath `/blocks`).

## Develop

```bash
pnpm --filter blocks dev      # Next.js + Turbopack on http://localhost:3005
```

`predev` regenerates artifacts first, so the dev server always reflects current content.

## Content model

Docs are **generated from source**, not hand-written per page. Authored inputs and the UI/schema package manifests feed two generators:

| Authored input | Generator | Generated output (DO NOT EDIT) |
|----------------|-----------|--------------------------------|
| `src/content/blocks/*.md`, `catalog/blocks.json`, all three registry manifests, sidecar `scripts/*content*.mjs` | `scripts/generate-manifest.mjs` | `src/blocks-manifest.json`, `src/lib/docs/registry-data.ts` |
| `scripts/flows-content.mjs`, `registry.json` | `scripts/generate-flows.mjs` | `src/flows/flows.json` |

Run `pnpm gen` after changing any authored input. Never edit the generated files directly — `pnpm gen:check` re-runs the generators into a temp dir and fails on any drift. It runs in `prebuild` and in CI, so drift blocks the build.

## Scripts

| Script | Does |
|--------|------|
| `gen` | Regenerate manifest, docs data, and flows |
| `gen:check` | Fail if generated files drift from their sources |
| `check:flows` | Validate `flows.json`, namespaced installs, and pruned SDK fixtures |
| `fixtures:refresh` | Refresh reachable SDK fixtures from an explicit generated source root |
| `fixtures:check` | Fail when generated SDK imports drift from committed fixtures |
| `check:selections` | Reject empty mutation selections in `src/blocks` |
| `lint:types` | `tsc --noEmit` |
| `test` | `vitest run` |
| `test:visual` | Compare the static Pages site with the Playwright screenshot baselines |
| `build:pages` | `BLOCKS_PAGES=1 next build` — static export for GitHub Pages |

## Layout

| Path | Role |
|------|------|
| `src/blocks` | Registry-shipped app block source (auth, org, user, chat, primitives, runtime, …) |
| `src/generated` | Pruned, committed generated SDK fixtures used only by docs and tests |
| `src/components/docs` | Docs site chrome — nav, preview frame, code surface, demos |
| `src/app` | Next.js App Router routes |
| `src/content/blocks` | Authored per-block markdown (generator input) |
| `scripts` | Generators + drift/contract guards |

`src/blocks` is the source shadcn ships to consumers; everything else is the site that documents it.

## Deploy

`.github/workflows/ci.yml` runs the repository validation suite. On `main`,
`.github/workflows/pages.yml` repeats the validated build, assembles `_site/` —
the Blocks site plus registry JSON under `/r/` — and deploys it to GitHub Pages.
Neither workflow publishes npm packages.
