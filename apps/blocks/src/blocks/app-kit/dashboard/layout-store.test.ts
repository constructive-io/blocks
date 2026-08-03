import { describe, expect, it, vi } from 'vitest';
import {
  APP_DASHBOARD_LAYOUT_VERSION,
  createConstructiveAppDashboardLayoutStore,
  createLocalStorageAppDashboardLayoutStore,
  parseAppDashboardLayout,
  reconcileAppDashboardLayout
} from './layout-store';

const layout = {
  version: APP_DASHBOARD_LAYOUT_VERSION,
  placements: [{ widgetId: 'attendance', order: 0, size: 'half' as const }]
};

describe('dashboard layout stores', () => {
  it('rejects unknown versions and duplicate widget placements', () => {
    expect(parseAppDashboardLayout({ ...layout, version: 2 })).toBeNull();
    expect(parseAppDashboardLayout({
      version: 1,
      placements: [layout.placements[0], layout.placements[0]]
    })).toBeNull();
  });

  it('reconciles approved widgets without reviving removed catalog entries', () => {
    expect(reconcileAppDashboardLayout(layout, ['attendance', 'sessions'])).toEqual({
      version: 1,
      placements: [
        { widgetId: 'attendance', order: 0, size: 'half' },
        { widgetId: 'sessions', order: 1, size: 'half' }
      ]
    });
    expect(reconcileAppDashboardLayout(layout, ['sessions']).placements)
      .toEqual([{ widgetId: 'sessions', order: 0, size: 'half' }]);
  });

  it('round-trips local storage and adapts a Constructive persistence boundary', async () => {
    const values = new Map<string, string>();
    const local = createLocalStorageAppDashboardLayoutStore({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value)
    });
    await local.save('event-studio', layout);
    expect(await local.load('event-studio')).toEqual(layout);

    const loadLayout = vi.fn().mockResolvedValue(layout);
    const saveLayout = vi.fn().mockResolvedValue(undefined);
    const constructive = createConstructiveAppDashboardLayoutStore({ loadLayout, saveLayout });
    expect(await constructive.load('event-studio')).toEqual(layout);
    await constructive.save('event-studio', layout);
    expect(saveLayout).toHaveBeenCalledWith('event-studio', layout);
  });
});
