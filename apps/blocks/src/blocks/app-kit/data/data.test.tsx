import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  ComboboxInput: ({
    showClear: _showClear,
    ...props
  }: React.ComponentProps<'input'> & { showClear?: boolean }) => (
    <input role='combobox' {...props} />
  ),
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
  AppDataCards,
  AppDataTable,
  AppCollectionToolbar,
  AppPagination,
  AppRecordForm,
  AppRelationPicker,
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

type Appointment = Record<string, unknown> & {
  id: string;
  startsAt: string;
};

const appointmentResource = defineResource<Appointment, string>({
  id: 'appointments',
  label: 'Appointment',
  pluralLabel: 'Appointments',
  source: {
    graphQLTypeName: 'Appointment',
    listFieldName: 'appointmentsConnection',
    schemaName: 'events',
    tableName: 'appointments',
    updateMutationName: 'updateAppointment'
  },
  fields: [
    { databaseName: 'id', graphQLName: 'id', key: 'id', kind: 'string', label: 'ID', readOnly: true },
    { databaseName: 'starts_at', graphQLName: 'startsAt', key: 'startsAt', kind: 'datetime', label: 'Starts at' }
  ],
  displayField: 'startsAt',
  forms: { update: { fields: [{ field: 'startsAt', required: true }] } },
  identity: {
    fields: ['id'],
    read: (record) => record.id,
    serialize: String
  },
  queries: {
    list: defineQuery<unknown, readonly Appointment[]>({
      id: 'appointments.list',
      execute: () => []
    })
  }
});

type ScalarArrayRecord = Record<string, unknown> & {
  dates: string[];
  flags: boolean[];
  id: string;
  instants: string[];
  integers: number[];
  metric: unknown;
  numbers: number[];
  optionalStrings: (string | null)[] | null;
  settings: Record<string, unknown>;
  stages: string[];
  strings: (string | null)[];
};

const scalarArrayResource = defineResource<ScalarArrayRecord, string>({
  id: 'scalar-arrays',
  label: 'Scalar array record',
  pluralLabel: 'Scalar array records',
  source: {
    graphQLTypeName: 'ScalarArrayRecord',
    listFieldName: 'scalarArrayRecordsConnection',
    schemaName: 'testing',
    tableName: 'scalar_array_records',
    updateMutationName: 'updateScalarArrayRecord'
  },
  fields: [
    { databaseName: 'id', graphQLName: 'id', key: 'id', kind: 'string', label: 'ID', readOnly: true },
    { databaseName: 'flags', graphQLName: 'flags', key: 'flags', kind: 'boolean-array', label: 'Flags' },
    { databaseName: 'dates', graphQLName: 'dates', key: 'dates', kind: 'date-array', label: 'Dates' },
    { databaseName: 'instants', graphQLName: 'instants', key: 'instants', kind: 'datetime-array', label: 'Instants' },
    { databaseName: 'integers', graphQLName: 'integers', key: 'integers', kind: 'integer-array', label: 'Integers' },
    { databaseName: 'numbers', graphQLName: 'numbers', key: 'numbers', kind: 'float-array', label: 'Numbers' },
    {
      arrayElementNullable: true,
      databaseName: 'optional_strings',
      graphQLName: 'optionalStrings',
      key: 'optionalStrings',
      kind: 'string-array',
      label: 'Optional strings',
      nullable: true
    },
    {
      arrayElementNullable: true,
      databaseName: 'strings',
      graphQLName: 'strings',
      key: 'strings',
      kind: 'string-array',
      label: 'Strings'
    },
    {
      databaseName: 'stages',
      graphQLName: 'stages',
      key: 'stages',
      kind: 'enum-array',
      label: 'Stages',
      options: [
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Published', value: 'PUBLISHED' }
      ]
    },
    { databaseName: 'settings', graphQLName: 'settings', key: 'settings', kind: 'json', label: 'Settings' },
    { databaseName: 'metric', graphQLName: 'metric', key: 'metric', kind: 'custom', label: 'Metric' }
  ],
  displayField: 'id',
  forms: {
    update: {
      fields: [
        { field: 'flags' },
        { field: 'dates' },
        { field: 'instants' },
        { field: 'integers' },
        { field: 'numbers' },
        { field: 'optionalStrings' },
        { field: 'strings' },
        { field: 'stages' },
        { field: 'settings' },
        { field: 'metric' }
      ]
    }
  },
  identity: {
    fields: ['id'],
    read: (record) => record.id,
    serialize: String
  },
  queries: {
    list: defineQuery<unknown, readonly ScalarArrayRecord[]>({
      id: 'scalar-arrays.list',
      execute: () => []
    })
  }
});

