// Generates the deterministic Blocks manifest (src/blocks-manifest.json) and the
// docs data module (src/lib/docs/registry-data.ts) from Blocks-owned inputs.
// BLOCKS_GEN_OUT can redirect generated output for drift checks without modifying
// the working tree.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildFlowDocPages } from './flows-pages.mjs';
import { CONTENT } from './showcase-content.mjs';
import { UI_CONTENT, UI_FAMILY_LABEL, UI_FAMILY_ORDER } from './ui-content/index.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, '..');
const outputAppDir = process.env.BLOCKS_GEN_OUT ? path.resolve(process.env.BLOCKS_GEN_OUT) : appDir;
const catalogPath = path.join(appDir, 'catalog', 'blocks.json');
const registryPath = path.join(appDir, 'registry.json');
const contentDir = path.join(appDir, 'src', 'content', 'blocks');

const uiRegistryPath = path.resolve(appDir, '..', '..', 'packages', 'ui', 'registry.json');
const schemaRegistryPath = path.resolve(appDir, '..', '..', 'packages', 'schema-builder', 'registry.json');

const catalogBytes = fs.readFileSync(catalogPath);
const registryBytes = fs.readFileSync(registryPath);
const uiRegistryBytes = fs.readFileSync(uiRegistryPath);
const schemaRegistryBytes = fs.readFileSync(schemaRegistryPath);
const catalog = JSON.parse(catalogBytes);
const registry = JSON.parse(registryBytes);
const uiRegistry = JSON.parse(uiRegistryBytes);
const schemaRegistry = JSON.parse(schemaRegistryBytes);
const publishedNames = new Set(
  [...(registry.items ?? []), ...(schemaRegistry.items ?? [])].map((item) => item.name),
);
const sourceHash = crypto
  .createHash('sha256')
  .update(catalogBytes)
  .update(registryBytes)
  .update(uiRegistryBytes)
  .update(schemaRegistryBytes)
  .digest('hex');

const PRIVATE_CATALOG_KEYS = new Set(['limitations', 'knownBackendLimitations']);

const entries = (catalog.blocks ?? []).map((catalogEntry) => {
  const privateKeys = Object.keys(catalogEntry).filter((key) => PRIVATE_CATALOG_KEYS.has(key));
  if (privateKeys.length) {
    throw new Error(
      `Block '${catalogEntry.slug ?? catalogEntry.name}' exposes private catalog fields: ${privateKeys.join(', ')}`
    );
  }

  const { name, slug, title, category, type, status, statusLabel, purpose, specFile } = catalogEntry;
  const specPath = specFile ? path.join(contentDir, specFile) : null;
  return {
    name,
    slug,
    title,
    category,
    type,
    status,
    statusLabel,
    purpose,
    specPath: specFile ? `src/content/blocks/${specFile}` : null,
    registryName: publishedNames.has(name) ? `@constructive/${name}` : null,
    published: publishedNames.has(name),
    hasDoc: Boolean(specPath && fs.existsSync(specPath))
  };
});

if (entries.length === 0) throw new Error(`No block entries found in ${catalogPath}`);
const duplicateSlugs = entries.filter((entry, index) => entries.findIndex((item) => item.slug === entry.slug) !== index);
if (duplicateSlugs.length) throw new Error(`Duplicate block slugs: ${duplicateSlugs.map((entry) => entry.slug).join(', ')}`);

// --- derive the `ui` category from packages/ui/registry.json -----------------
// The @constructive-io/ui foundation is part of the deployed registry (merged
// by apps/registry), so the docs site documents every item. The item LIST is
// derived here; prose/tier live in scripts/ui-content/ (the file an item sits
// in is its family). Nothing is hand-cataloged, so a new ui component fails
// generation until ui-content covers it.

const blocksRoot = path.join(appDir, 'src', 'blocks');

/** Resolve the on-disk source dir for a slug, or null if the block isn't built here. */
function resolveSourceDir(slug, category) {
  if (slug === category) {
    const categoryRoot = path.join(blocksRoot, category);
    if (fs.existsSync(categoryRoot)) return categoryRoot;
  }
  const names = [slug];
  if (slug.startsWith(`${category}-`)) names.push(slug.slice(category.length + 1));
  for (const n of names) {
    const dir = path.join(blocksRoot, category, n);
    if (fs.existsSync(dir)) return dir;
  }
  if (category === 'schema') {
    for (const n of names) {
      const dir = path.resolve(appDir, '..', '..', 'packages', 'schema-builder', 'src', 'schema', n);
      if (fs.existsSync(dir)) return dir;
    }
  }
  return null;
}

