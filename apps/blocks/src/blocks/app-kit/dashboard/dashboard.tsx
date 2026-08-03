'use client';

import * as React from 'react';
import {
  EyeIcon,
  MoreHorizontalIcon,
  MoveLeftIcon,
  MoveRightIcon,
  PanelTopCloseIcon,
  ScalingIcon
} from 'lucide-react';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@constructive-io/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  APP_DASHBOARD_LAYOUT_VERSION,
  type AppDashboardLayout,
  type AppDashboardPlacement,
  type AppDashboardWidgetSize,
  reconcileAppDashboardLayout
} from './layout-store';
import {
  APP_DASHBOARD_CHART_TOKENS,
  AppDashboardWidgetContent,
  isAppDashboardDataKey,
  type AppDashboardWidget,
  type AppDashboardWidgetDefinition
} from './widgets';

export interface AppDashboardWidgetCatalog {
  readonly widgets: readonly AppDashboardWidget[];
  get(widgetId: string): AppDashboardWidget | undefined;
}

const SAFE_WIDGET_ID = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u;

function assertUniqueKeys(keys: readonly string[], context: string) {
  if (new Set(keys).size !== keys.length) {
    throw new Error(`${context} keys must be unique.`);
  }
}

function assertDataKey(key: string, context: string) {
  if (!isAppDashboardDataKey(key)) {
    throw new Error(`${context} key "${key}" must be a safe CSS and row identifier.`);
  }
}

function validateWidgetDefinition(widget: AppDashboardWidgetDefinition) {
  if (!SAFE_WIDGET_ID.test(widget.id)) {
    throw new Error(`Dashboard widget id "${widget.id}" is invalid.`);
  }
  if (!widget.title.trim()) {
    throw new Error(`Dashboard widget "${widget.id}" needs a title.`);
  }
  if (widget.kind === 'kpi') {
    if (widget.formatValue !== undefined && typeof widget.formatValue !== 'function') {
      throw new Error(`Dashboard widget "${widget.id}" has an invalid value formatter.`);
    }
    if (widget.formatChange !== undefined && typeof widget.formatChange !== 'function') {
      throw new Error(`Dashboard widget "${widget.id}" has an invalid change formatter.`);
    }
    return;
  }
  if (widget.kind === 'breakdown') {
    if (widget.columns.length === 0) {
      throw new Error(`Dashboard widget "${widget.id}" needs at least one breakdown column.`);
    }
    assertUniqueKeys(widget.columns.map((column) => column.key), `Dashboard widget "${widget.id}" column`);
    for (const column of widget.columns) {
      assertDataKey(column.key, `Dashboard widget "${widget.id}" column`);
      if (!column.label.trim()) {
        throw new Error(`Dashboard widget "${widget.id}" column "${column.key}" needs a label.`);
      }
      if (column.format !== undefined && typeof column.format !== 'function') {
        throw new Error(`Dashboard widget "${widget.id}" column "${column.key}" has an invalid formatter.`);
      }
    }
    return;
  }

  assertDataKey(widget.xKey, `Dashboard widget "${widget.id}" x-axis`);
  if (widget.series.length === 0) {
    throw new Error(`Dashboard widget "${widget.id}" needs at least one chart series.`);
  }
  assertUniqueKeys(widget.series.map((series) => series.key), `Dashboard widget "${widget.id}" series`);
  for (const series of widget.series) {
    assertDataKey(series.key, `Dashboard widget "${widget.id}" series`);
    if (!series.label.trim()) {
      throw new Error(`Dashboard widget "${widget.id}" series "${series.key}" needs a label.`);
    }
    if (series.key === widget.xKey) {
      throw new Error(`Dashboard widget "${widget.id}" cannot reuse its x-axis key as a series key.`);
    }
    if (!APP_DASHBOARD_CHART_TOKENS.includes(series.color)) {
      throw new Error(`Dashboard widget "${widget.id}" series "${series.key}" uses an unsupported chart token.`);
    }
  }
}

export function createAppDashboardWidgetCatalog(
  widgets: readonly AppDashboardWidget[]
): AppDashboardWidgetCatalog {
  const byId = new Map<string, AppDashboardWidget>();
  for (const widget of widgets) {
    validateWidgetDefinition(widget);
    if (byId.has(widget.id)) {
      throw new Error(`Duplicate dashboard widget id: ${widget.id}`);
    }
    byId.set(widget.id, widget);
  }

  return Object.freeze({
    widgets: Object.freeze([...widgets]),
    get(widgetId: string) {
      return byId.get(widgetId);
    }
  });
}

export interface AppDashboardProps {
  catalog: AppDashboardWidgetCatalog;
  layout: AppDashboardLayout;
  onLayoutChange?: (layout: AppDashboardLayout) => void;
  renderWidget?: (widget: AppDashboardWidget) => React.ReactNode;
  density?: 'compact' | 'comfortable';
  surface?: 'page' | 'card' | 'embedded';
  className?: string;
}

const SIZE_ORDER: readonly AppDashboardWidgetSize[] = [
  'third',
  'half',
  'wide',
  'full'
];