const scalarArrayValues: ScalarArrayRecord = {
  dates: ['2026-08-03'],
  flags: [true],
  id: 'scalar-array-1',
  instants: ['2026-08-03T03:15:30.000Z'],
  integers: [1],
  metric: { raw: '1.23' },
  numbers: [1.5],
  optionalStrings: null,
  settings: { room: 'A' },
  stages: ['DRAFT'],
  strings: ['Smith, John', '', 'line one\nline two', null]
};

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

  it('keeps card collections selectable for mobile bulk workflows', () => {
    const onSelectionChange = vi.fn();
    render(
      <AppDataCards
        getRowKey={(record) => record.id}
        onSelectionChange={onSelectionChange}
        resource={sessionResource}
        selectedKeys={[]}
        state={{ data: page, status: 'ready' }}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Opening keynote' }));
    expect(onSelectionChange).toHaveBeenCalledWith(['session-1']);
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

  it('parses boolean arrays and preserves date and datetime scalar strings', () => {
    const onChange = vi.fn();
    render(
      <AppRecordForm
        mode='update'
        onChange={onChange}
        onSubmit={vi.fn()}
        resource={scalarArrayResource}
        values={scalarArrayValues}
      />
    );

    const flags = screen.getByLabelText('Flags');
    fireEvent.change(flags, {
      target: { value: '[true, "not-a-boolean"]' }
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Invalid boolean values: "not-a-boolean". Use only true or false.'
      )
    ).toBeInTheDocument();

    fireEvent.change(flags, {
      target: { value: '[true, false]' }
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...scalarArrayValues,
      flags: [true, false]
    });

    const dates = ['2026-08-03', '2026-12-31'];
    fireEvent.change(screen.getByLabelText('Dates'), {
      target: { value: JSON.stringify(dates) }
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...scalarArrayValues,
      dates
    });

    const instants = [
      '2026-08-03T03:15:30.000Z',
      '2026-08-04T10:45:00+07:00'
    ];
    fireEvent.change(screen.getByLabelText('Instants'), {
      target: { value: JSON.stringify(instants) }
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...scalarArrayValues,
      instants
    });
  });

  it('rejects invalid numeric, date, and datetime array values', () => {
    const onChange = vi.fn();
    render(
      <AppRecordForm
        mode='update'
        onChange={onChange}
        onSubmit={vi.fn()}
        resource={scalarArrayResource}
        values={scalarArrayValues}
      />
    );

    fireEvent.change(screen.getByLabelText('Integers'), {
      target: { value: '[1, 2.5]' }
    });
    expect(screen.getByText('Invalid integer values: 2.5.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Integers'), {
      target: { value: '[2147483648]' }
    });
    expect(
      screen.getByText('Invalid integer values: 2147483648.')
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Numbers'), {
      target: { value: '[1.5, "not-a-number"]' }
    });
    expect(
      screen.getByText('Invalid number values: "not-a-number".')
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Dates'), {
      target: { value: '["2026-02-29"]' }
    });
    expect(
      screen.getByText('Invalid date values: "2026-02-29". Use YYYY-MM-DD.')
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Instants'), {
      target: { value: '["2026-02-30T00:00:00Z"]' }
    });
    expect(
      screen.getByText(
        'Invalid datetime values: "2026-02-30T00:00:00Z". Use an ISO date and time.'
      )
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects undeclared enum-array tokens and keeps JSON and custom scalars read-only', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <AppRecordForm
        mode='update'
        onChange={onChange}
        onSubmit={onSubmit}
        resource={scalarArrayResource}
        values={scalarArrayValues}
      />
    );

    const stages = screen.getByLabelText('Stages');
    fireEvent.change(stages, { target: { value: '["DRAFT", "ARCHIVED"]' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(stages).toHaveValue('["DRAFT", "ARCHIVED"]');
    expect(stages).toHaveAttribute('aria-invalid', 'true');
    expect(stages).toBeInvalid();
    expect(
      screen.getByText('Unknown option values: "ARCHIVED". Use only declared options.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(stages, { target: { value: '["DRAFT", "PUBLISHED"]' } });
    expect(onChange).toHaveBeenLastCalledWith({
      ...scalarArrayValues,
      stages: ['DRAFT', 'PUBLISHED']
    });
    expect(stages).not.toHaveAttribute('aria-invalid', 'true');
    expect(stages).toBeValid();
    expect(
      screen.queryByText('Unknown option values: "ARCHIVED". Use only declared options.')
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeDisabled();
    expect(screen.getByLabelText('Metric')).toBeDisabled();
  });

  it('round-trips lossless string arrays and distinguishes null from an empty array', () => {
    const onChange = vi.fn();
    render(
      <AppRecordForm
        mode='update'
        onChange={onChange}
        onSubmit={vi.fn()}
        resource={scalarArrayResource}
        values={scalarArrayValues}
      />
    );

    const strings = screen.getByLabelText('Strings');
    expect(JSON.parse((strings as HTMLTextAreaElement).value)).toEqual(
      scalarArrayValues.strings
    );
    const nextStrings = ['Doe, Jane', '', 'line one\nline two', null];
    fireEvent.change(strings, { target: { value: JSON.stringify(nextStrings) } });
    expect(onChange).toHaveBeenLastCalledWith({
      ...scalarArrayValues,
      strings: nextStrings
    });

    const optional = screen.getByLabelText('Optional strings');
    expect(optional).toHaveValue('null');
    fireEvent.change(optional, { target: { value: '[]' } });
    expect(onChange).toHaveBeenLastCalledWith({
      ...scalarArrayValues,
      optionalStrings: []
    });
    fireEvent.change(optional, { target: { value: 'null' } });
    expect(onChange).toHaveBeenLastCalledWith({
      ...scalarArrayValues,
      optionalStrings: null
    });
  });

  it('allows clearing a non-null array but enforces an explicitly required array', async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const requiredResource = defineResource({
      ...scalarArrayResource,
      id: 'required-scalar-arrays',
      forms: { update: { fields: [{ field: 'strings', required: true }] } }
    });
    const { unmount } = render(
      <AppRecordForm
        mode='update'
        onChange={onChange}
        onSubmit={onSubmit}
        resource={scalarArrayResource}
        values={scalarArrayValues}
      />
    );

    const flags = screen.getByLabelText('Flags');
    expect(flags).not.toBeRequired();
    fireEvent.change(flags, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({
      ...scalarArrayValues,
      flags: []
    });
    unmount();

    render(
      <AppRecordForm
        mode='update'
        onChange={vi.fn()}
        onSubmit={onSubmit}
        resource={requiredResource}
        values={{ ...scalarArrayValues, strings: [] }}
      />
    );
    const requiredStrings = screen.getByLabelText('Strings');
    expect(requiredStrings).toBeRequired();
    await waitFor(() => expect(requiredStrings).toBeInvalid());
    expect(screen.getByText('Add at least one array element.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears an invalid array draft when resetKey switches records', async () => {
    const props = {
      mode: 'update' as const,
      onChange: vi.fn(),
      onSubmit: vi.fn(),
      resource: scalarArrayResource,
      values: scalarArrayValues
    };
    const { rerender } = render(<AppRecordForm {...props} resetKey='first' />);
    const flags = screen.getByLabelText('Flags');
    fireEvent.change(flags, { target: { value: '[true, "bad"]' } });
    expect(flags).toBeInvalid();

    const equivalentResource = defineResource({
      ...scalarArrayResource,
      fields: scalarArrayResource.fields.map((field) => ({ ...field }))
    });
    rerender(
      <AppRecordForm
        {...props}
        resetKey='first'
        resource={equivalentResource}
      />
    );
    expect(screen.getByLabelText('Flags')).toHaveValue('[true, "bad"]');
    expect(screen.getByLabelText('Flags')).toBeInvalid();

    rerender(
      <AppRecordForm
        {...props}
        resetKey='second'
        resource={equivalentResource}
      />
    );
    const resetFlags = screen.getByLabelText('Flags');
    await waitFor(() => expect(resetFlags).toBeValid());
    expect(resetFlags).toHaveValue(JSON.stringify([true], null, 2));
  });

  it('defers browser-local datetime values until after hydration', () => {
    const markup = renderToStaticMarkup(
      <AppRecordForm
        mode='update'
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        resource={sessionResource}
        values={page.items[0]}
      />
    );
    const container = document.createElement('div');
    container.innerHTML = markup;

    expect(container.querySelector('input[type="datetime-local"]')).toHaveValue('');
    expect(markup).not.toContain(toAppDateTimeLocalValue(page.items[0].startsAt));
  });

  it('hydrates datetime-local values without mismatch in a non-UTC browser timezone', async () => {
    const previousTimeZone = process.env.TZ;
    const value = { id: 'appointment-1', startsAt: '2026-08-03T12:30:00.000Z' };
    const form = (
      <AppRecordForm
        mode='update'
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        resource={appointmentResource}
        values={value}
      />
    );
    let root: Root | undefined;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const container = document.createElement('div');
    document.body.append(container);

    try {
      process.env.TZ = 'UTC';
      container.innerHTML = renderToStaticMarkup(form);
      expect(container.querySelector('input[type="datetime-local"]')).toHaveValue('');

      process.env.TZ = 'America/Los_Angeles';
      await act(async () => {
        root = hydrateRoot(container, form);
      });

      await waitFor(() => expect(
        container
          .querySelector<HTMLInputElement>('input[type="datetime-local"]')
          ?.getAttribute('value')
      ).toBe(toAppDateTimeLocalValue(value.startsAt)));
      expect(toAppDateTimeLocalValue(value.startsAt)).toBe('2026-08-03T05:30:00.000');
      expect(
        consoleError.mock.calls.flat().map(String).join('\n').toLocaleLowerCase()
      ).not.toContain('hydration');
    } finally {
      await act(async () => root?.unmount());
      container.remove();
      consoleError.mockRestore();
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
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
  it('keeps an embedded picker named when no external input id is supplied', () => {
    render(
      <AppRelationPicker
        embedded
        label='People'
        onSearchChange={vi.fn()}
        onValueChange={vi.fn()}
        options={[]}
        search=''
      />
    );

    expect(screen.getByRole('combobox', { name: 'People' })).toBeInTheDocument();
  });

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
