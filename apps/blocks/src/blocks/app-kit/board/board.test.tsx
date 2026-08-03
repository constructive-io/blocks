import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { defineAction, defineQuery, type AppScope } from '../core';
import { AppKitProvider } from '../core/runtime';
import { AppBoard } from './board';
import { ConnectedAppBoard } from './connected-board';

type Ticket = { id: string; title: string; status: 'planned' | 'live' };

const columns = [
  { id: 'planned', title: 'Planned' },
  { id: 'live', title: 'Live' }
] as const;

const ticket: Ticket = { id: 'ticket-1', title: 'Opening keynote', status: 'planned' };

function board(onMove = vi.fn()) {
  return (
    <AppBoard
      columns={columns}
      getColumnId={(record) => record.status}
      getRecordId={(record) => record.id}
      getRecordLabel={(record) => record.title}
      onMove={onMove}
      records={[ticket]}
      renderCard={(record) => <p>{record.status}</p>}
    />
  );
}

describe('AppBoard', () => {
  it('offers the semantic move action through a keyboard-operable menu', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockResolvedValue(undefined);
    render(board(onMove));

    const trigger = screen.getByRole('button', { name: 'Move Opening keynote' });
    trigger.focus();
    await user.keyboard('{Enter}');
    const destination = await screen.findByRole('menuitem', { name: /Live/ });
    destination.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(onMove).toHaveBeenCalledWith(expect.objectContaining({
      recordId: 'ticket-1',
      fromColumnId: 'planned',
      toColumnId: 'live'
    })));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('restores focus to the moved record after an async controlled update', async () => {
    const user = userEvent.setup();
    let finishMove!: () => void;
    const moveFinished = new Promise<void>((resolve) => {
      finishMove = resolve;
    });

    function ControlledBoard() {
      const [records, setRecords] = React.useState<readonly Ticket[]>([ticket]);
      return (
        <AppBoard
          columns={columns}
          getColumnId={(record) => record.status}
          getRecordId={(record) => record.id}
          getRecordLabel={(record) => record.title}
          onMove={async ({ recordId, toColumnId }) => {
            setRecords((current) => current.map((record) => (
              record.id === recordId ? { ...record, status: toColumnId } : record
            )));
            await moveFinished;
          }}
          records={records}
        />
      );
    }

    render(<ControlledBoard />);
    const originalTrigger = screen.getByRole('button', { name: 'Move Opening keynote' });
    originalTrigger.focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => expect(
      screen.getByRole('heading', { name: 'Live' }).closest('section')
    ).toHaveTextContent('Opening keynote'));
    expect(originalTrigger.isConnected).toBe(false);

    finishMove();
    await waitFor(() => expect(
      screen.getByRole('button', { name: 'Move Opening keynote' })
    ).toHaveFocus());
  });

  it('restores focus to the destination column when a successful move removes the record', async () => {
    const user = userEvent.setup();

    function FilteredBoard() {
      const [records, setRecords] = React.useState<readonly Ticket[]>([ticket]);
      return (
        <>
          <button onClick={() => setRecords([ticket])} type='button'>Restore record</button>
          <AppBoard
            columns={columns}
            getColumnId={(record) => record.status}
            getRecordId={(record) => record.id}
            getRecordLabel={(record) => record.title}
            onMove={async ({ recordId }) => {
              setRecords((current) => current.filter((record) => record.id !== recordId));
            }}
            records={records}
          />
        </>
      );
    }

    render(<FilteredBoard />);
    await user.click(screen.getByRole('button', { name: 'Move Opening keynote' }));
    await user.click(await screen.findByRole('menuitem', { name: /Live/ }));

    const destinationColumn = screen.getByRole('heading', { name: 'Live' }).closest('section');
    await waitFor(() => expect(destinationColumn).toHaveFocus());
    expect(screen.queryByText('Opening keynote')).not.toBeInTheDocument();

    const restore = screen.getByRole('button', { name: 'Restore record' });
    await user.click(restore);
    expect(await screen.findByText('Opening keynote')).toBeInTheDocument();
    expect(restore).toHaveFocus();
  });

  it('keeps the multi-column loading state inside its own mobile scroll boundary', () => {
    const query = defineQuery<void, readonly Ticket[]>({
      id: 'tickets.loading-board',
      execute: () => new Promise<readonly Ticket[]>(() => undefined)
    });
    const scope: AppScope = {
      databaseId: 'events',
      endpointId: 'graphql',
      schemaRevision: 'schema-1',
      securityRevision: 'security-1',
      sessionPartition: 'user-1'
    };

    render(
      <AppKitProvider queryClient={new QueryClient()} scope={scope}>
        <ConnectedAppBoard
          columns={columns}
          getColumnId={(record: Ticket) => record.status}
          getRecordId={(record) => record.id}
          getRecordLabel={(record) => record.title}
          query={query}
          queryInput={undefined}
        />
      </AppKitProvider>
    );

    expect(screen.getByRole('status', { name: 'Loading board' })).toHaveClass(
      'max-w-full',
      'overflow-x-auto'
    );
  });

  it('keeps the controlled record in place and reports a rejected optimistic move', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockRejectedValue(new Error('Move denied by policy'));
    render(board(onMove));

    await user.click(screen.getByRole('button', { name: 'Move Opening keynote' }));
    await user.click(await screen.findByRole('menuitem', { name: /Live/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Move denied by policy');
    expect(screen.getByRole('heading', { name: 'Planned' }).closest('section'))
      .toHaveTextContent('Opening keynote');
    expect(screen.getByRole('heading', { name: 'Live' }).closest('section'))
      .not.toHaveTextContent('Opening keynote');
    await waitFor(() => expect(
      screen.getByRole('button', { name: 'Move Opening keynote' })
    ).toHaveFocus());
  });

  it('does not expose move affordances without an explicit move action', () => {
    render(
      <AppBoard
        columns={columns}
        getColumnId={(record: Ticket) => record.status}
        getRecordId={(record) => record.id}
        getRecordLabel={(record) => record.title}
        records={[ticket]}
      />
    );
    expect(screen.queryByRole('button', { name: 'Move Opening keynote' })).not.toBeInTheDocument();
  });

  it('evaluates the semantic action presentation policy for each typed move input', async () => {
    const scope: AppScope = {
      databaseId: 'events',
      endpointId: 'graphql',
      schemaRevision: 'schema-1',
      securityRevision: 'security-1',
      sessionPartition: 'user-1'
    };
    const query = defineQuery<void, readonly Ticket[]>({
      id: 'tickets.board',
      execute: () => [ticket]
    });
    const move = defineAction<
      { ticketId: string; status: Ticket['status'] },
      Ticket
    >({
      id: 'tickets.move',
      execute: () => ticket,
      presentation: {
        disabledReason: ({ input }) =>
          input.status === 'live' ? 'Publishing is not allowed.' : undefined,
        label: 'Move ticket'
      }
    });

    render(
      <AppKitProvider queryClient={new QueryClient()} scope={scope}>
        <ConnectedAppBoard
          columns={columns}
          getColumnId={(record) => record.status}
          getRecordId={(record) => record.id}
          getRecordLabel={(record) => record.title}
          moveAction={{
            definition: move,
            input: ({ recordId, toColumnId }) => ({
              status: toColumnId,
              ticketId: recordId
            })
          }}
          query={query}
          queryInput={undefined}
        />
      </AppKitProvider>
    );

    expect(
      await screen.findByRole('button', { name: 'Move Opening keynote' })
    ).toBeDisabled();
  });
});