/** All non-test .ts/.tsx files under dir, depth-first, name-sorted (deterministic). */
function listSourceFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listSourceFiles(p));
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(p);
  }
  return out;
}

const uiByName = new Map((uiRegistry.items ?? []).map((item) => [item.name, item]));

// Cross-link scan: which catalog blocks import which ui primitives. Drives the
// "Used by" section on ui pages and the "Built with" line on block pages.
const UI_IMPORT_RE = /from\s+["']@constructive-io\/ui\/([a-z0-9-]+)["']/g;
const usedByMap = new Map(); // uiName -> Set<blockSlug>
const blockUiImports = new Map(); // blockSlug -> Set<uiName>
for (const entry of entries) {
  const dir = resolveSourceDir(entry.slug, entry.category);
  if (!dir) continue;
  for (const file of listSourceFiles(dir)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const match of src.matchAll(UI_IMPORT_RE)) {
      const uiName = match[1];
      if (!uiByName.has(uiName)) continue; // subpath that isn't a registry item
      if (!usedByMap.has(uiName)) usedByMap.set(uiName, new Set());
      usedByMap.get(uiName).add(entry.slug);
      if (!blockUiImports.has(entry.slug)) blockUiImports.set(entry.slug, new Set());
      blockUiImports.get(entry.slug).add(uiName);
    }
  }
}

for (const name of Object.keys(UI_CONTENT)) {
  if (!uiByName.has(name)) throw new Error(`ui-content entry '${name}' is not a packages/ui registry item`);
}
const missingUiContent = (uiRegistry.items ?? []).filter((item) => !UI_CONTENT[item.name]).map((item) => item.name);
if (missingUiContent.length) {
  throw new Error(
    `packages/ui registry items missing from scripts/ui-content/: ${missingUiContent.join(', ')} — add each to its family file`,
  );
}

const blockSlugSet = new Set(entries.map((e) => e.slug));
const uiEntries = (uiRegistry.items ?? []).map((item) => {
  const content = UI_CONTENT[item.name];
  const slug = `ui-${item.name}`;
  if (blockSlugSet.has(slug)) throw new Error(`ui slug collides with a block slug: ${slug}`);
  return {
    name: item.name,
    slug,
    title: item.title ?? item.name,
    description: content.purpose ?? item.description ?? '',
    type: item.type,
    family: content.family,
    tier: content.tier,
    registryName: `@constructive/${item.name}`,
    published: true,
    dependencies: item.dependencies ?? [],
    registryDependencies: item.registryDependencies ?? [],
    usedBy: [...(usedByMap.get(item.name) ?? [])].sort(),
  };
});

const manifest = {
  generatedAt: null,
  source: {
    catalog: 'catalog/blocks.json',
    registry: 'registry.json',
    uiRegistry: 'packages/ui/registry.json',
    schemaRegistry: 'packages/schema-builder/registry.json',
    hash: sourceHash
  },
  counts: {
    total: entries.length,
    published: entries.filter((e) => e.published).length,
    byStatus: entries.reduce((acc, e) => ({ ...acc, [e.status]: (acc[e.status] ?? 0) + 1 }), {}),
    ui: uiEntries.length,
  },
  blocks: entries,
  // Sidebar family order for the ui category — emitted so the runtime reads
  // one source (this manifest) instead of mirroring scripts/ui-content/.
  uiFamilies: UI_FAMILY_ORDER.map((family) => ({ key: family, label: UI_FAMILY_LABEL[family] })),
  ui: uiEntries,
};

