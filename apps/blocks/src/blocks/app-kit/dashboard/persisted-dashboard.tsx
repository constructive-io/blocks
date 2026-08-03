'use client';

import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Skeleton } from '@constructive-io/ui/skeleton';
import { AppDashboard, type AppDashboardProps } from './dashboard';
import {
  createDefaultAppDashboardLayout,
  reconcileAppDashboardLayout,
  type AppDashboardLayout,
  type AppDashboardLayoutStore
} from './layout-store';

export interface PersistedAppDashboardProps extends Omit<
  AppDashboardProps,
  'layout' | 'onLayoutChange'
> {
  layoutKey: string;
  layoutStore: AppDashboardLayoutStore;
  onLayoutError?: (error: Error) => void;
}

export function PersistedAppDashboard({
  catalog,
  layoutKey,
  layoutStore,
  onLayoutError,
  ...props
}: PersistedAppDashboardProps) {
  const [layout, setLayout] = React.useState<AppDashboardLayout | null>(null);
  const [layoutError, setLayoutError] = React.useState<string | null>(null);
  const saveQueueRef = React.useRef<Promise<void>>(Promise.resolve());
  const widgetIds = React.useMemo(
    () => catalog.widgets.map((widget) => widget.id),
    [catalog]
  );
  const defaultSizes = React.useMemo(
    () => Object.fromEntries(catalog.widgets.map((widget) => [widget.id, widget.defaultSize])),
    [catalog]
  );

  React.useEffect(() => {
    let active = true;
    Promise.resolve().then(() => layoutStore.load(layoutKey)).then((stored) => {
      if (!active) return;
      setLayout(reconcileAppDashboardLayout(
        stored ?? createDefaultAppDashboardLayout(widgetIds, defaultSizes),
        widgetIds,
        defaultSizes
      ));
    }).catch((error: unknown) => {
      if (!active) return;
      const normalized = error instanceof Error ? error : new Error('The dashboard layout could not be loaded.');
      setLayoutError(normalized.message);
      onLayoutError?.(normalized);
      setLayout(createDefaultAppDashboardLayout(widgetIds, defaultSizes));
    });
    return () => {
      active = false;
    };
  }, [defaultSizes, layoutKey, layoutStore, onLayoutError, widgetIds]);

  const updateLayout = React.useCallback((next: AppDashboardLayout) => {
    setLayout(next);
    saveQueueRef.current = saveQueueRef.current
      .then(() => layoutStore.save(layoutKey, next))
      .catch((error: unknown) => {
        const normalized = error instanceof Error ? error : new Error('The dashboard layout could not be saved.');
        setLayoutError(normalized.message);
        onLayoutError?.(normalized);
      });
  }, [layoutKey, layoutStore, onLayoutError]);

  if (!layout) {
    return (
      <div aria-label="Loading dashboard layout" className="grid grid-cols-2 gap-4" role="status">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {layoutError ? (
        <Alert variant="destructive">
          <AlertTitle>Layout persistence failed</AlertTitle>
          <AlertDescription>{layoutError}</AlertDescription>
        </Alert>
      ) : null}
      <AppDashboard
        {...props}
        catalog={catalog}
        layout={layout}
        onLayoutChange={updateLayout}
      />
    </div>
  );
}
