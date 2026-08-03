export const APP_DASHBOARD_LAYOUT_VERSION = 1 as const;

export type AppDashboardWidgetSize = 'third' | 'half' | 'wide' | 'full';

export interface AppDashboardPlacement {
  widgetId: string;
  order: number;
  size: AppDashboardWidgetSize;
  hidden?: boolean;
}

export interface AppDashboardLayout {
  version: typeof APP_DASHBOARD_LAYOUT_VERSION;
  placements: readonly AppDashboardPlacement[];
}

export interface AppDashboardLayoutStore {
  load(key: string): AppDashboardLayout | null | Promise<AppDashboardLayout | null>;
  save(key: string, layout: AppDashboardLayout): void | Promise<void>;
}

export interface ConstructiveAppDashboardLayoutAdapter {
  loadLayout(key: string): AppDashboardLayout | null | Promise<AppDashboardLayout | null>;
  saveLayout(key: string, layout: AppDashboardLayout): void | Promise<void>;
}

function isPlacement(value: unknown): value is AppDashboardPlacement {
  if (!value || typeof value !== 'object') return false;
  const placement = value as Partial<AppDashboardPlacement>;
  return typeof placement.widgetId === 'string'
    && Number.isInteger(placement.order)
    && ['third', 'half', 'wide', 'full'].includes(placement.size ?? '')
    && (placement.hidden === undefined || typeof placement.hidden === 'boolean');
}

export function parseAppDashboardLayout(value: unknown): AppDashboardLayout | null {
  if (!value || typeof value !== 'object') return null;
  const layout = value as Partial<AppDashboardLayout>;
  if (layout.version !== APP_DASHBOARD_LAYOUT_VERSION) return null;
  if (!Array.isArray(layout.placements) || !layout.placements.every(isPlacement)) return null;

  const widgetIds = layout.placements.map((placement) => placement.widgetId);
  if (new Set(widgetIds).size !== widgetIds.length) return null;
  return {
    version: APP_DASHBOARD_LAYOUT_VERSION,
    placements: layout.placements
  };
}

export function createDefaultAppDashboardLayout(
  widgetIds: readonly string[],
  defaultSizes: Readonly<Partial<Record<string, AppDashboardWidgetSize>>> = {}
): AppDashboardLayout {
  return {
    version: APP_DASHBOARD_LAYOUT_VERSION,
    placements: widgetIds.map((widgetId, order) => ({
      widgetId,
      order,
      size: defaultSizes[widgetId] ?? 'half'
    }))
  };
}

export function reconcileAppDashboardLayout(
  layout: AppDashboardLayout | null,
  widgetIds: readonly string[],
  defaultSizes: Readonly<Partial<Record<string, AppDashboardWidgetSize>>> = {}
): AppDashboardLayout {
  const allowed = new Set(widgetIds);
  const existing = (layout?.placements ?? [])
    .filter((placement) => allowed.has(placement.widgetId))
    .sort((left, right) => left.order - right.order);
  const existingIds = new Set(existing.map((placement) => placement.widgetId));
  const additions = widgetIds
    .filter((widgetId) => !existingIds.has(widgetId))
    .map((widgetId, index) => ({
      widgetId,
      order: existing.length + index,
      size: defaultSizes[widgetId] ?? 'half'
    }));

  return {
    version: APP_DASHBOARD_LAYOUT_VERSION,
    placements: [...existing, ...additions].map((placement, order) => ({
      ...placement,
      order
    }))
  };
}

export function createLocalStorageAppDashboardLayoutStore(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined =
    typeof window === 'undefined' ? undefined : window.localStorage
): AppDashboardLayoutStore {
  return {
    load(key) {
      if (!storage) return null;
      const serialized = storage.getItem(key);
      if (!serialized) return null;
      try {
        return parseAppDashboardLayout(JSON.parse(serialized));
      } catch {
        return null;
      }
    },
    save(key, layout) {
      storage?.setItem(key, JSON.stringify(layout));
    }
  };
}

/**
 * Adapts a generated Constructive SDK or server-action persistence boundary
 * without coupling App Kit to a particular GraphQL operation or table.
 */
export function createConstructiveAppDashboardLayoutStore(
  adapter: ConstructiveAppDashboardLayoutAdapter
): AppDashboardLayoutStore {
  return {
    load: (key) => adapter.loadLayout(key),
    save: (key, layout) => adapter.saveLayout(key, layout)
  };
}