fs.mkdirSync(path.join(outputAppDir, 'src'), { recursive: true });
fs.writeFileSync(path.join(outputAppDir, 'src', 'blocks-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(
  `[gen] ${entries.length} blocks (${entries.filter((entry) => entry.hasDoc).length} with docs, ${manifest.counts.published} published) -> src/blocks-manifest.json`,
);

// ---------------------------------------------------------------------------
// Emit the generated data module: src/lib/docs/registry-data.ts
//
// Replaces the old Fumadocs MDX corpus. Every block / ui / flow becomes a
// DocPageData; the catch-all route renders them through DocPage / DocSection /
// ComponentPreview (no MDX). Two block tiers:
//   • Showcased — a slug in showcase-content.mjs with an on-disk source dir:
//     full page (live-preview section + usage + props/messages/requires).
//   • Lean — every other block: a minimal page that renders <BlockStatusHeader>
//     (which owns its own install) plus the spec markdown, if any.
// Props / messages / requires are NOT inlined — the page REFERENCES the typed
// SHOWCASE map by slug so those tables stay in lockstep with block source. Flow
// pages come from the shared flows-pages.mjs aggregator. Deterministic: stable
// page order, no churning timestamp.
// ---------------------------------------------------------------------------

const bySlug = new Map(entries.map((e) => [e.slug, e]));

/** /blocks/<category>/<fileSlug> — mirrors blockHref in src/lib/blocks.ts. */
function pageHref(entry) {
  if (entry.slug === entry.category) return `/blocks/${entry.category}`;
  const fileSlug = entry.slug.startsWith(`${entry.category}-`)
    ? entry.slug.slice(entry.category.length + 1)
    : entry.slug;
  return `/blocks/${entry.category}/${fileSlug}`;
}
/** Route slug (the path AFTER `/blocks/`) for a block. */
const blockSlugOf = (entry) => pageHref(entry).slice('/blocks/'.length);

/** Strip MD inline-code backticks for plain-text prose (intros render as <p>). */
const stripInlineCode = (s) => String(s ?? '').replace(/`([^`]+)`/g, '$1');
/** Escape a value for a GFM table cell — raw pipes/newlines split the row. */
const mdCell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
/** Marker: emit `expr` verbatim (not JSON) so a field can reference SHOWCASE. */
const rawExpr = (expr) => ({ __raw: expr });

// SHOWCASE (props/messages/requires) lives in the TS module; parse its top-level
// keys so a page only references entries that actually exist.
const showcaseSrc = fs.readFileSync(path.join(appDir, 'src', 'components', 'docs', 'showcase-data.ts'), 'utf8');
const showcaseKeys = new Set();
{
  const start = showcaseSrc.indexOf('export const SHOWCASE');
  const body = start >= 0 ? showcaseSrc.slice(start) : '';
  for (const m of body.matchAll(/^ {2}'([a-z0-9-]+)':\s*\{/gm)) showcaseKeys.add(m[1]);
}

/** UI titles a block imports — the "Built with" cross-link (from the import scan). */
function builtWithFor(slug) {
  return [...(blockUiImports.get(slug) ?? [])].sort().map((n) => uiByName.get(n)?.title ?? n);
}

// --- block pages: showcased (full) then lean (status header + spec) ---------
const blockPages = [];
const showcasedSlugs = new Set();

for (const slug of Object.keys(CONTENT)) {
  const entry = bySlug.get(slug);
  if (!entry) {
    console.warn(`[gen] showcase-content slug not in manifest: ${slug}`);
    continue;
  }
  if (!resolveSourceDir(slug, entry.category)) {
    // No on-disk source — fall through to the lean loop so the page still exists.
    console.warn(`[gen] no block source for showcased slug: ${slug} (falling back to lean)`);
    continue;
  }
  const c = CONTENT[slug];
  const builtWith = builtWithFor(slug);
  const hasShowcase = showcaseKeys.has(slug);
  blockPages.push({
    slug: blockSlugOf(entry),
    title: c.title,
    description: stripInlineCode(c.description),
    kind: 'block',
    category: entry.category,
    name: entry.slug,
    status: entry.status,
    statusLabel: entry.statusLabel,
    registryName: entry.registryName ?? undefined,
    installUrl: entry.registryName ?? undefined,
    showcaseSlug: entry.slug,
    usageCode: c.usage,
    usageCodeLang: 'tsx',
    sections: [
      {
        id: 'live-preview',
        title: 'Live preview',
        intro: [stripInlineCode(c.intro), c.previewNote].filter(Boolean).join(' '),
        showcaseSlug: entry.slug,
        code: c.usage,
        codeLang: 'tsx',
      },
    ],
    props: hasShowcase ? rawExpr(`SHOWCASE['${slug}']?.props`) : undefined,
    messages: hasShowcase ? rawExpr(`SHOWCASE['${slug}']?.messages`) : undefined,
    requires: hasShowcase ? rawExpr(`SHOWCASE['${slug}']?.requires`) : undefined,
    builtWith: builtWith.length ? builtWith : undefined,
  });
  showcasedSlugs.add(slug);
}

for (const entry of entries) {
  if (showcasedSlugs.has(entry.slug)) continue;
  let spec;
  if (entry.specPath) {
    const abs = path.join(appDir, entry.specPath);
    if (fs.existsSync(abs)) spec = fs.readFileSync(abs, 'utf8');
  }
  blockPages.push({
    slug: blockSlugOf(entry),
    title: entry.title,
    description: stripInlineCode(entry.purpose),
    kind: 'block',
    category: entry.category,
    name: entry.slug,
    status: entry.status,
    statusLabel: entry.statusLabel,
    registryName: entry.registryName ?? undefined,
    sections: [],
    spec: spec || undefined,
  });
}

// --- ui pages: one preview/code (or code-only) section + props + parts -------
const uiPages = uiEntries.map((u) => {
  const content = UI_CONTENT[u.name];
  const isShowcase = u.tier === 'showcase' && Boolean(content.intro) && Boolean(content.usage);
  const sections = [];
  if (content.intro || content.usage) {
    sections.push({
      id: isShowcase ? 'live-preview' : 'usage',
      title: isShowcase ? 'Live preview' : 'Usage',
      intro: content.intro ? stripInlineCode(content.intro) : undefined,
      showcaseSlug: isShowcase ? u.slug : undefined,
      code: content.usage || undefined,
      codeLang: content.usage ? 'tsx' : undefined,
    });
  }
  // Parts have no field in the data contract; preserve them as spec markdown
  // (the route renders `spec` via <Markdown>, which supports GFM tables).
  let spec;
  if (content.parts?.length) {
    spec = [
      '## Parts',
      '',
      '| Part | Description |',
      '| --- | --- |',
      ...content.parts.map((p) => `| \`${mdCell(p.name)}\` | ${mdCell(p.description)} |`),
      '',
    ].join('\n');
  }
  return {
    slug: `ui/${u.name}`,
    title: u.title,
    description: stripInlineCode(u.description),
    kind: 'ui',
    category: 'ui',
    registryName: u.registryName,
    installUrl: u.registryName,
    showcaseSlug: isShowcase ? u.slug : undefined,
    usageCode: content.usage || undefined,
    usageCodeLang: content.usage ? 'tsx' : undefined,
    sections,
    props: content.props?.length ? content.props : undefined,
    usedBy: u.usedBy?.length ? u.usedBy.map((s) => CONTENT[s]?.title ?? bySlug.get(s)?.title ?? s) : undefined,
    spec: spec || undefined,
  };
});

