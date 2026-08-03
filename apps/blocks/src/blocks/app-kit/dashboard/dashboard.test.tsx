import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { defineQuery, type AppScope } from '../core/contracts';
import { AppKitProvider } from '../core/runtime';
import { ConnectedAppDashboard } from './connected-dashboard';
import {
  AppDashboard,
  createAppDashboardWidgetCatalog
} from './dashboard';
import { APP_DASHBOARD_LAYOUT_VERSION } from './layout-store';
import type { AppDashboardRowsPayload } from './widgets';

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    globalThis.ResizeObserver = class ResizeObserverStub {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback([{
          target,
          contentRect: {
            bottom: 240,
            height: 240,
            left: 0,
            right: 640,
            top: 0,
            width: 640,
            x: 0,
            y: 0,
            toJSON: () => ({})
          }
        } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

const layout = {
  version: APP_DASHBOARD_LAYOUT_VERSION,
  placements: [
    { widgetId: 'attendance', order: 0, size: 'half' as const },
    { widgetId: 'trend', order: 1, size: 'half' as const },
    { widgetId: 'status-bars', order: 2, size: 'half' as const },
    { widgetId: 'breakdown', order: 3, size: 'half' as const },
    { widgetId: 'empty-widget', order: 4, size: 'half' as const },
    { widgetId: 'private', order: 5, size: 'full' as const }
  ]
};

function catalog() {
  return createAppDashboardWidgetCatalog([
    {
      id: 'attendance',
      kind: 'kpi',
      title: 'Attendance',
      formatValue: (value) => `${value} people`,
      state: { status: 'ready', value: { value: 420 } }
    },
    {
      id: 'trend',
      kind: 'line',
      title: 'Registration trend',
      xKey: 'day',
      series: [{ key: 'registrations', label: 'Registrations', color: 'chart-1' }],
      state: { status: 'ready', value: { rows: [{ day: 'Mon', registrations: 12 }] } }
    },
    {
      id: 'status-bars',
      kind: 'bar',
      title: 'Sessions by status',
      xKey: 'status',
      series: [{ key: 'sessions', label: 'Sessions', color: 'chart-2' }],
      state: { status: 'ready', value: { rows: [{ status: 'Draft', sessions: 3 }] } }
    },
    {
      id: 'breakdown',
      kind: 'breakdown',
      title: 'Venue breakdown',
      columns: [
        { key: 'venue', label: 'Venue' },
        { key: 'sessions', label: 'Sessions', align: 'right', format: (value) => `${value} total` }
      ],
      state: { status: 'ready', value: { rows: [{ venue: 'Hall A', sessions: 4 }] } }
    },
    {
      id: 'empty-widget',
      kind: 'bar',
      title: 'Empty report',
      xKey: 'day',
      series: [{ key: 'sessions', label: 'Sessions', color: 'chart-3' }],
      state: { status: 'empty', message: 'No sessions match this range.' }
    },
    {
      id: 'private',
      kind: 'kpi',
      title: 'Private metric',
      state: { status: 'denied', message: 'Manager access required.' }
    }
  ]);
}

describe('AppDashboard', () => {
  it('validates approved catalog identifiers, chart series, and semantic tokens', () => {
    expect(() => createAppDashboardWidgetCatalog([
      { id: 'same', kind: 'kpi', title: 'One', state: { status: 'loading' } },
      { id: 'same', kind: 'kpi', title: 'Two', state: { status: 'loading' } }
    ])).toThrow('Duplicate dashboard widget id');
    expect(() => createAppDashboardWidgetCatalog([{
      id: 'Invalid widget',
      kind: 'kpi',
      title: 'Invalid',
      state: { status: 'loading' }
    }])).toThrow('is invalid');
    expect(() => createAppDashboardWidgetCatalog([{
      id: 'invalid-series',
      kind: 'line',
      title: 'Invalid series',
      xKey: 'day',
      series: [{ key: 'registrations.total', label: 'Registrations', color: 'chart-1' }],
      state: { status: 'loading' }
    }])).toThrow('safe CSS and row identifier');
    expect(() => createAppDashboardWidgetCatalog([{
      id: 'invalid-color',
      kind: 'bar',
      title: 'Invalid color',
      xKey: 'day',
      series: [{ key: 'sessions', label: 'Sessions', color: 'red' as 'chart-1' }],
      state: { status: 'loading' }
    }])).toThrow('unsupported chart token');
  });

  it('renders all four catalog-owned families, explicit empty/denied states, and accessible chart descendants', () => {
    render(<AppDashboard catalog={catalog()} layout={layout} />);
    expect(screen.getByText('420 people')).toHaveClass('tabular-nums');
    expect(screen.getByText('420 people').closest('[data-slot="card"]')).toHaveClass('md:col-span-6');
    expect(screen.getByRole('figure', { name: 'Registration trend' })).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: 'Sessions by status' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Registration trend' })).toHaveAttribute('aria-roledescription', 'chart');
    expect(screen.getByRole('img', { name: 'Sessions by status' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('list', { name: 'Registration trend legend' })).toHaveTextContent('Registrations');
    expect(screen.getByText('4 total')).toBeInTheDocument();
    expect(screen.getByText('No sessions match this range.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Manager access required.');
  });

  it('rejects unexpected loader row keys instead of flowing them to chart configuration', () => {
    const injected = createAppDashboardWidgetCatalog([{
      id: 'injected-chart',
      kind: 'line',
      title: 'Injected chart',
      xKey: 'day',
      series: [{ key: 'registrations', label: 'Registrations', color: 'chart-1' }],
      state: {
        status: 'ready',
        value: {
          rows: [{ day: 'Mon', registrations: 12, formatter: () => 'unsafe' }]
        }
      }
    }]);
    render(
      <AppDashboard
        catalog={injected}
        layout={{
          version: 1,
          placements: [{ widgetId: 'injected-chart', order: 0, size: 'full' }]
        }}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('unexpected key: formatter');
    expect(screen.queryByRole('figure', { name: 'Injected chart' })).not.toBeInTheDocument();
  });

  it('validates inert rows returned by a connected query', async () => {
    const query = defineQuery<Readonly<Record<string, never>>, AppDashboardRowsPayload>({
      id: 'analytics.injected',
      execute: () => ({
        rows: [{ day: 'Mon', registrations: 12 }],
        series: [{ key: 'attacker-owned' }]
      } as unknown as AppDashboardRowsPayload)
    });
    const scope: AppScope = {
      endpointId: 'graphql',
      databaseId: 'events',
      sessionPartition: 'user-1',
      schemaRevision: 'schema-1',
      securityRevision: 'security-1'
    };
    render(
      <AppKitProvider queryClient={new QueryClient()} scope={scope}>
        <ConnectedAppDashboard
          layout={{
            version: 1,
            placements: [{ widgetId: 'connected-chart', order: 0, size: 'full' }]
          }}
          widgets={[{
            id: 'connected-chart',
            input: {},
            kind: 'line',
            query,
            series: [{ key: 'registrations', label: 'Registrations', color: 'chart-1' }],
            title: 'Connected chart',
            xKey: 'day'
          }]}
        />
      </AppKitProvider>
    );
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('unexpected key: series'));
  });

  it('changes only approved layout placements through keyboard-accessible controls', async () => {
    const user = userEvent.setup();
    const onLayoutChange = vi.fn();
    render(
      <AppDashboard
        catalog={catalog()}
        layout={layout}
        onLayoutChange={onLayoutChange}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Customize Attendance' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Move later' }));
    expect(onLayoutChange).toHaveBeenCalledWith(expect.objectContaining({
      version: 1,
      placements: expect.arrayContaining([
        expect.objectContaining({ widgetId: 'attendance', order: 1 }),
        expect.objectContaining({ widgetId: 'trend', order: 0 })
      ])
    }));
  });
});
