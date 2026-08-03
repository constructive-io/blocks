import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@constructive-io/ui/combobox', () => ({
  Combobox: ({
    children,
    items
  }: Readonly<{ children: React.ReactNode; items: readonly { label: string }[] }>) => (
    <div data-items={items.map((item) => item.label).join(',')} data-testid='relation-options'>
      {children}
    </div>
  ),
  ComboboxEmpty: ({ children }: Readonly<{ children: React.ReactNode }>) => <div>{children}</div>,
  ComboboxInput: () => <input aria-label='relation search' />,
  ComboboxItem: ({ children }: Readonly<{ children: React.ReactNode }>) => <div>{children}</div>,
  ComboboxList: () => null,
  ComboboxPopup: ({ children }: Readonly<{ children: React.ReactNode }>) => <div>{children}</div>
}));

import { AppKitProvider } from '../core/runtime';
import {
  defineAction,
  defineQuery,
  defineResource,
  type AppScope
} from '../core';

import {
  AppDataTable,
  AppCollectionToolbar,
  AppPagination,
  AppRecordForm,
  ConnectedAppRecordForm,
  ConnectedAppRelationPicker,
  toAppDateTimeLocalValue
} from './index';

type Session = Record<string, unknown> & {
  id: string;
  title: string;
  startsAt: string;
  status: string;
  settings: Record<string, unknown>;
};

const list = defineQuery<unknown, readonly Session[]>({
  id: 'sessions.list',
  execute: () => []
});

const sessionResource = defineResource<Session, string>({
  id: 'sessions',
  label: 'Session',
  pluralLabel: 'Sessions',
  source: {
    graphQLTypeName: 'Session',
    listFieldName: 'sessionsConnection',
    schemaName: 'events',
    tableName: 'sessions'
  },
  fields: [
    { databaseName: 'id', graphQLName: 'id', key: 'id', kind: 'string', label: 'ID', readOnly: true },
    { databaseName: 'title', graphQLName: 'title', key: 'title', kind: 'string', label: 'Title' },
    {
      databaseName: 'status',
      graphQLName: 'status',
      key: 'status',
      kind: 'string',
      label: 'Status',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' }
      ]
    },
    { databaseName: 'starts_at', graphQLName: 'startsAt', key: 'startsAt', kind: 'datetime', label: 'Starts at' },
    {
      databaseName: 'settings',
      description: 'Structured session settings.',
      graphQLName: 'settings',
      key: 'settings',
      kind: 'json',
      label: 'Settings'
    }
  ],
  displayField: 'title',
  forms: {
    create: {
      fields: [
        { field: 'title', required: true },
        { field: 'status', required: true },
        { field: 'startsAt' }
      ]
    },
    update: {
      fields: [
        { field: 'title', required: true },
        { field: 'status', required: true },
        { field: 'startsAt' },
        { field: 'settings' }
      ]
    }
  },
  identity: {
    fields: ['id'],
    read: (record) => record.id,
    serialize: String
  },
  queries: { list }
});

const page = {
  items: [
    {
      id: 'session-1',
      settings: { room: 'A' },
      startsAt: '2026-08-03T03:15:30.000Z',
      status: 'draft',
      title: 'Opening keynote'
    }
  ],
  pageInfo: {
    hasNextPage: true,
    hasPreviousPage: false,
    page: 1,
    pageSize: 25,
    totalCount: 41
  }
} as const;