const SIZE_CLASS: Record<AppDashboardWidgetSize, string> = {
  third: 'lg:col-span-4',
  half: 'md:col-span-6',
  wide: 'lg:col-span-8',
  full: 'col-span-12'
};

function replacePlacement(
  layout: AppDashboardLayout,
  widgetId: string,
  update: (placement: AppDashboardPlacement) => AppDashboardPlacement
): AppDashboardLayout {
  return {
    version: APP_DASHBOARD_LAYOUT_VERSION,
    placements: layout.placements.map((placement) => (
      placement.widgetId === widgetId ? update(placement) : placement
    ))
  };
}

function reorderPlacement(
  layout: AppDashboardLayout,
  widgetId: string,
  direction: -1 | 1
): AppDashboardLayout {
  const placements = [...layout.placements].sort((left, right) => left.order - right.order);
  const index = placements.findIndex((placement) => placement.widgetId === widgetId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= placements.length) return layout;
  [placements[index], placements[target]] = [placements[target]!, placements[index]!];
  return {
    version: APP_DASHBOARD_LAYOUT_VERSION,
    placements: placements.map((placement, order) => ({ ...placement, order }))
  };
}

function AppDashboardControls({
  widget,
  placement,
  layout,
  onLayoutChange
}: {
  widget: AppDashboardWidget;
  placement: AppDashboardPlacement;
  layout: AppDashboardLayout;
  onLayoutChange: (layout: AppDashboardLayout) => void;
}) {
  const ordered = [...layout.placements].sort((left, right) => left.order - right.order);
  const index = ordered.findIndex((item) => item.widgetId === widget.id);
  const sizeIndex = SIZE_ORDER.indexOf(placement.size);
  const nextSize = SIZE_ORDER[(sizeIndex + 1) % SIZE_ORDER.length]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={`Customize ${widget.title}`} size="icon-xs" variant="ghost">
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Arrange widget</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={index <= 0}
            onClick={() => onLayoutChange(reorderPlacement(layout, widget.id, -1))}
          >
            <MoveLeftIcon />
            Move earlier
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index >= ordered.length - 1}
            onClick={() => onLayoutChange(reorderPlacement(layout, widget.id, 1))}
          >
            <MoveRightIcon />
            Move later
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onLayoutChange(replacePlacement(
              layout,
              widget.id,
              (current) => ({ ...current, size: nextSize })
            ))}
          >
            <ScalingIcon />
            Resize to {nextSize}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => onLayoutChange(replacePlacement(
              layout,
              widget.id,
              (current) => ({ ...current, hidden: true })
            ))}
          >
            <PanelTopCloseIcon />
            Hide widget
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A controlled dashboard that renders only widgets from its approved catalog. */
export function AppDashboard({
  catalog,
  layout: layoutProp,
  onLayoutChange,
  renderWidget,
  density = 'comfortable',
  surface = 'page',
  className
}: AppDashboardProps) {
  const layout = React.useMemo(
    () => reconcileAppDashboardLayout(
      layoutProp,
      catalog.widgets.map((widget) => widget.id),
      Object.fromEntries(catalog.widgets.map((widget) => [widget.id, widget.defaultSize]))
    ),
    [catalog, layoutProp]
  );
  const placements = [...layout.placements].sort((left, right) => left.order - right.order);
  const hidden = placements.filter((placement) => placement.hidden);

  return (
    <section
      aria-label="Dashboard"
      className={cn('flex flex-col gap-4', className)}
      data-density={density}
      data-surface={surface}
    >
      {onLayoutChange && hidden.length > 0 ? (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <EyeIcon data-icon="inline-start" />
                Hidden widgets ({hidden.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Restore widget</DropdownMenuLabel>
                {hidden.map((placement) => (
                  <DropdownMenuItem
                    key={placement.widgetId}
                    onClick={() => onLayoutChange(replacePlacement(
                      layout,
                      placement.widgetId,
                      (current) => ({ ...current, hidden: false })
                    ))}
                  >
                    <EyeIcon />
                    {catalog.get(placement.widgetId)?.title ?? placement.widgetId}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-4">
        {placements.map((placement) => {
          if (placement.hidden) return null;
          const widget = catalog.get(placement.widgetId);
          if (!widget) return null;

          return (
            <Card
              className={cn('col-span-12 min-w-0', SIZE_CLASS[placement.size])}
              key={widget.id}
              variant={surface === 'embedded' ? 'flat' : 'default'}
            >
              <CardHeader className={density === 'compact' ? 'px-4' : undefined}>
                <CardTitle>{widget.title}</CardTitle>
                {widget.description ? (
                  <CardDescription>{widget.description}</CardDescription>
                ) : null}
                {onLayoutChange ? (
                  <CardAction>
                    <AppDashboardControls
                      layout={layout}
                      onLayoutChange={onLayoutChange}
                      placement={placement}
                      widget={widget}
                    />
                  </CardAction>
                ) : null}
              </CardHeader>
              <CardContent className={density === 'compact' ? 'px-4' : undefined}>
                {renderWidget?.(widget) ?? (
                  <AppDashboardWidgetContent widget={widget} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
