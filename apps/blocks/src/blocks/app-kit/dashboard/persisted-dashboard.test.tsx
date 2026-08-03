import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createAppDashboardWidgetCatalog } from './dashboard';
import {
  APP_DASHBOARD_LAYOUT_VERSION,
  type AppDashboardLayout
} from './layout-store';
import { PersistedAppDashboard } from './persisted-dashboard';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe('PersistedAppDashboard', () => {
  it('serializes rapid saves so an older layout cannot finish last', async () => {
    const user = userEvent.setup();
    const firstSave = deferred();
    const secondSave = deferred();
    const saveGates = [firstSave, secondSave];
    let saveIndex = 0;
    const initialLayout: AppDashboardLayout = {
      version: APP_DASHBOARD_LAYOUT_VERSION,
      placements: [{ widgetId: 'attendance', order: 0, size: 'half' }]
    };
    const save = vi.fn((_key: string, _layout: AppDashboardLayout) =>
      saveGates[saveIndex++]!.promise
    );
    const catalog = createAppDashboardWidgetCatalog([{
      id: 'attendance',
      kind: 'kpi',
      title: 'Attendance',
      state: { status: 'ready', value: { value: 42 } }
    }]);

    render(
      <PersistedAppDashboard
        catalog={catalog}
        layoutKey='event-studio'
        layoutStore={{ load: () => initialLayout, save }}
      />
    );

    await screen.findByRole('region', { name: 'Dashboard' });
    await user.click(screen.getByRole('button', { name: 'Customize Attendance' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Resize to wide' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Customize Attendance' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Resize to full' }));
    await act(async () => Promise.resolve());
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => firstSave.resolve());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls.map(([key, saved]) => ({
      key,
      size: saved.placements[0]?.size
    }))).toEqual([
      { key: 'event-studio', size: 'wide' },
      { key: 'event-studio', size: 'full' }
    ]);
    await act(async () => secondSave.resolve());
  });
});
