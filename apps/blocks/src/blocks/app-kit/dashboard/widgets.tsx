'use client';

import * as React from 'react';
import {
  barY,
  defineChart,
  group,
  lineY
} from '@tanstack/charts';
import { tooltip } from '@tanstack/charts/tooltip';
import { scaleBand } from '@tanstack/charts-scales/band';
import { scaleLinear } from '@tanstack/charts-scales/linear';
import { Chart } from '@tanstack/react-charts';
import { ChartNoAxesCombinedIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Badge } from '@constructive-io/ui/badge';
import { CONSTRUCTIVE_CHART_THEME } from '@constructive-io/ui/chart';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@constructive-io/ui/empty';
import { Skeleton } from '@constructive-io/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@constructive-io/ui/table';
import type { AppDashboardWidgetSize } from './layout-store';

export const APP_DASHBOARD_CHART_TOKENS = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5'
] as const;

export type AppDashboardChartToken = typeof APP_DASHBOARD_CHART_TOKENS[number];
export type AppDashboardCellValue = string | number | boolean | null;
export type AppDashboardRow = Readonly<Record<string, AppDashboardCellValue>>;

/** Inert values returned by a KPI query. Formatting stays in the catalog. */
export interface AppKpiWidgetPayload {
  value: number | string;
  change?: number | string;
  changeLabel?: string;
}

/** Inert rows returned by chart and breakdown queries. */
export interface AppDashboardRowsPayload {
  rows: readonly Readonly<Record<string, unknown>>[];
}

export type AppDashboardWidgetPayload = AppKpiWidgetPayload | AppDashboardRowsPayload;

interface AppDashboardWidgetDefinitionBase {
  id: string;
  title: string;
  description?: string;
  defaultSize?: AppDashboardWidgetSize;
  emptyMessage?: string;
}

export interface AppKpiWidgetDefinition extends AppDashboardWidgetDefinitionBase {
  kind: 'kpi';
  formatValue?: (value: number | string) => React.ReactNode;
  formatChange?: (change: number | string) => React.ReactNode;
}

export interface AppChartSeriesDefinition {
  /** A safe CSS identifier and the exact loader-row key. */
  key: string;
  label: string;
  color: AppDashboardChartToken;
}

interface AppChartWidgetDefinitionBase extends AppDashboardWidgetDefinitionBase {
  xKey: string;
  series: readonly AppChartSeriesDefinition[];
}

export interface AppBarWidgetDefinition extends AppChartWidgetDefinitionBase {
  kind: 'bar';
}

export interface AppLineWidgetDefinition extends AppChartWidgetDefinitionBase {
  kind: 'line';
}

export interface AppBreakdownColumnDefinition {
  key: string;
  label: string;
  align?: 'left' | 'right';
  format?: (value: AppDashboardCellValue, row: AppDashboardRow) => React.ReactNode;
}

export interface AppBreakdownWidgetDefinition extends AppDashboardWidgetDefinitionBase {
  kind: 'breakdown';
  columns: readonly AppBreakdownColumnDefinition[];
  getRowId?: (row: AppDashboardRow, index: number) => string;
}

export type AppRowsWidgetDefinition =
  | AppBarWidgetDefinition
  | AppLineWidgetDefinition
  | AppBreakdownWidgetDefinition;

export type AppDashboardWidgetDefinition =
  | AppKpiWidgetDefinition
  | AppRowsWidgetDefinition;

export type AppDashboardWidgetState<TPayload = AppDashboardWidgetPayload> =
  | { status: 'loading' }
  | { status: 'empty'; message?: string }
  | { status: 'denied'; message?: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; value: TPayload };

export type AppDashboardWidget =
  | (AppKpiWidgetDefinition & { state: AppDashboardWidgetState<AppKpiWidgetPayload> })
  | (AppRowsWidgetDefinition & { state: AppDashboardWidgetState<AppDashboardRowsPayload> });

export type AppDashboardPayloadValidation<TValue> =
  | Readonly<{ status: 'ready'; value: TValue }>
  | Readonly<{ status: 'empty' }>
  | Readonly<{ status: 'error'; message: string }>;