describe('App Kit data views', () => {
  it('renders a controlled collection, record opening, and page-aware footer', () => {
    const open = vi.fn();
    const changePage = vi.fn();
    render(
      <AppDataTable
        getRowKey={(record) => record.id}
        onOpenRecord={open}
        renderFooter={(currentPage) => (
          <AppPagination onPageChange={changePage} pageInfo={currentPage.pageInfo} />
        )}
        resource={sessionResource}
        state={{ data: page, status: 'ready' }}
      />
    );

    expect(screen.getByText('Opening keynote')).toBeInTheDocument();
    expect(screen.getByText('1–25 of 41')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Opening keynote' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(open).toHaveBeenCalledWith(page.items[0]);
    expect(changePage).toHaveBeenCalledWith(2);
  });

  it('uses distinct denied and empty states', () => {
    const view = render(
      <AppDataTable
        getRowKey={(record) => record.id}
        resource={sessionResource}
        state={{
          error: { kind: 'authorization', message: 'Denied by policy.' },
          status: 'denied'
        }}
      />
    );
    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(screen.getByText('Denied by policy.')).toBeInTheDocument();

    view.rerender(
      <AppDataTable
        getRowKey={(record) => record.id}
        resource={sessionResource}
        state={{ status: 'empty' }}
      />
    );
    expect(screen.getByText('No sessions')).toBeInTheDocument();
  });

  it('keeps JSON read-only without a renderer and blocks all writes without identity', () => {
    const readOnlyResource = { ...sessionResource, identity: undefined };
    render(
      <AppRecordForm
        mode='update'
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        resource={readOnlyResource}
        values={page.items[0]}
      />
    );

    expect(screen.getByText('Read-only resource')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('uses mode-specific fields and renders constrained strings as selects', () => {
    const view = render(
      <AppRecordForm
        mode='create'
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        resource={sessionResource}
        values={page.items[0]}
      />
    );

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Settings')).not.toBeInTheDocument();

    view.rerender(
      <AppRecordForm
        mode='update'
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        resource={sessionResource}
        values={page.items[0]}
      />
    );
    expect(screen.getByLabelText('Settings')).toBeDisabled();
  });

  it('converts datetime instants for datetime-local inputs and back to ISO', () => {
    const onChange = vi.fn();
    render(
      <AppRecordForm
        mode='update'
        onChange={onChange}
        onSubmit={vi.fn()}
        resource={sessionResource}
        values={page.items[0]}
      />
    );

    const input = screen.getByLabelText('Starts at');
    expect(input).toHaveValue(
      toAppDateTimeLocalValue(page.items[0].startsAt)
    );
    fireEvent.change(input, { target: { value: '2026-08-03T11:30:00' } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startsAt: new Date('2026-08-03T11:30:00').toISOString()
      })
    );
  });

  it('allows decimal values in generated float inputs', () => {
    type Measurement = Record<string, unknown> & { id: string; ratio: number };
    const resource = defineResource<Measurement, string>({
      id: 'measurements',
      label: 'Measurement',
      pluralLabel: 'Measurements',
      source: {
        graphQLTypeName: 'Measurement',
        listFieldName: 'measurementsConnection',
        schemaName: 'metrics',
        tableName: 'measurements'
      },
      fields: [
        { databaseName: 'id', graphQLName: 'id', key: 'id', kind: 'string', label: 'ID', readOnly: true },
        { databaseName: 'ratio', graphQLName: 'ratio', key: 'ratio', kind: 'float', label: 'Ratio' }
      ],
      displayField: 'id',
      forms: { update: { fields: [{ field: 'ratio' }] } },
      identity: {
        fields: ['id'],
        read: (record) => record.id,
        serialize: String
      },
      queries: {
        list: defineQuery<unknown, readonly Measurement[]>({
          id: 'measurements.list',
          execute: () => []
        })
      }
    });
    const onChange = vi.fn();
    render(
      <AppRecordForm
        mode='update'
        onChange={onChange}
        onSubmit={vi.fn()}
        resource={resource}
        values={{ id: 'measurement-1', ratio: 1 }}
      />
    );

    const input = screen.getByLabelText('Ratio');
    expect(input).toHaveAttribute('step', 'any');
    fireEvent.change(input, { target: { value: '1.25' } });
    expect(onChange).toHaveBeenLastCalledWith({
      id: 'measurement-1',
      ratio: 1.25
    });
  });

  it('passes generated accessibility IDs to custom input renderers', () => {
    render(
      <AppRecordForm
        errors={{ settings: 'Settings are invalid.' }}
        inputRenderers={{
          settings: {
            render: ({ 'aria-describedby': ariaDescribedBy, errorId, id }) => (
              <input
                aria-describedby={ariaDescribedBy}
                data-error-id={errorId}
                id={id}
              />
            )
          }
        }}
        mode='update'
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        resource={sessionResource}
        values={page.items[0]}
      />
    );

    const input = screen.getByLabelText('Settings');
    const describedBy = input.getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(describedBy).toHaveLength(2);
    expect(describedBy.every((id) => document.getElementById(id))).toBe(true);
    expect(input.getAttribute('data-error-id')).toBe(describedBy[1]);
  });

  it('associates filter and sort labels with their select triggers', () => {
    render(
      <AppCollectionToolbar
        filters={[
          {
            id: 'status',
            label: 'Status',
            options: [{ label: 'Draft', value: 'draft' }]
          }
        ]}
        onStateChange={vi.fn()}
        sorts={[{ id: 'title', label: 'Title' }]}
        state={{ filters: [], page: 1, pageSize: 25, search: '', sort: [] }}
      />
    );

    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort' })).toBeInTheDocument();
  });

  it('marks responsive columns with mobile-hidden breakpoint classes', () => {
    render(
      <AppDataTable
        columns={[
          { field: 'title', hideBelow: 'md', id: 'title', label: 'Title' }
        ]}
        getRowKey={(record) => record.id}
        resource={sessionResource}
        state={{ data: page, status: 'ready' }}
      />
    );

    const heading = screen.getByRole('columnheader', { name: 'Title' });
    expect(heading).toHaveAttribute('data-hide-below', 'md');
    expect(heading).toHaveClass('data-[hide-below=md]:hidden');
    expect(heading).toHaveClass('md:data-[hide-below=md]:table-cell');
  });
});

describe('ConnectedAppRecordForm', () => {
  it('preserves dirty fields when focus refetching supplies fresh initial values', async () => {
    const execute = vi.fn(({ input }: { input: Partial<Session> }) => input);
    const action = defineAction<Partial<Session>, Partial<Session>>({
      id: 'sessions.update',
      execute
    });
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } }
    });
    const currentScope: AppScope = {
      databaseId: 'db',
      endpointId: 'graphql',
      organizationId: 'org',
      schemaRevision: 'schema',
      securityRevision: 'security',
      sessionPartition: 'session'
    };
    const form = (initialValues: Partial<Session>) => (
      <AppKitProvider queryClient={queryClient} scope={currentScope}>
        <ConnectedAppRecordForm
          action={action}
          initialValues={initialValues}
          mode='update'
          resetKey='session-1'
          resource={sessionResource}
          toInput={(values) => values}
        />
      </AppKitProvider>
    );
    const view = render(form(page.items[0]));

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Locally edited title' }
    });
    view.rerender(
      form({
        ...page.items[0],
        status: 'published',
        title: 'Server refetch title'
      })
    );

    expect(screen.getByLabelText('Title')).toHaveValue('Locally edited title');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({ title: 'Locally edited title' })
        })
      )
    );
  });
});

