import type * as React from 'react';

import type {
  AppError,
  AppFieldDefinition,
  AppQueryDefinition
} from '../core';

export type AppDensity = 'compact' | 'comfortable';
export type AppSurface = 'page' | 'card' | 'embedded';

export type AppPageInfo = Readonly<{
  page: number;
  pageSize: number;
  totalCount?: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}>;

export type AppCollectionPage<TRecord> = Readonly<{
  items: readonly TRecord[];
  pageInfo: AppPageInfo;
}>;

export type AppFilter = Readonly<{
  id: string;
  value: string;
}>;

export type AppSort = Readonly<{
  id: string;
  direction: 'asc' | 'desc';
}>;

export type AppCollectionState = Readonly<{
  search: string;
  filters: readonly AppFilter[];
  sort: readonly AppSort[];
  page: number;
  pageSize: number;
}>;

export type AppCollectionQueryInput = AppCollectionState;

export const DEFAULT_APP_COLLECTION_STATE: AppCollectionState = Object.freeze({
  filters: [],
  page: 1,
  pageSize: 25,
  search: '',
  sort: []
});

export type AppDataState<T> =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'empty' }>
  | Readonly<{ status: 'denied'; error?: AppError }>
  | Readonly<{ status: 'error'; error: AppError; retry?: () => void }>
  | Readonly<{ status: 'ready'; data: T; refreshing?: boolean }>;

export type AppColumn<TRecord> = Readonly<{
  id: string;
  label: string;
  field?: keyof TRecord & string;
  align?: 'start' | 'center' | 'end';
  render?: (record: TRecord) => React.ReactNode;
  hideBelow?: 'sm' | 'md' | 'lg';
}>;

export type AppFilterDefinition = Readonly<{
  id: string;
  label: string;
  options: readonly Readonly<{ label: string; value: string }>[];
}>;

export type AppSortDefinition = Readonly<{
  id: string;
  label: string;
}>;

export type AppCollectionResourceDefinition<
  TRecord extends Record<string, unknown>
> = Readonly<{
  __types?: Readonly<{ record: TRecord }>;
  id: string;
  label: string;
  pluralLabel: string;
  fields: readonly AppFieldDefinition<TRecord>[];
  displayField: keyof TRecord & string;
}>;

export type AppCollectionViewProps<
  TRecord extends Record<string, unknown>
> = Readonly<{
  resource: AppCollectionResourceDefinition<TRecord>;
  state: AppDataState<AppCollectionPage<NoInfer<TRecord>>>;
  columns?: readonly AppColumn<NoInfer<TRecord>>[];
  getRowKey: (record: TRecord) => string;
  density?: AppDensity;
  surface?: AppSurface;
  selectedKeys?: readonly string[];
  onSelectionChange?: (keys: readonly string[]) => void;
  onOpenRecord?: (record: TRecord) => void;
  onRetry?: () => void;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  renderFooter?: (page: AppCollectionPage<TRecord>) => React.ReactNode;
  renderRecord?: (record: TRecord) => React.ReactNode;
  className?: string;
}>;

export type ConnectedAppCollectionProps<
  TRecord extends Record<string, unknown>
> = Omit<
  AppCollectionViewProps<TRecord>,
  'state' | 'onRetry'
> &
  Readonly<{
    query: AppQueryDefinition<
      AppCollectionQueryInput,
      AppCollectionPage<TRecord>
    >;
    queryInput: AppCollectionQueryInput;
    enabled?: boolean;
  }>;

export type AppFieldRenderer<TRecord extends Record<string, unknown>> = (
  value: unknown,
  record: TRecord,
  field: AppFieldDefinition<TRecord>
) => React.ReactNode;

export type AppFieldInputRenderer<
  TRecord extends Record<string, unknown>
> = Readonly<{
  render: (props: Readonly<{
    field: AppFieldDefinition<TRecord>;
    value: unknown;
    id: string;
    descriptionId?: string;
    errorId?: string;
    'aria-describedby'?: string;
    disabled: boolean;
    invalid: boolean;
    required: boolean;
    onChange: (value: unknown) => void;
  }>) => React.ReactNode;
}>;

export type AppRelationOption<TRecord> = Readonly<{
  value: string;
  label: string;
  description?: string;
  record: TRecord;
}>;

export type AppRelationSearchInput = Readonly<{
  search: string;
  page: number;
  pageSize: number;
}>;

export type AppRelationSearchPage<TRecord> = Readonly<{
  items: readonly AppRelationOption<TRecord>[];
  hasMore: boolean;
}>;

export type AppRelationSearchQuery<TRecord> = AppQueryDefinition<
  AppRelationSearchInput,
  AppRelationSearchPage<TRecord>
>;

export function columnsFromResource<
  TRecord extends Record<string, unknown>
>(
  resource: Pick<AppCollectionResourceDefinition<TRecord>, 'fields'>
): readonly AppColumn<TRecord>[] {
  return resource.fields.map((field) => ({
    field: field.key,
    id: field.key,
    label: field.label
  }));
}
