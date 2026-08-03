'use client';

import * as React from 'react';
import { ChevronRightIcon } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import { Checkbox } from '@constructive-io/ui/checkbox';
import { Separator } from '@constructive-io/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@constructive-io/ui/table';

import { AppRuntimeError, useAppQuery } from '../core/runtime';
import type { AppError } from '../core';

import { AppDataStateView } from './states';
import {
  columnsFromResource,
  type AppCollectionPage,
  type AppCollectionViewProps,
  type AppColumn,
  type AppDataState,
  type ConnectedAppCollectionProps
} from './types';

export function formatAppValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className='text-muted-foreground'>—</span>;
  }
  if (typeof value === 'boolean') {
    return <Badge variant='outline'>{value ? 'Yes' : 'No'}</Badge>;
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? (
      <span className='text-muted-foreground'>—</span>
    ) : (
      <span>{value.map(String).join(', ')}</span>
    );
  }
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'object') {
    return <span className='text-muted-foreground'>Structured value</span>;
  }
  return String(value);
}

function columnValue<TRecord extends Record<string, unknown>>(
  column: AppColumn<TRecord>,
  record: TRecord
) {
  if (column.render) return column.render(record);
  return formatAppValue(column.field ? record[column.field] : undefined);
}

function queryError(error: unknown): AppError {
  if (error instanceof AppRuntimeError) return error.appError;
  return {
    kind: 'unknown',
    message: error instanceof Error ? error.message : 'Records could not be loaded.'
  };
}

function toDataState<TRecord>(query: {
  data?: AppCollectionPage<TRecord>;
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  isFetching: boolean;
}): AppDataState<AppCollectionPage<TRecord>> {
  if (query.isLoading) return { status: 'loading' };
  if (query.isError) {
    const error = queryError(query.error);
    return error.kind === 'authorization' || error.kind === 'authentication'
      ? { error, status: 'denied' }
      : { error, status: 'error' };
  }
  if (!query.data || query.data.items.length === 0) return { status: 'empty' };
  return { data: query.data, refreshing: query.isFetching, status: 'ready' };
}

function CollectionFrame({
  label,
  description,
  surface,
  toolbar,
  footer,
  children,
  className
}: Readonly<{
  label: string;
  description: string;
  surface: AppCollectionViewProps<Record<string, unknown>>['surface'];
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}>) {
  if (surface === 'card') {
    return (
      <Card className={className} variant='flat'>
        <CardHeader>
          <CardTitle>{label}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {toolbar ? <CardContent>{toolbar}</CardContent> : null}
        <CardContent>{children}</CardContent>
        {footer ? <CardFooter>{footer}</CardFooter> : null}
      </Card>
    );
  }

  return (
    <section
      aria-label={label}
      className={className}
      data-surface={surface ?? 'page'}
    >
      {toolbar ? <div className='mb-4'>{toolbar}</div> : null}
      {children}
      {footer ? (
        <>
          <Separator className='my-4' />
          {footer}
        </>
      ) : null}
    </section>
  );
}

function selectionFor(
  selectedKeys: readonly string[] | undefined,
  key: string,
  checked: boolean
) {
  const selected = new Set(selectedKeys ?? []);
  if (checked) selected.add(key);
  else selected.delete(key);
  return [...selected];
}

