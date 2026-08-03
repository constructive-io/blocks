'use client';

import * as React from 'react';
import { SearchIcon, XIcon } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Field, FieldLabel } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem
} from '@constructive-io/ui/pagination';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';

import type {
  AppCollectionState,
  AppFilterDefinition,
  AppPageInfo,
  AppSortDefinition
} from './types';

const ALL_FILTER_VALUE = '__app-kit-all__';

export type AppCollectionToolbarProps = Readonly<{
  state: AppCollectionState;
  onStateChange: (state: AppCollectionState) => void;
  filters?: readonly AppFilterDefinition[];
  sorts?: readonly AppSortDefinition[];
  actions?: React.ReactNode;
  searchLabel?: string;
}>;

export function AppCollectionToolbar({
  state,
  onStateChange,
  filters = [],
  sorts = [],
  actions,
  searchLabel = 'Search records'
}: AppCollectionToolbarProps) {
  const searchId = React.useId();
  const controlsId = React.useId();
  const setSearch = (search: string) =>
    onStateChange({ ...state, page: 1, search });

  return (
    <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end'>
      <Field className='min-w-56 flex-1'>
        <FieldLabel className='sr-only' htmlFor={searchId}>
          {searchLabel}
        </FieldLabel>
        <div className='relative'>
          <SearchIcon
            aria-hidden='true'
            className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
          />
          <Input
            id={searchId}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={searchLabel}
            type='search'
            value={state.search}
            className='ps-9'
          />
        </div>
      </Field>
      {filters.map((definition) => {
        const triggerId = `${controlsId}-filter-${definition.id.replace(/[^A-Za-z0-9_-]/gu, '-')}`;
        const current =
          state.filters.find((filter) => filter.id === definition.id)?.value ??
          ALL_FILTER_VALUE;
        const items = [
          { label: `All ${definition.label.toLocaleLowerCase()}`, value: ALL_FILTER_VALUE },
          ...definition.options
        ];
        return (
          <Field className='min-w-44' key={definition.id}>
            <FieldLabel htmlFor={triggerId}>{definition.label}</FieldLabel>
            <Select
              items={items}
              onValueChange={(value) => {
                const nextFilters = state.filters.filter(
                  (filter) => filter.id !== definition.id
                );
                if (value !== ALL_FILTER_VALUE) {
                  nextFilters.push({ id: definition.id, value });
                }
                onStateChange({ ...state, filters: nextFilters, page: 1 });
              }}
              value={current}
            >
              <SelectTrigger id={triggerId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        );
      })}
      {sorts.length > 0 ? (
        <Field className='min-w-44'>
          <FieldLabel htmlFor={`${controlsId}-sort`}>Sort</FieldLabel>
          <Select
            items={sorts.flatMap((sort) => [
              { label: `${sort.label}, ascending`, value: `${sort.id}:asc` },
              { label: `${sort.label}, descending`, value: `${sort.id}:desc` }
            ])}
            onValueChange={(value) => {
              const [id, direction] = value.split(':');
              onStateChange({
                ...state,
                page: 1,
                sort: [{ id, direction: direction === 'desc' ? 'desc' : 'asc' }]
              });
            }}
            value={
              state.sort[0]
                ? `${state.sort[0].id}:${state.sort[0].direction}`
                : undefined
            }
          >
            <SelectTrigger id={`${controlsId}-sort`}>
              <SelectValue placeholder='Choose an order' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {sorts.flatMap((sort) =>
                  (['asc', 'desc'] as const).map((direction) => (
                    <SelectItem
                      key={`${sort.id}:${direction}`}
                      value={`${sort.id}:${direction}`}
                    >
                      {sort.label}, {direction === 'asc' ? 'ascending' : 'descending'}
                    </SelectItem>
                  ))
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {state.search || state.filters.length || state.sort.length ? (
        <Button
          onClick={() =>
            onStateChange({
              ...state,
              filters: [],
              page: 1,
              search: '',
              sort: []
            })
          }
          variant='ghost'
        >
          <XIcon data-icon='inline-start' />
          Clear view
        </Button>
      ) : null}
      {actions ? <div className='sm:ms-auto'>{actions}</div> : null}
    </div>
  );
}

export type AppPaginationProps = Readonly<{
  pageInfo: AppPageInfo;
  onPageChange: (page: number) => void;
}>;

export function AppPagination({ pageInfo, onPageChange }: AppPaginationProps) {
  const firstRecord = (pageInfo.page - 1) * pageInfo.pageSize + 1;
  const lastRecord = pageInfo.totalCount
    ? Math.min(pageInfo.page * pageInfo.pageSize, pageInfo.totalCount)
    : pageInfo.page * pageInfo.pageSize;
  return (
    <div className='flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row'>
      <p aria-live='polite'>
        {pageInfo.totalCount === undefined
          ? `Page ${pageInfo.page}`
          : `${firstRecord}–${lastRecord} of ${pageInfo.totalCount}`}
      </p>
      <Pagination className='mx-0 w-auto'>
        <PaginationContent>
          <PaginationItem>
            <Button
              disabled={!pageInfo.hasPreviousPage}
              onClick={() => onPageChange(pageInfo.page - 1)}
              size='sm'
              variant='outline'
            >
              Previous
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              disabled={!pageInfo.hasNextPage}
              onClick={() => onPageChange(pageInfo.page + 1)}
              size='sm'
              variant='outline'
            >
              Next
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
