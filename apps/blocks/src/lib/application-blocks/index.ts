import { AUTH_PAGES_DOC } from '../app-kit/auth-pages';
import { DASHBOARD_TILES_DOC } from '../app-kit/dashboard-tiles';
import { RESOURCE_KIT_DOC } from '../app-kit/resource-kit';
import { agentsBuilderBlock } from './agents-builder';
import { billingAccountBlock } from './billing-account';
import { billingConsoleBlock } from './billing-console';
import { codingAgentBlock } from './coding-agent';
import { dataRoomsBlock } from './data-rooms';
import { orgChartBlock } from './org-chart';
import { storageBrowserBlock } from './storage-browser';
import type { ApplicationBlockDoc } from './types';

export type { ApplicationBlockApiRow, ApplicationBlockDoc, ApplicationBlockExample } from './types';

/** Every application block's docs, one module each, in the order the docs list them. */
export const APPLICATION_BLOCKS: readonly ApplicationBlockDoc[] = [
  orgChartBlock,
  storageBrowserBlock,
  agentsBuilderBlock,
  codingAgentBlock,
  dataRoomsBlock,
  billingAccountBlock,
  billingConsoleBlock,
  // The app kit: the blocks a generated application is composed from. Resource
  // Kit turns resource definitions into list, detail, and form screens; Auth
  // Pages and Dashboard Tiles cover the screens around them.
  RESOURCE_KIT_DOC,
  AUTH_PAGES_DOC,
  DASHBOARD_TILES_DOC,
];

const APPLICATION_BLOCK_BY_NAME = new Map(
  APPLICATION_BLOCKS.map((block) => [block.name, block] as const),
);

export function getApplicationBlock(name: string): ApplicationBlockDoc | undefined {
  return APPLICATION_BLOCK_BY_NAME.get(name as ApplicationBlockDoc['name']);
}

/** The docs route for an application block. */
export function applicationBlockHref(block: Pick<ApplicationBlockDoc, 'name' | 'href'>) {
  return block.href ?? `/blocks/${block.name}`;
}

const APPLICATION_BLOCK_BY_HREF = new Map(
  APPLICATION_BLOCKS.map((block) => [applicationBlockHref(block), block] as const),
);

/** The application block documented at a (normalised) path, if any. */
export function getApplicationBlockByPath(path: string): ApplicationBlockDoc | undefined {
  return APPLICATION_BLOCK_BY_HREF.get(path);
}
