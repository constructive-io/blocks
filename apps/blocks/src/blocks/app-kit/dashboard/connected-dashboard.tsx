'use client';

import * as React from 'react';
import type { AppQueryDefinition } from '../core/contracts';
import { useAppQuery } from '../core/runtime';
import {
  AppDashboard,
  createAppDashboardWidgetCatalog,
  type AppDashboardProps
} from './dashboard';
import {
  AppDashboardWidgetContent,
  type AppDashboardRowsPayload,
  type AppDashboardWidget,
  type AppDashboardWidgetState,
  type AppKpiWidgetDefinition,
  type AppKpiWidgetPayload,
  type AppRowsWidgetDefinition
} from './widgets';

export type ConnectedAppDashboardWidget<TInput> =
  | (AppKpiWidgetDefinition & Readonly<{
      query: AppQueryDefinition<TInput, AppKpiWidgetPayload>;
      input: TInput;
    }>)
  | (AppRowsWidgetDefinition & Readonly<{
      query: AppQueryDefinition<TInput, AppDashboardRowsPayload>;
      input: TInput;
    }>);

export interface ConnectedAppDashboardProps<TInput> extends Omit<
  AppDashboardProps,
  'catalog' | 'renderWidget'
> {
  widgets: readonly ConnectedAppDashboardWidget<TInput>[];
}

function stateFromResult<TPayload>(result: ReturnType<
  typeof useAppQuery<unknown, TPayload>
>): AppDashboardWidgetState<TPayload> {
  if (result.isPending) return { status: 'loading' };
  if (
    result.error?.appError.kind === 'authorization' ||
    result.error?.appError.kind === 'authentication'
  ) {
    return { status: 'denied', message: result.error.message };
  }
  if (result.error) return { status: 'error', message: result.error.message };
  return { status: 'ready', value: result.data! };
}

function ConnectedKpiWidgetContent<TInput>({
  widget
}: {
  widget: AppKpiWidgetDefinition & Readonly<{
    query: AppQueryDefinition<TInput, AppKpiWidgetPayload>;
    input: TInput;
  }>;
}) {
  const result = useAppQuery(widget.query, widget.input);
  const { query: _query, input: _input, ...definition } = widget;
  const resolved: AppDashboardWidget = {
    ...definition,
    state: stateFromResult(result)
  };
  return <AppDashboardWidgetContent widget={resolved} />;
}

function ConnectedRowsWidgetContent<TInput>({
  widget
}: {
  widget: AppRowsWidgetDefinition & Readonly<{
    query: AppQueryDefinition<TInput, AppDashboardRowsPayload>;
    input: TInput;
  }>;
}) {
  const result = useAppQuery(widget.query, widget.input);
  const { query: _query, input: _input, ...definition } = widget;
  let state = stateFromResult(result);
  if (
    state.status === 'ready'
    && Array.isArray(state.value.rows)
    && state.value.rows.length === 0
  ) {
    state = { status: 'empty' };
  }
  const resolved: AppDashboardWidget = { ...definition, state };
  return <AppDashboardWidgetContent widget={resolved} />;
}

function ConnectedWidgetContent<TInput>({
  widget
}: {
  widget: ConnectedAppDashboardWidget<TInput>;
}) {
  return widget.kind === 'kpi'
    ? <ConnectedKpiWidgetContent widget={widget} />
    : <ConnectedRowsWidgetContent widget={widget} />;
}

function catalogWidget<TInput>(
  widget: ConnectedAppDashboardWidget<TInput>
): AppDashboardWidget {
  if (widget.kind === 'kpi') {
    const { query: _query, input: _input, ...definition } = widget;
    return { ...definition, state: { status: 'loading' } };
  }
  const { query: _query, input: _input, ...definition } = widget;
  return { ...definition, state: { status: 'loading' } };
}

/**
 * Connects each catalog-owned presentation definition to an inert value/row
 * query. Loader output is validated before any key reaches a renderer.
 */
export function ConnectedAppDashboard<TInput>({
  widgets,
  ...props
}: ConnectedAppDashboardProps<TInput>) {
  const catalog = React.useMemo(
    () => createAppDashboardWidgetCatalog(widgets.map(catalogWidget)),
    [widgets]
  );
  const definitions = React.useMemo(
    () => new Map(widgets.map((widget) => [widget.id, widget])),
    [widgets]
  );

  return (
    <AppDashboard
      {...props}
      catalog={catalog}
      renderWidget={(widget) => {
        const definition = definitions.get(widget.id);
        return definition ? <ConnectedWidgetContent widget={definition} /> : null;
      }}
    />
  );
}
