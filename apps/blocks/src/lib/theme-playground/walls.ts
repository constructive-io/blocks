/**
 * The three switchable preview walls on /blocks/create. `wall` travels in the
 * `?wall=` search param (omitted when default) and the preview postMessage
 * channel — never localStorage.
 */
export type WallId = 'platform' | 'workspace' | 'assistant';

export const WALL_IDS: WallId[] = ['platform', 'workspace', 'assistant'];

export const DEFAULT_WALL: WallId = 'platform';

export const WALLS: { id: WallId; label: '01' | '02' | '03'; title: string; description: string }[] = [
  {
    id: 'platform',
    label: '01',
    title: 'Platform',
    description: 'Billing, org, and project state — the real Constructive surface.',
  },
  {
    id: 'workspace',
    label: '02',
    title: 'Workspace',
    description: 'Product archetypes: data, observability, commerce, docs.',
  },
  {
    id: 'assistant',
    label: '03',
    title: 'Assistant',
    description: 'Copilot and chat primitives in context.',
  },
];

export function sanitizeWall(value: unknown): WallId {
  return WALL_IDS.includes(value as WallId) ? (value as WallId) : DEFAULT_WALL;
}

export function wallFromSearch(search: string): WallId {
  return sanitizeWall(new URLSearchParams(search).get('wall'));
}
