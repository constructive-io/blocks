import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { defineAction, type AppScope } from '../core/contracts';
import { AppKitProvider } from '../core/runtime';
import { AppActionButton, AppActionDialog } from './actions';
import { ConnectedAppActionMenu } from './connected-actions';
import { AppWorkflowStepper } from './stepper';

describe('App Kit workflow actions', () => {
  it('uses an AlertDialog for destructive actions, blocks double submit, and restores focus', async () => {
    const user = userEvent.setup();
    let resolve!: (value: void) => void;
    const execute = vi.fn(() => new Promise<void>((done) => {
      resolve = done;
    }));
    render(
      <AppActionButton
        action={{
          id: 'session.delete',
          label: 'Delete session',
          confirmation: {
            title: 'Delete this session?',
            description: 'This cannot be undone.',
            destructive: true,
            confirmLabel: 'Delete permanently'
          },
          execute
        }}
      />
    );

    const trigger = screen.getByRole('button', { name: 'Delete session' });
    await user.click(trigger);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('This cannot be undone.');
    const confirm = screen.getByRole('button', { name: 'Delete permanently' });
    await user.dblClick(confirm);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(confirm).toBeDisabled();
    expect(confirm.querySelector('svg')).toHaveClass('motion-safe:animate-spin');

    resolve();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('keeps failed confirmation feedback inside the open dialog', async () => {
    const user = userEvent.setup();
    render(
      <AppActionButton
        action={{
          id: 'session.publish',
          label: 'Publish',
          confirmation: {
            title: 'Publish session?',
            description: 'Attendees will see it.',
            confirmLabel: 'Publish now'
          },
          execute: () => ({ ok: false, error: 'Publishing is denied.' })
        }}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    await user.click(screen.getByRole('button', { name: 'Publish now' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Publishing is denied.');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('renders destructive input actions in an AlertDialog and preserves failed input', async () => {
    const user = userEvent.setup();
    render(
      <AppActionDialog
        confirmation={{
          title: 'Cancel program?',
          description: 'Scheduled sessions will be affected.',
          destructive: true
        }}
        description="Explain why."
        onOpenChange={vi.fn()}
        onSubmit={() => ({ ok: false, error: 'A reason is required.' })}
        open
        submitLabel="Cancel program"
        title="Cancel program"
      >
        <label htmlFor="reason">Reason</label>
        <input id="reason" />
      </AppActionDialog>
    );
    const input = screen.getByLabelText('Reason');
    await user.type(input, 'Schedule conflict');
    await user.click(screen.getByRole('button', { name: 'Cancel program' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A reason is required.');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(input).toHaveValue('Schedule conflict');
  });

  it('keeps a keyboard-selected connected confirmation above the closed menu and restores trigger focus', async () => {
    const user = userEvent.setup();
    const execute = vi.fn().mockResolvedValue({ published: true });
    const onActionComplete = vi.fn();
    const publish = defineAction({
      id: 'session.publish-menu',
      execute,
      presentation: {
        label: 'Publish session',
        visible: ({ input }: { input: { sessionId: string } }) => input.sessionId === 'session-1',
        confirmation: {
          title: 'Publish this session?',
          description: 'Attendees will be able to find it.',
          confirmLabel: 'Publish now'
        }
      }
    });
    const scope: AppScope = {
      endpointId: 'graphql',
      databaseId: 'events',
      sessionPartition: 'user-1',
      schemaRevision: 'schema-1',
      securityRevision: 'security-1'
    };
    render(
      <AppKitProvider queryClient={new QueryClient()} scope={scope}>
        <ConnectedAppActionMenu
          actions={[{ definition: publish, input: { sessionId: 'session-1' } }]}
          label="Session actions"
          onActionComplete={onActionComplete}
        />
      </AppKitProvider>
    );

    const trigger = screen.getByRole('button', { name: 'Session actions' });
    trigger.focus();
    await user.keyboard('{Enter}');
    const item = await screen.findByRole('menuitem', { name: 'Publish session' });
    item.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Attendees will be able to find it.');
    expect(screen.queryByRole('menuitem', { name: 'Publish session' })).not.toBeInTheDocument();
    expect(execute).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Publish now' }));
    await waitFor(() => expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      input: { sessionId: 'session-1' },
      scope
    })));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onActionComplete).toHaveBeenCalledWith('session.publish-menu');
    expect(trigger).toHaveFocus();
  });
});

describe('AppWorkflowStepper', () => {
  it('keeps navigation controlled and exposes errors beside the active step', async () => {
    const user = userEvent.setup();
    const onActiveStepChange = vi.fn();
    render(
      <AppWorkflowStepper
        activeStep={0}
        error="Choose a venue before continuing."
        onActiveStepChange={onActiveStepChange}
        steps={[
          { id: 'details', title: 'Details', content: <p>Details form</p> },
          { id: 'schedule', title: 'Schedule', content: <p>Schedule form</p> }
        ]}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a venue');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onActiveStepChange).toHaveBeenCalledWith(1);
  });
});