describe('ConnectedAppRelationPicker scope safety', () => {
  it('drops accumulated options synchronously when scope changes with the same search', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    const query = defineQuery<
      { search: string; page: number; pageSize: number },
      { items: readonly { label: string; record: { id: string }; value: string }[]; hasMore: boolean }
    >({
      id: 'people.search',
      execute: ({ scope }) => ({
        hasMore: false,
        items: [
          {
            label: scope.organizationId === 'org-b' ? 'Beta Person' : 'Alpha Person',
            record: { id: scope.organizationId ?? '' },
            value: scope.organizationId ?? ''
          }
        ]
      })
    });
    const baseScope: AppScope = {
      databaseId: 'db',
      endpointId: 'graphql',
      organizationId: 'org-a',
      schemaRevision: 'schema',
      securityRevision: 'security',
      sessionPartition: 'session'
    };
    const picker = (
      currentScope: AppScope
    ) => (
      <AppKitProvider queryClient={queryClient} scope={currentScope}>
        <ConnectedAppRelationPicker
          label='People'
          onSearchChange={vi.fn()}
          onValueChange={vi.fn()}
          query={query}
          search='alex'
        />
      </AppKitProvider>
    );
    const view = render(picker(baseScope));
    await waitFor(() =>
      expect(screen.getByTestId('relation-options')).toHaveAttribute(
        'data-items',
        'Alpha Person'
      )
    );

    view.rerender(picker({ ...baseScope, organizationId: 'org-b' }));
    expect(screen.getByTestId('relation-options')).not.toHaveAttribute(
      'data-items',
      expect.stringContaining('Alpha Person')
    );
    await waitFor(() =>
      expect(screen.getByTestId('relation-options')).toHaveAttribute(
        'data-items',
        'Beta Person'
      )
    );
  });
});
