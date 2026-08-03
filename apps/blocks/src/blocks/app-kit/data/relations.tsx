'use client';

import * as React from 'react';
import { LinkIcon, UnlinkIcon } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup
} from '@constructive-io/ui/combobox';
import { Field, FieldDescription, FieldLabel } from '@constructive-io/ui/field';
import { Separator } from '@constructive-io/ui/separator';

import type { AppError, AppQueryDefinition } from '../core';
import {
  createAppScopeFingerprint,
  useAppQuery,
  useAppScope
} from '../core/runtime';

import { AppDataStateView } from './states';
import type {
  AppDataState,
  AppRelationOption,
  AppRelationSearchQuery
} from './types';

export type AppRelationPickerProps<TRecord> = Readonly<{
  label: string;
  options: readonly AppRelationOption<TRecord>[];
  search: string;
  onSearchChange: (search: string) => void;
  value?: AppRelationOption<TRecord> | null;
  onValueChange: (option: AppRelationOption<TRecord> | null) => void;
  loading?: boolean;
  error?: AppError;
  hasMore?: boolean;
  onLoadMore?: () => void;
  disabled?: boolean;
  embedded?: boolean;
  inputId?: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
  required?: boolean;
  description?: string;
  placeholder?: string;
}>;

export function AppRelationPicker<TRecord>({
  label,
  options,
  search,
  onSearchChange,
  value,
  onValueChange,
  loading = false,
  error,
  hasMore = false,
  onLoadMore,
  disabled = false,
  embedded = false,
  inputId,
  ariaDescribedBy,
  invalid = false,
  required = false,
  description,
  placeholder
}: AppRelationPickerProps<TRecord>) {
  const labelId = React.useId();
  const generatedControlId = React.useId();
  const resolvedInputId = inputId ?? generatedControlId;
  const ownsLabel = !embedded || !inputId;
  const control = (
    <>
      <Combobox
        disabled={disabled}
        filter={null}
        inputValue={search}
        itemToStringValue={(option: AppRelationOption<TRecord>) => option.label}
        items={options}
        onInputValueChange={onSearchChange}
        onValueChange={(nextValue) => onValueChange(nextValue ?? null)}
        value={value ?? null}
      >
        <ComboboxInput
          aria-describedby={ariaDescribedBy}
          aria-invalid={invalid || Boolean(error)}
          aria-labelledby={ownsLabel ? labelId : undefined}
          aria-required={required}
          id={resolvedInputId}
          placeholder={placeholder ?? `Search ${label.toLocaleLowerCase()}`}
          showClear
        />
        <ComboboxPopup>
          <ComboboxEmpty>
            {loading ? 'Searching…' : 'No matching records.'}
          </ComboboxEmpty>
          <ComboboxList>
            {(option: AppRelationOption<TRecord>) => (
              <ComboboxItem key={option.value} value={option}>
                <span className='flex min-w-0 flex-col'>
                  <span className='truncate'>{option.label}</span>
                  {option.description ? (
                    <span className='truncate text-xs text-muted-foreground'>
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
          {hasMore && onLoadMore ? (
            <div className='border-t p-2'>
              <Button
                disabled={loading}
                onClick={onLoadMore}
                size='sm'
                variant='ghost'
              >
                Load more
              </Button>
            </div>
          ) : null}
        </ComboboxPopup>
      </Combobox>
      {error ? (
        <FieldDescription className='text-destructive' role='alert'>
          {error.message}
        </FieldDescription>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div className='flex flex-col gap-1.5'>
        {!inputId ? (
          <FieldLabel className='sr-only' htmlFor={resolvedInputId} id={labelId}>
            {label}
          </FieldLabel>
        ) : null}
        {control}
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </div>
    );
  }

  return (
    <Field
      data-disabled={disabled || undefined}
      data-invalid={invalid || Boolean(error) || undefined}
    >
      <FieldLabel htmlFor={resolvedInputId} id={labelId}>{label}</FieldLabel>
      {control}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

export type ConnectedAppRelationPickerProps<TRecord> = Omit<
  AppRelationPickerProps<TRecord>,
  'options' | 'loading' | 'error' | 'hasMore' | 'onLoadMore'
> &
  Readonly<{
    query: AppRelationSearchQuery<TRecord>;
    pageSize?: number;
    debounceMs?: number;
  }>;

export function ConnectedAppRelationPicker<TRecord>({
  query,
  pageSize = 20,
  debounceMs = 200,
  search,
  ...pickerProps
}: ConnectedAppRelationPickerProps<TRecord>) {
  const [debouncedSearch, setDebouncedSearch] = React.useState(search);
  const [page, setPage] = React.useState(1);
  const [options, setOptions] = React.useState<readonly AppRelationOption<TRecord>[]>([]);
  const scope = useAppScope();
  const scopeKey = createAppScopeFingerprint(scope);
  const [optionsScopeKey, setOptionsScopeKey] = React.useState(scopeKey);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => window.clearTimeout(timeout);
  }, [debounceMs, search]);

  React.useEffect(() => {
    setPage(1);
    setOptions([]);
    setOptionsScopeKey(scopeKey);
  }, [debouncedSearch, scopeKey]);

  const result = useAppQuery(query, {
    page,
    pageSize,
    search: debouncedSearch
  });

  React.useEffect(() => {
    if (!result.data) return;
    setOptions((current) => {
      const merged = page === 1 || optionsScopeKey !== scopeKey ? [] : [...current];
      const values = new Set(merged.map((option) => option.value));
      for (const option of result.data.items) {
        if (!values.has(option.value)) merged.push(option);
      }
      return merged;
    });
    setOptionsScopeKey(scopeKey);
  }, [optionsScopeKey, page, result.data, scopeKey]);

  const error = result.error?.appError;

  return (
    <AppRelationPicker
      {...pickerProps}
      error={error}
      hasMore={result.data?.hasMore}
      loading={result.isFetching}
      onLoadMore={() => setPage((current) => current + 1)}
      options={optionsScopeKey === scopeKey ? options : []}
      search={search}
    />
  );
}

export type AppRelationPanelProps<TRecord> = Readonly<{
  title: string;
  description?: string;
  state: AppDataState<readonly TRecord[]>;
  getRecordKey: (record: TRecord) => string;
  renderRecord: (record: TRecord) => React.ReactNode;
  onOpenRecord?: (record: TRecord) => void;
  onUnlink?: (record: TRecord) => void | Promise<void>;
  canUnlink?: (record: TRecord) => boolean;
  picker?: React.ReactNode;
  onRetry?: () => void;
}>;

export function AppRelationPanel<TRecord>({
  title,
  description,
  state,
  getRecordKey,
  renderRecord,
  onOpenRecord,
  onUnlink,
  canUnlink,
  picker,
  onRetry
}: AppRelationPanelProps<TRecord>) {
  return (
    <Card variant='flat'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {picker ? (
        <CardContent>
          {picker}
          <Separator className='mt-5' />
        </CardContent>
      ) : null}
      <CardContent>
        <AppDataStateView
          emptyDescription='Search for an existing record to link it here.'
          emptyTitle={`No ${title.toLocaleLowerCase()}`}
          onRetry={onRetry}
          state={state}
        >
          {(records) => (
            <ul className='divide-y rounded-lg border'>
              {records.map((record) => (
                <li
                  className='flex min-w-0 items-center gap-2 p-3'
                  key={getRecordKey(record)}
                >
                  <div className='min-w-0 flex-1'>{renderRecord(record)}</div>
                  {onOpenRecord ? (
                    <Button onClick={() => onOpenRecord(record)} size='sm' variant='ghost'>
                      Open
                    </Button>
                  ) : null}
                  {onUnlink ? (
                    <Button
                      aria-label='Unlink record'
                      disabled={canUnlink ? !canUnlink(record) : false}
                      onClick={() => void onUnlink(record)}
                      size='icon-sm'
                      variant='ghost'
                    >
                      <UnlinkIcon />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </AppDataStateView>
      </CardContent>
      {state.status === 'ready' ? (
        <CardFooter className='text-sm text-muted-foreground'>
          <LinkIcon aria-hidden='true' />
          {state.data.length} linked
        </CardFooter>
      ) : null}
    </Card>
  );
}

export type ConnectedAppRelationPanelProps<TRecord, TInput> = Omit<
  AppRelationPanelProps<TRecord>,
  'state' | 'onRetry'
> &
  Readonly<{
    query: AppQueryDefinition<TInput, readonly TRecord[]>;
    input: TInput;
    enabled?: boolean;
  }>;

export function ConnectedAppRelationPanel<TRecord, TInput>(
  props: ConnectedAppRelationPanelProps<TRecord, TInput>
) {
  const { query, input, enabled, ...panelProps } = props;
  const result = useAppQuery(query, input, { enabled });
  let state: AppDataState<readonly TRecord[]>;
  if (result.isLoading) state = { status: 'loading' };
  else if (result.isError) {
    const error = result.error.appError;
    state =
      error.kind === 'authorization' || error.kind === 'authentication'
        ? { error, status: 'denied' }
        : { error, status: 'error' };
  } else if (!result.data || result.data.length === 0) state = { status: 'empty' };
  else state = { data: result.data, refreshing: result.isFetching, status: 'ready' };

  return (
    <AppRelationPanel
      {...panelProps}
      onRetry={() => void result.refetch()}
      state={state}
    />
  );
}