const flowPages = buildFlowDocPages();
const pages = [...blockPages, ...uiPages, ...flowPages];

// --- guard: reference slugs must not shadow a hand-authored guide route ------
// getAllSlugs() enumerates these page slugs for the catch-all's
// generateStaticParams(); the guides under app/blocks/(guides)/ own their own
// static routes (the /blocks index, getting-started, guides/*, concepts/*). A
// reference slug equal to one of those would silently shadow the guide, so fail
// generation instead. Guide routes are derived from guides-meta.ts — the single
// source the sidebar nav and prev/next chain also read.
const guidesSrc = fs.readFileSync(path.join(appDir, 'src', 'lib', 'docs', 'guides-meta.ts'), 'utf8');
const guidesStart = guidesSrc.indexOf('export const GUIDES');
if (guidesStart < 0) {
  throw new Error('guides-meta.ts: missing `export const GUIDES` — cannot derive reserved guide routes');
}
const reservedSlugs = new Set(['', 'getting-started']); // /blocks index + tutorial route
for (const m of guidesSrc.slice(guidesStart).matchAll(/href:\s*'\/blocks\/([^']+)'/g)) reservedSlugs.add(m[1]);
const shadowedSlugs = pages.map((p) => p.slug).filter((slug) => reservedSlugs.has(slug));
if (shadowedSlugs.length) {
  throw new Error(
    `Reference slug(s) shadow a guide route: ${shadowedSlugs.join(', ')} — rename the block/ui/flow slug or the guide so generateStaticParams() routes stay disjoint`,
  );
}

// --- serialize the pages array to a TS module ------------------------------
function emitKey(k) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
}
function emitValue(v, indent) {
  if (v && typeof v === 'object' && '__raw' in v) return v.__raw; // SHOWCASE ref
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    const pad = `${indent}  `;
    return `[\n${v.map((x) => pad + emitValue(x, pad)).join(',\n')},\n${indent}]`;
  }
  if (v && typeof v === 'object') {
    const keys = Object.keys(v).filter((k) => v[k] !== undefined);
    if (keys.length === 0) return '{}';
    const pad = `${indent}  `;
    return `{\n${keys.map((k) => `${pad}${emitKey(k)}: ${emitValue(v[k], pad)}`).join(',\n')},\n${indent}}`;
  }
  return JSON.stringify(v); // strings (escaped), numbers, booleans, null
}

