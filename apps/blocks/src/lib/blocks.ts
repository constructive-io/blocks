import manifestJson from '@/blocks-manifest.json';

export type BlockStatus = 'ready' | 'backend-pending' | 'api-config-pending' | 'planned';
export type BlockCategory = 'auth' | 'user' | 'org' | 'shell' | 'chat' | 'schema' | 'ui' | 'lib';

export interface BlockMeta {
  name: string;
  slug: string;
  title: string;
  category: BlockCategory;
  type: string;
  status: BlockStatus;
  statusLabel: string;
  purpose: string;
  specPath: string | null;
  registryName: string | null;
  published: boolean;
  hasDoc: boolean;
}

/**
 * A foundation component from the `@constructive-io/ui` package, exposed as a
 * registry item (derived from packages/ui/registry.json — see
 * scripts/generate-manifest.mjs). Documented under /blocks/ui/<name>.
 */
export interface UiMeta {
  name: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  family: string;
  tier: 'showcase' | 'lean';
  registryName: string;
  published: true;
  dependencies: string[];
  registryDependencies: string[];
  usedBy: string[];
}

export interface BlocksManifest {
  generatedAt: null;
  source: { catalog: string; registry: string; uiRegistry: string; schemaRegistry: string; hash: string };
  counts: { total: number; published: number; byStatus: Record<string, number>; ui: number };
  blocks: BlockMeta[];
  uiFamilies: Array<{ key: string; label: string }>;
  ui: UiMeta[];
}

const manifest = manifestJson as BlocksManifest;

export const blocks: BlockMeta[] = manifest.blocks;
export const manifestMeta = { generatedAt: manifest.generatedAt, source: manifest.source, counts: manifest.counts };

/**
 * The ui foundation — kept OUT of `blocks` so every block count/listing surface
 * stays blocks-only by default; ui surfaces opt in via these exports.
 */
export const uiItems: UiMeta[] = manifest.ui;
export const uiCount = uiItems.length;
export const uiFamilies = manifest.uiFamilies;

/** Canonical /blocks/ui/<name> href for a ui foundation item. */
export function uiHref(item: Pick<UiMeta, 'name'>): string {
  return `/blocks/ui/${item.name}`;
}

export function uiByFamily(list: UiMeta[] = uiItems): Array<{ key: string; label: string; items: UiMeta[] }> {
  return uiFamilies
    .map(({ key, label }) => ({ key, label, items: list.filter((i) => i.family === key) }))
    .filter((group) => group.items.length > 0);
}

/**
 * The user-facing "N blocks" figure — published registry blocks only (66),
 * excluding the unpublished `registry:lib` doc entries that `blocks` also
 * carries (68 total). Every surface that CLAIMS a block count (sidebar footer,
 * gallery eyebrow/stat, landing copy) must use this so the number can't drift;
 * live list tallies (catalog "Showing X of N", status-table Total) stay
 * list-derived because they must match what is actually rendered.
 */
export const publishedBlockCount = blocks.filter((b) => b.published).length;

export const CATEGORY_ORDER: BlockCategory[] = ['auth', 'user', 'org', 'shell', 'chat', 'schema', 'ui', 'lib'];

export const CATEGORY_LABEL: Record<BlockCategory, string> = {
  auth: 'Auth',
  user: 'User',
  org: 'Organization',
  shell: 'App Shell',
  chat: 'AI Chat',
  schema: 'Schema Builder',
  ui: 'UI',
  lib: 'Library & Runtime',
};

type BadgeVariant = 'success' | 'warning' | 'info' | 'outline' | 'secondary';

// Public-facing status copy: describe what a consumer can do today, never the
// internal reason (schema/view/roadmap details stay out of the docs site).
export const STATUS_META: Record<BlockStatus, { label: string; variant: BadgeVariant; blurb: string }> = {
  ready: {
    label: 'Ready',
    variant: 'success',
    blurb: 'The block and the backend operations it binds are live.',
  },
  'backend-pending': {
    label: 'Backend pending',
    variant: 'warning',
    blurb: 'The UI is complete; its backend operations are not yet available. Drive the data path with the override props.',
  },
  'api-config-pending': {
    label: 'API pending',
    variant: 'info',
    blurb: 'No generated list query yet — render this surface with data you pass in; its actions work normally.',
  },
  planned: {
    label: 'Planned',
    variant: 'outline',
    blurb: 'Design preview — UI only for now.',
  },
};

export const STATUS_ORDER: BlockStatus[] = ['ready', 'backend-pending', 'api-config-pending', 'planned'];

export function getBlock(slug: string): BlockMeta | undefined {
  return blocks.find((b) => b.slug === slug);
}

/**
 * Returns the canonical /blocks/<category>/<fileSlug> href for a block.
 * Mirrors the fileSlug transform used in generate-manifest.mjs.
 */
export function blockHref(block: Pick<BlockMeta, 'slug' | 'category'>): string {
  if (block.slug === block.category) return `/blocks/${block.category}`;
  const fileSlug = block.slug.startsWith(`${block.category}-`)
    ? block.slug.slice(block.category.length + 1)
    : block.slug;
  return `/blocks/${block.category}/${fileSlug}`;
}

export function blocksByCategory(list: BlockMeta[] = blocks): Array<{ category: BlockCategory; items: BlockMeta[] }> {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: list.filter((b) => b.category === category),
  })).filter((group) => group.items.length > 0);
}