export function AppDataTable<TRecord extends Record<string, unknown>>({
  resource,
  state,
  columns = columnsFromResource(resource),
  getRowKey,
  density = 'comfortable',
  surface = 'page',
  selectedKeys,
  onSelectionChange,
  onOpenRecord,
  onRetry,
  toolbar,
  footer,
  renderFooter,
  className
}: AppCollectionViewProps<TRecord>) {
  return (
    <CollectionFrame
      className={className}
      description={`Browse ${resource.pluralLabel.toLocaleLowerCase()}.`}
      footer={state.status === 'ready' ? renderFooter?.(state.data) ?? footer : footer}
      label={resource.pluralLabel}
      surface={surface}
      toolbar={toolbar}
    >
      <AppDataStateView
        emptyDescription={`No ${resource.pluralLabel.toLocaleLowerCase()} match this view.`}
        emptyTitle={`No ${resource.pluralLabel.toLocaleLowerCase()}`}
        onRetry={onRetry}
        state={state}
      >
        {(page) => (
          <div
            className='overflow-x-auto rounded-lg border data-[density=compact]:[&_td]:py-1 data-[density=compact]:[&_th]:h-8'
            data-density={density}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {onSelectionChange ? (
                    <TableHead className='w-12'>
                      <span className='sr-only'>Select records</span>
                    </TableHead>
                  ) : null}
                  {columns.map((column) => (
                    <TableHead
                      className='data-[align=center]:text-center data-[align=end]:text-end data-[hide-below=lg]:hidden data-[hide-below=md]:hidden data-[hide-below=sm]:hidden sm:data-[hide-below=sm]:table-cell md:data-[hide-below=md]:table-cell lg:data-[hide-below=lg]:table-cell'
                      data-align={column.align ?? 'start'}
                      data-hide-below={column.hideBelow}
                      key={column.id}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                  {onOpenRecord ? (
                    <TableHead className='w-12'>
                      <span className='sr-only'>Open record</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((record) => {
                  const rowKey = getRowKey(record);
                  const checked = selectedKeys?.includes(rowKey) ?? false;
                  return (
                    <TableRow
                      data-state={checked ? 'selected' : undefined}
                      key={rowKey}
                    >
                      {onSelectionChange ? (
                        <TableCell>
                          <Checkbox
                            aria-label={`Select ${String(record[resource.displayField] ?? resource.label)}`}
                            checked={checked}
                            onCheckedChange={(nextChecked) =>
                              onSelectionChange(
                                selectionFor(selectedKeys, rowKey, nextChecked)
                              )
                            }
                          />
                        </TableCell>
                      ) : null}
                      {columns.map((column) => (
                        <TableCell
                          className='data-[align=center]:text-center data-[align=end]:text-end data-[hide-below=lg]:hidden data-[hide-below=md]:hidden data-[hide-below=sm]:hidden sm:data-[hide-below=sm]:table-cell md:data-[hide-below=md]:table-cell lg:data-[hide-below=lg]:table-cell'
                          data-align={column.align ?? 'start'}
                          data-hide-below={column.hideBelow}
                          key={column.id}
                        >
                          {columnValue(column, record)}
                        </TableCell>
                      ))}
                      {onOpenRecord ? (
                        <TableCell>
                          <Button
                            aria-label={`Open ${String(record[resource.displayField] ?? resource.label)}`}
                            onClick={() => onOpenRecord(record)}
                            size='icon-sm'
                            variant='ghost'
                          >
                            <ChevronRightIcon />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </AppDataStateView>
    </CollectionFrame>
  );
}

export function AppDataList<TRecord extends Record<string, unknown>>({
  resource,
  state,
  getRowKey,
  density = 'comfortable',
  surface = 'page',
  selectedKeys,
  onSelectionChange,
  onOpenRecord,
  onRetry,
  toolbar,
  footer,
  renderFooter,
  renderRecord,
  className
}: AppCollectionViewProps<TRecord>) {
  return (
    <CollectionFrame
      className={className}
      description={`Browse ${resource.pluralLabel.toLocaleLowerCase()}.`}
      footer={state.status === 'ready' ? renderFooter?.(state.data) ?? footer : footer}
      label={resource.pluralLabel}
      surface={surface}
      toolbar={toolbar}
    >
      <AppDataStateView onRetry={onRetry} state={state}>
        {(page) => (
          <ul
            className='divide-y rounded-lg border data-[density=compact]:[&_li]:p-2'
            data-density={density}
          >
            {page.items.map((record) => {
              const rowKey = getRowKey(record);
              const title = String(record[resource.displayField] ?? resource.label);
              return (
                <li
                  className='flex min-w-0 items-center gap-3 p-4 data-[density=compact]:p-2'
                  key={rowKey}
                >
                  {onSelectionChange ? (
                    <Checkbox
                      aria-label={`Select ${title}`}
                      checked={selectedKeys?.includes(rowKey) ?? false}
                      onCheckedChange={(checked) =>
                        onSelectionChange(selectionFor(selectedKeys, rowKey, checked))
                      }
                    />
                  ) : null}
                  <div className='min-w-0 flex-1'>
                    {renderRecord ? (
                      renderRecord(record)
                    ) : (
                      <>
                        <p className='truncate font-medium'>{title}</p>
                        <p className='truncate text-sm text-muted-foreground'>
                          {resource.fields
                            .filter((field) => field.key !== resource.displayField)
                            .slice(0, 2)
                            .map((field) => String(record[field.key] ?? ''))
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </>
                    )}
                  </div>
                  {onOpenRecord ? (
                    <Button onClick={() => onOpenRecord(record)} size='sm' variant='ghost'>
                      Open
                      <ChevronRightIcon data-icon='inline-end' />
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </AppDataStateView>
    </CollectionFrame>
  );
}

export function AppDataCards<TRecord extends Record<string, unknown>>({
  resource,
  state,
  getRowKey,
  density = 'comfortable',
  surface = 'page',
  onOpenRecord,
  onRetry,
  toolbar,
  footer,
  renderFooter,
  renderRecord,
  className
}: AppCollectionViewProps<TRecord>) {
  return (
    <CollectionFrame
      className={className}
      description={`Browse ${resource.pluralLabel.toLocaleLowerCase()}.`}
      footer={state.status === 'ready' ? renderFooter?.(state.data) ?? footer : footer}
      label={resource.pluralLabel}
      surface={surface}
      toolbar={toolbar}
    >
      <AppDataStateView onRetry={onRetry} state={state}>
        {(page) => (
          <div
            className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'
            data-density={density}
          >
            {page.items.map((record) => {
              const title = String(record[resource.displayField] ?? resource.label);
              return (
                <Card key={getRowKey(record)} variant={onOpenRecord ? 'interactive' : 'flat'}>
                  <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{resource.label}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderRecord
                      ? renderRecord(record)
                      : resource.fields
                          .filter((field) => field.key !== resource.displayField)
                          .slice(0, density === 'compact' ? 2 : 4)
                          .map((field) => (
                            <div className='grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-1 text-sm' key={field.key}>
                              <span className='text-muted-foreground'>{field.label}</span>
                              <span className='min-w-0 truncate text-end'>
                                {formatAppValue(record[field.key])}
                              </span>
                            </div>
                          ))}
                  </CardContent>
                  {onOpenRecord ? (
                    <CardFooter>
                      <Button onClick={() => onOpenRecord(record)} size='sm' variant='outline'>
                        Open {resource.label.toLocaleLowerCase()}
                        <ChevronRightIcon data-icon='inline-end' />
                      </Button>
                    </CardFooter>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </AppDataStateView>
    </CollectionFrame>
  );
}

function useConnectedCollection<TRecord extends Record<string, unknown>>(
  props: ConnectedAppCollectionProps<TRecord>
) {
  const query = useAppQuery(props.query, props.queryInput, {
    enabled: props.enabled
  });
  return {
    retry: () => void query.refetch(),
    state: toDataState(query)
  };
}

export function ConnectedAppDataTable<
  TRecord extends Record<string, unknown>
>(props: ConnectedAppCollectionProps<TRecord>) {
  const { query: _query, queryInput: _queryInput, enabled: _enabled, ...viewProps } = props;
  const connected = useConnectedCollection(props);
  return <AppDataTable {...viewProps} onRetry={connected.retry} state={connected.state} />;
}

export function ConnectedAppDataList<
  TRecord extends Record<string, unknown>
>(props: ConnectedAppCollectionProps<TRecord>) {
  const { query: _query, queryInput: _queryInput, enabled: _enabled, ...viewProps } = props;
  const connected = useConnectedCollection(props);
  return <AppDataList {...viewProps} onRetry={connected.retry} state={connected.state} />;
}

export function ConnectedAppDataCards<
  TRecord extends Record<string, unknown>
>(props: ConnectedAppCollectionProps<TRecord>) {
  const { query: _query, queryInput: _queryInput, enabled: _enabled, ...viewProps } = props;
  const connected = useConnectedCollection(props);
  return <AppDataCards {...viewProps} onRetry={connected.retry} state={connected.state} />;
}
