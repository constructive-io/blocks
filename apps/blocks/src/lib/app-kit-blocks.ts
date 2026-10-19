import type { ApplicationBlockDoc } from './application-blocks';
import { AUTH_PAGES_DOC } from './app-kit/auth-pages';
import { DASHBOARD_TILES_DOC } from './app-kit/dashboard-tiles';
import { RESOURCE_KIT_DOC } from './app-kit/resource-kit';

/**
 * The app kit: the blocks a generated application is composed from. Resource
 * Kit turns resource definitions into list, detail, and form screens; Auth
 * Pages and Dashboard Tiles cover the screens around them.
 */
export const APP_KIT_BLOCKS: readonly ApplicationBlockDoc[] = [RESOURCE_KIT_DOC, AUTH_PAGES_DOC, DASHBOARD_TILES_DOC];