const usesShowcase = pages.some((p) =>
  [p.props, p.messages, p.requires].some((f) => f && typeof f === 'object' && '__raw' in f),
);

const BANNER = `// GENERATED — do not edit. Run \`pnpm --filter blocks gen\` to regenerate.
// Source: catalog/blocks.json + registry.json + packages/ui/registry.json; prose
// from scripts/showcase-content.mjs + scripts/ui-content/* + scripts/flows-content.mjs;
// props/messages/requires referenced from src/components/docs/showcase-data.ts.
// Deterministic (stable page order, no timestamp).
//
// SLUG CONTRACT: \`slug\` is the route path AFTER \`/blocks/\` — the page href is
// \`/blocks/\` + slug, equal to the sidebar href the nav builds:
//   block → /blocks/<category>/<fileSlug>    ui → /blocks/ui/<name>
//   flow  → /blocks/flows/<group>/<id>
// registry.ts getAllSlugs() feeds generateStaticParams(); getPage(slug) looks
// pages up by this exact string. Keep slugs unique.`;

const TYPES = `export interface DocSectionData {
  /** Stable slugified id — becomes the h2/h3 anchor (TOC scroll-spy keys off it). */
  id: string;
  title: string;
  /** 13px muted intro paragraph above the preview/code. */
  intro?: string;
  /** Key into DEMOS/UI_DEMOS for the live preview (omit → code-only / prose-only). */
  showcaseSlug?: string;
  /** The "Code" snippet for this section (Shiki-highlightable). */
  code?: string;
  /** Shiki language for \`code\` (extends §B; default 'tsx'). */
  codeLang?: string;
}

export interface DocPageData {
  /** Route slug — the path AFTER \`/blocks/\` (see SLUG CONTRACT above). */
  slug: string;
  title: string;
  /** 1-line muted subhead. */
  description: string;
  kind: 'block' | 'ui' | 'flow';
  /** auth | org | shell | user | ui | lib | flows … */
  category: string;
  /** Manifest slug for blocks — feeds <BlockStatusHeader> + cross-refs (extends §B). */
  name?: string;
  status?: string;
  statusLabel?: string;
  /** @constructive/… → install command. */
  registryName?: string;
  /** Resolved registry name for \`npx shadcn@latest add …\` (often === registryName). */
  installUrl?: string;
  /** Key into DEMOS/UI_DEMOS for the page-level live preview (null → no preview). */
  showcaseSlug?: string;
  /** The page-level "Code" tab snippet (usage). */
  usageCode?: string;
  /** Shiki language for \`usageCode\` (extends §B; default 'tsx'). */
  usageCodeLang?: string;
  /** Intro prose + previews, in order. */
  sections: DocSectionData[];
  /** Reference tables — sourced from showcase-data.ts. */
  props?: PropRow[];
  messages?: Record<string, unknown>;
  requires?: RequiresInput;
  /** Markdown spec (lean pages) from src/content/blocks/<slug>.md. */
  spec?: string;
  /** Cross-links (labels). */
  builtWith?: string[];
  usedBy?: string[];
}

export interface DocsRegistry {
  pages: DocPageData[];
}`;

const showcaseImport = usesShowcase ? "import { SHOWCASE } from '@/components/docs/showcase-data';\n\n" : '';
const fileSource = [
  BANNER,
  '',
  `${showcaseImport}import type { PropRow } from '@/components/docs/props-table';`,
  "import type { RequiresInput } from '@/components/docs/requires-panel';",
  '',
  TYPES,
  '',
  'const registry: DocsRegistry = {',
  `  pages: ${emitValue(pages, '  ')},`,
  '};',
  '',
  'export default registry;',
  '',
].join('\n');

const registryDataPath = path.join(outputAppDir, 'src', 'lib', 'docs', 'registry-data.ts');
fs.mkdirSync(path.dirname(registryDataPath), { recursive: true });
fs.writeFileSync(registryDataPath, fileSource);

const previewCount = pages.filter((p) => p.sections.some((s) => s.showcaseSlug)).length;
console.log(
  `[gen] ${pages.length} doc pages (${blockPages.length} block + ${uiPages.length} ui + ${flowPages.length} flow; ` +
    `${previewCount} with a live preview) -> src/lib/docs/registry-data.ts`,
);
