import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The data path is the GENERATED hook — mock the module so no real client is
// touched (sdk-binding-contract.md: tests mock `@/generated/<ns>`).
const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
vi.mock('@/generated/auth', () => ({
  useSendAccountDeletionEmailMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
}));

// Mock the step-up hook — tests drive the resolved/rejected state directly.
const { stepUpMock } = vi.hoisted(() => ({ stepUpMock: vi.fn() }));
vi.mock('@/blocks/auth/use-step-up/use-step-up', () => {
  class StepUpError extends Error {
    constructor(
      public readonly reason: 'cancelled' | 'error',
      public readonly cause?: unknown
    ) {
      super(reason === 'cancelled' ? 'Step-up cancelled.' : 'Step-up failed.');
      this.name = 'StepUpError';
    }
  }
  return {
    useStepUp: () => stepUpMock,
    StepUpError
  };
});

import { AccountDangerCard } from './account-danger-card';
import { defaultAccountDangerCardMessages } from './messages';

beforeEach(() => {
  mutateAsyncMock.mockReset();
  stepUpMock.mockReset();
  // Default: step-up succeeds
  stepUpMock.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openConfirmDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /delete account permanently/i }));
}

async function clickConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('account-danger-confirm'));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AccountDangerCard', () => {
  it('renders the card with title, description and delete button', () => {
    render(<AccountDangerCard />);
    expect(screen.getByText(defaultAccountDangerCardMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountDangerCardMessages.description)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete account permanently/i })).toBeInTheDocument();
  });

  it('opens the confirmation dialog when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<AccountDangerCard />);

    await openConfirmDialog(user);

    expect(await screen.findByText(defaultAccountDangerCardMessages.confirmDialogTitle)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountDangerCardMessages.confirmDialogBody)).toBeInTheDocument();
    expect(screen.getByTestId('account-danger-confirm')).toBeInTheDocument();
  });

  it('happy path: step-up then mutation, shows inline success state', async () => {
    const user = userEvent.setup();
    const onDeletionEmailSent = vi.fn();
    const onMessage = vi.fn();
    stepUpMock.mockResolvedValue(undefined);
    mutateAsyncMock.mockResolvedValue({ sendAccountDeletionEmail: { result: true } });

    render(<AccountDangerCard onDeletionEmailSent={onDeletionEmailSent} onMessage={onMessage} />);

    await openConfirmDialog(user);
    await clickConfirm(user);

    // Dialog should close and success state should show
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(screen.getByText(defaultAccountDangerCardMessages.emailSentTitle)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountDangerCardMessages.emailSentDescription)).toBeInTheDocument();

    expect(stepUpMock).toHaveBeenCalledWith(expect.objectContaining({ tier: 'high' }));
    expect(mutateAsyncMock).toHaveBeenCalledWith({ input: {} });
    expect(onDeletionEmailSent).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'sendAccountDeletionEmail.success' })
    );
  });

  it('step-up cancel: mutation NOT called, dialog stays open (re-attempt)', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    // Import the real StepUpError from the mock
    const { StepUpError } = await import('@/blocks/auth/use-step-up/use-step-up');
    stepUpMock.mockRejectedValue(new StepUpError('cancelled'));

    render(<AccountDangerCard onError={onError} onMessage={onMessage} />);

    await openConfirmDialog(user);
    await clickConfirm(user);

    // Mutation must NOT be called
    await waitFor(() => expect(stepUpMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).not.toHaveBeenCalled();

    // onError must NOT fire; onMessage fires a warning for the cancelled step-up
    expect(onError).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledOnce();
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'warning', key: 'STEP_UP_CANCELLED' })
    );

    // Dialog stays open: confirm button still present
    expect(screen.getByTestId('account-danger-confirm')).toBeInTheDocument();
  });

  it('mutation error: shows inline error, fires onError and onMessage', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    stepUpMock.mockResolvedValue(undefined);
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('server error'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    render(<AccountDangerCard onError={onError} onMessage={onMessage} />);

    await openConfirmDialog(user);
    await clickConfirm(user);

    expect(await screen.findByText(defaultAccountDangerCardMessages.errors.UNKNOWN_ERROR)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'UNKNOWN_ERROR' })
    );
  });

  it('applies custom error message override from messages prop', async () => {
    const user = userEvent.setup();
    stepUpMock.mockResolvedValue(undefined);
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('server error'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    render(
      <AccountDangerCard messages={{ errors: { UNKNOWN_ERROR: 'Custom error text.' } }} />
    );

    await openConfirmDialog(user);
    await clickConfirm(user);

    expect(await screen.findByText('Custom error text.')).toBeInTheDocument();
  });

  it('uses the onSubmit override instead of the generated hook', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onDeletionEmailSent = vi.fn();
    stepUpMock.mockResolvedValue(undefined);

    render(<AccountDangerCard onSubmit={onSubmit} onDeletionEmailSent={onDeletionEmailSent} />);

    await openConfirmDialog(user);
    await clickConfirm(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onDeletionEmailSent).toHaveBeenCalledTimes(1);
  });

  it('renders inline success state and hides delete button after email is sent', async () => {
    const user = userEvent.setup();
    stepUpMock.mockResolvedValue(undefined);
    mutateAsyncMock.mockResolvedValue({ sendAccountDeletionEmail: { result: true } });

    render(<AccountDangerCard />);

    await openConfirmDialog(user);
    await clickConfirm(user);

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    // Delete button should no longer be in the document
    expect(screen.queryByRole('button', { name: /delete account permanently/i })).not.toBeInTheDocument();
  });

  it('cancel button closes the dialog without firing any callbacks', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();

    render(<AccountDangerCard onMessage={onMessage} />);

    await openConfirmDialog(user);
    expect(screen.getByTestId('account-danger-confirm')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // After clicking Cancel: no step-up, no mutation, no message callbacks.
    // (The Dialog component may keep the portal in the DOM with `data-closed`
    //  so we assert on callbacks rather than DOM removal.)
    await waitFor(() => expect(stepUpMock).not.toHaveBeenCalled());
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onMessage).not.toHaveBeenCalled();
    // Success state must NOT appear
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