const SAFE_DATA_KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/u;
const RESERVED_DATA_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isAppDashboardDataKey(value: string) {
  return SAFE_DATA_KEY.test(value) && !RESERVED_DATA_KEYS.has(value);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function ownKeysExactly(
  value: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
  context: string
): string | null {
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  return unexpected.length > 0
    ? `${context} returned unexpected ${unexpected.length === 1 ? 'key' : 'keys'}: ${unexpected.join(', ')}.`
    : null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateKpiPayload(
  payload: unknown
): AppDashboardPayloadValidation<AppKpiWidgetPayload> {
  if (!isRecord(payload)) {
    return { status: 'error', message: 'The KPI query must return an object with a value.' };
  }
  const unexpected = ownKeysExactly(
    payload,
    new Set(['value', 'change', 'changeLabel']),
    'The KPI query'
  );
  if (unexpected) return { status: 'error', message: unexpected };
  if (typeof payload.value !== 'string' && !finiteNumber(payload.value)) {
    return { status: 'error', message: 'The KPI value must be a string or finite number.' };
  }
  if (
    payload.change !== undefined
    && typeof payload.change !== 'string'
    && !finiteNumber(payload.change)
  ) {
    return { status: 'error', message: 'The KPI change must be a string or finite number.' };
  }
  if (payload.changeLabel !== undefined && typeof payload.changeLabel !== 'string') {
    return { status: 'error', message: 'The KPI change label must be a string.' };
  }
  const change = payload.change;
  const changeLabel = payload.changeLabel;
  return {
    status: 'ready',
    value: {
      value: payload.value,
      ...(change !== undefined ? { change } : {}),
      ...(changeLabel !== undefined ? { changeLabel } : {})
    }
  };
}

type AppDashboardCellValidation =
  | Readonly<{ ok: true; value: AppDashboardCellValue }>
  | Readonly<{ ok: false; message: string }>;

function validateRowValue(
  definition: AppRowsWidgetDefinition,
  key: string,
  value: unknown,
  rowIndex: number
): AppDashboardCellValidation {
  if (definition.kind === 'breakdown') {
    if (
      value === null
      || typeof value === 'string'
      || typeof value === 'boolean'
      || finiteNumber(value)
    ) return { ok: true, value };
    return {
      ok: false,
      message: `Row ${rowIndex + 1} key "${key}" must be a scalar value.`
    };
  }

  if (key === definition.xKey) {
    if (typeof value === 'string' || finiteNumber(value)) {
      return { ok: true, value };
    }
    return {
      ok: false,
      message: `Row ${rowIndex + 1} x-axis key "${key}" must be a string or finite number.`
    };
  }
  if (value === null || finiteNumber(value)) return { ok: true, value };
  return {
    ok: false,
    message: `Row ${rowIndex + 1} series key "${key}" must be a finite number or null.`
  };
}

function validateRowsPayload(
  definition: AppRowsWidgetDefinition,
  payload: unknown
): AppDashboardPayloadValidation<readonly AppDashboardRow[]> {
  if (!isRecord(payload)) {
    return { status: 'error', message: 'The widget query must return an object with rows.' };
  }
  const unexpectedPayloadKey = ownKeysExactly(payload, new Set(['rows']), 'The widget query');
  if (unexpectedPayloadKey) return { status: 'error', message: unexpectedPayloadKey };
  if (!Array.isArray(payload.rows)) {
    return { status: 'error', message: 'The widget query rows must be an array.' };
  }
  if (payload.rows.length === 0) return { status: 'empty' };

  const keys = definition.kind === 'breakdown'
    ? definition.columns.map((column) => column.key)
    : [definition.xKey, ...definition.series.map((series) => series.key)];
  const allowed = new Set(keys);
  const sanitized: AppDashboardRow[] = [];
  for (const [rowIndex, candidate] of payload.rows.entries()) {
    if (!isRecord(candidate)) {
      return { status: 'error', message: `Row ${rowIndex + 1} must be an object.` };
    }
    const unexpected = ownKeysExactly(candidate, allowed, `Row ${rowIndex + 1}`);
    if (unexpected) return { status: 'error', message: unexpected };
    const missing = keys.filter((key) => !Object.hasOwn(candidate, key));
    if (missing.length > 0) {
      return {
        status: 'error',
        message: `Row ${rowIndex + 1} is missing ${missing.length === 1 ? 'key' : 'keys'}: ${missing.join(', ')}.`
      };
    }

    const row: Record<string, AppDashboardCellValue> = {};
    for (const key of keys) {
      const validation = validateRowValue(definition, key, candidate[key], rowIndex);
      if (!validation.ok) {
        return { status: 'error', message: validation.message };
      }
      row[key] = validation.value;
    }
    sanitized.push(Object.freeze(row));
  }
  return { status: 'ready', value: Object.freeze(sanitized) };
}

export function validateAppDashboardWidgetPayload(
  definition: AppKpiWidgetDefinition,
  payload: unknown
): AppDashboardPayloadValidation<AppKpiWidgetPayload>;
export function validateAppDashboardWidgetPayload(
  definition: AppRowsWidgetDefinition,
  payload: unknown
): AppDashboardPayloadValidation<readonly AppDashboardRow[]>;
export function validateAppDashboardWidgetPayload(
  definition: AppDashboardWidgetDefinition,
  payload: unknown
): AppDashboardPayloadValidation<AppKpiWidgetPayload | readonly AppDashboardRow[]> {
  return definition.kind === 'kpi'
    ? validateKpiPayload(payload)
    : validateRowsPayload(definition, payload);
}

function WidgetLoading() {
  return (
    <div aria-label="Loading widget" className="flex flex-col gap-3" role="status">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function WidgetEmpty({ message }: { message: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon"><ChartNoAxesCombinedIcon /></EmptyMedia>
        <EmptyTitle>No data</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function WidgetUnavailable({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function AppKpiWidget({
  definition,
  data
}: {
  definition: AppKpiWidgetDefinition;
  data: AppKpiWidgetPayload;
}) {
  const value = definition.formatValue?.(data.value) ?? String(data.value);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      {data.change !== undefined ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {definition.formatChange?.(data.change) ?? String(data.change)}
          </Badge>
          {data.changeLabel ? (
            <span className="text-muted-foreground text-pretty text-xs">
              {data.changeLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface AppChartDatum {
  category: string;
  key: string;
  seriesKey: string;
  value: number | null;
}

function appChartData(
  definition: AppBarWidgetDefinition | AppLineWidgetDefinition,
  rows: readonly AppDashboardRow[]
): readonly AppChartDatum[] {
  return rows.flatMap((row, rowIndex) => definition.series.map((series) => ({
    category: String(row[definition.xKey]),
    key: `${rowIndex}:${series.key}`,
    seriesKey: series.key,
    value: row[series.key] as number | null
  })));
}

function chartTooltip(
  definition: AppBarWidgetDefinition | AppLineWidgetDefinition
) {
  const labels = new Map(definition.series.map((series) => [series.key, series.label]));
  return {
    use: tooltip,
    items: [
      { channel: 'x' as const, label: 'Category' },
      {
        channel: 'group' as const,
        label: 'Series',
        text: (point: { group: string | number | null; groupLabel: string }) => (
          point.group === null ? point.groupLabel : (labels.get(String(point.group)) ?? point.groupLabel)
        )
      },
      { channel: 'y' as const, label: 'Value' }
    ],
    sort: 'color-domain' as const
  };
}

function AppChartLegend({
  definition
}: {
  definition: AppBarWidgetDefinition | AppLineWidgetDefinition;
}) {
  return (
    <ul
      aria-label={`${definition.title} legend`}
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-3 text-xs text-muted-foreground"
    >
      {definition.series.map((series) => (
        <li className="flex items-center gap-1.5" key={series.key}>
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: `var(--${series.color})` }}
          />
          <span>{series.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function AppBarWidget({
  definition,
  rows
}: {
  definition: AppBarWidgetDefinition;
  rows: readonly AppDashboardRow[];
}) {
  const labelId = React.useId();
  const chartRows = React.useMemo(() => appChartData(definition, rows), [definition, rows]);
  const chartDefinition = React.useMemo(() => defineChart({
    marks: [
      barY(chartRows, {
        x: 'category',
        y: 'value',
        color: 'seriesKey',
        key: 'key',
        layout: group({
          scale: scaleBand<string>()
            .domain(definition.series.map((series) => series.key))
            .paddingInner(0.12)
        }),
        inset: 1,
        radius: 4
      })
    ],
    x: {
      scale: () => scaleBand<string>().paddingInner(0.16).paddingOuter(0.08),
      axis: { tickLabels: { thin: { minGap: 8, priority: 'ends' } } }
    },
    y: {
      scale: scaleLinear,
      nice: true,
      grid: true,
      axis: { ticks: { count: 5 } }
    },
    color: {
      domain: definition.series.map((series) => series.key),
      range: definition.series.map((series) => `var(--${series.color})`)
    },
    theme: CONSTRUCTIVE_CHART_THEME,
    focus: 'group-x',
    tooltip: chartTooltip(definition)
  }), [chartRows, definition]);
  return (
    <figure aria-labelledby={labelId} className="min-h-64">
      <figcaption className="sr-only" id={labelId}>{definition.title}</figcaption>
      <Chart
        ariaDescription={definition.description}
        ariaLabel={definition.title}
        className="min-h-56 w-full text-xs"
        definition={chartDefinition}
        height={224}
        initialWidth={640}
      />
      <AppChartLegend definition={definition} />
    </figure>
  );
}

export function AppLineWidget({
  definition,
  rows
}: {
  definition: AppLineWidgetDefinition;
  rows: readonly AppDashboardRow[];
}) {
  const labelId = React.useId();
  const chartRows = React.useMemo(() => appChartData(definition, rows), [definition, rows]);
  const chartDefinition = React.useMemo(() => defineChart({
    marks: [
      lineY(chartRows, {
        x: 'category',
        y: 'value',
        z: 'seriesKey',
        color: 'seriesKey',
        key: 'key',
        strokeWidth: 2
      })
    ],
    x: {
      scale: () => scaleBand<string>().padding(0.08),
      axis: { tickLabels: { thin: { minGap: 8, priority: 'ends' } } }
    },
    y: {
      scale: scaleLinear,
      nice: true,
      grid: true,
      axis: { ticks: { count: 5 } }
    },
    color: {
      domain: definition.series.map((series) => series.key),
      range: definition.series.map((series) => `var(--${series.color})`)
    },
    theme: CONSTRUCTIVE_CHART_THEME,
    focus: 'group-x',
    tooltip: chartTooltip(definition)
  }), [chartRows, definition]);
  return (
    <figure aria-labelledby={labelId} className="min-h-64">
      <figcaption className="sr-only" id={labelId}>{definition.title}</figcaption>
      <Chart
        ariaDescription={definition.description}
        ariaLabel={definition.title}
        className="min-h-56 w-full text-xs"
        definition={chartDefinition}
        height={224}
        initialWidth={640}
      />
      <AppChartLegend definition={definition} />
    </figure>
  );
}

export function AppBreakdownWidget({
  definition,
  rows
}: {
  definition: AppBreakdownWidgetDefinition;
  rows: readonly AppDashboardRow[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {definition.columns.map((column) => (
            <TableHead className={column.align === 'right' ? 'text-right' : undefined} key={column.key}>
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={definition.getRowId?.(row, index) ?? String(index)}>
            {definition.columns.map((column) => {
              const value = row[column.key] ?? null;
              return (
                <TableCell
                  className={column.align === 'right' ? 'text-right tabular-nums' : undefined}
                  key={column.key}
                >
                  {column.format?.(value, row) ?? String(value ?? '—')}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AppDashboardWidgetContent({ widget }: { widget: AppDashboardWidget }) {
  if (widget.state.status === 'loading') return <WidgetLoading />;
  if (widget.state.status === 'empty') {
    return <WidgetEmpty message={widget.state.message ?? widget.emptyMessage ?? 'No rows matched this widget query.'} />;
  }
  if (widget.state.status === 'denied') {
    return (
      <WidgetUnavailable
        message={widget.state.message ?? 'You do not have permission to load this widget.'}
        title="Access denied"
      />
    );
  }
  if (widget.state.status === 'error') {
    return <WidgetUnavailable message={widget.state.message} title="Widget unavailable" />;
  }

  if (widget.kind === 'kpi') {
    const validation = validateAppDashboardWidgetPayload(widget, widget.state.value);
    if (validation.status === 'error') {
      return <WidgetUnavailable message={validation.message} title="Invalid widget data" />;
    }
    if (validation.status === 'empty') {
      return <WidgetEmpty message={widget.emptyMessage ?? 'No value was returned by this widget query.'} />;
    }
    return <AppKpiWidget data={validation.value} definition={widget} />;
  }
  const validation = validateAppDashboardWidgetPayload(widget, widget.state.value);
  if (validation.status === 'error') {
    return <WidgetUnavailable message={validation.message} title="Invalid widget data" />;
  }
  if (validation.status === 'empty') {
    return <WidgetEmpty message={widget.emptyMessage ?? 'No rows matched this widget query.'} />;
  }
  if (widget.kind === 'bar') return <AppBarWidget definition={widget} rows={validation.value} />;
  if (widget.kind === 'line') return <AppLineWidget definition={widget} rows={validation.value} />;
  return <AppBreakdownWidget definition={widget} rows={validation.value} />;
}
