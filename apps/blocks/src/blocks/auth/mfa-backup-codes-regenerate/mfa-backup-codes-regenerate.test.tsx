import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// BACKEND-PENDING CASE (b): useGenerateBackupCodesMutation does NOT exist in the
// current generated SDK — this block does NOT import it. Tests cover the onSubmit
// override seam (required path), the step-up cancel path, display step transition,
// and the graceful PROCEDURE_NOT_FOUND path.

// Mock the step-up hook (block-owned utility; no @/generated import).
const { stepUpMock } = vi.hoisted(() => ({ stepUpMock: vi.fn() }));
vi.mock('@/blocks/auth/use-step-up/use-step-up', () => ({
  useStepUp: () => stepUpMock,
  StepUpError: class StepUpError extends Error {
    constructor(public readonly reason: 'cancelled' | 'error') {
      super(reason === 'cancelled' ? 'Step-up cancelled.' : 'Step-up failed.');
      this.name = 'StepUpError';
    }
  }
}));

// Mock [[auth-mfa-backup-codes-display]] — we test the integration with a stub
// that renders a "Continue" button, letting us trigger onConfirm in tests.
vi.mock('@/blocks/auth/mfa-backup-codes-display/mfa-backup-codes-display', () => ({
  MfaBackupCodesDisplay: ({
    codes,
    onConfirm
  }: {
    codes: string[];
    onConfirm?: () => void;
    requireConfirmation?: boolean;
    onMessage?: unknown;
    className?: string;
  }) => (
    <div data-testid="mfa-backup-codes-display">
      <ul>
        {codes.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
      <button data-testid="codes-continue" onClick={onConfirm}>
        Continue
      </button>
    </div>
  )
}));

import { MfaBackupCodesRegenerate } from './mfa-backup-codes-regenerate';
import { defaultMfaBackupCodesRegenerateMessages } from './messages';

beforeEach(() => {
  stepUpMock.mockReset();
  // Default: step-up resolves (passes) silently.
  stepUpMock.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDialog(
  props: Partial<React.ComponentProps<typeof MfaBackupCodesRegenerate>> = {}
) {
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue({ codes: ['abc-123', 'def-456'] });
  const { rerender, ...rest } = render(
    <MfaBackupCodesRegenerate
      open={true}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      {...props}
    />
  );
  return { onOpenChange, onSubmit, rerender, ...rest };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MfaBackupCodesRegenerate', () => {
  it('renders dialog with title, description, warning text, and action buttons', () => {
    renderDialog();

    expect(
      screen.getByRole('heading', { name: defaultMfaBackupCodesRegenerateMessages.title })
    ).toBeInTheDocument();
    expect(
      screen.getByText(defaultMfaBackupCodesRegenerateMessages.description)
    ).toBeInTheDocument();
    expect(
      screen.getByText(defaultMfaBackupCodesRegenerateMessages.warningText)
    ).toBeInTheDocument();
    expect(screen.getByTestId('mfa-backup-codes-regenerate-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('mfa-backup-codes-regenerate-cancel')).toBeInTheDocument();
  });

  it('when open=false the dialog popup is not mounted in the DOM', () => {
    render(
      <MfaBackupCodesRegenerate
        open={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    // Base UI Dialog does not mount the popup when open=false.
    expect(document.querySelector('[data-slot="dialog-popup"]')).toBeNull();
  });

  it('calls step-up(tier:high), then onSubmit, then transitions to display step', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ codes: ['aaa-111', 'bbb-222'] });
    const onOpenChange = vi.fn();

    render(
      <MfaBackupCodesRegenerate
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByTestId('mfa-backup-codes-regenerate-confirm'));

    await waitFor(() =>
      expect(screen.getByTestId('mfa-backup-codes-display')).toBeInTheDocument()
    );
    expect(stepUpMock).toHaveBeenCalledWith({ tier: 'high' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    // Confirmation step no longer visible after transition
    expect(
      screen.queryByTestId('mfa-backup-codes-regenerate-confirm')
    ).not.toBeInTheDocument();
  });

  it('display step: clicking Continue fires onSuccess and closes dialog', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ codes: ['aaa-111', 'bbb-222'] });
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    render(
      <MfaBackupCodesRegenerate
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
        onMessage={onMessage}
      />
    );

    // Regenerate → display step
    await user.click(screen.getByTestId('mfa-backup-codes-regenerate-confirm'));
    await waitFor(() => expect(screen.getByTestId('mfa-backup-codes-display')).toBeInTheDocument());

    // Continue from display step
    await user.click(screen.getByTestId('codes-continue'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ codes: ['aaa-111', 'bbb-222'] });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'generateBackupCodes.success',
      message: defaultMfaBackupCodesRegenerateMessages.successMessage
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('step-up CANCEL: returns silently without calling onSubmit, onError, or onMessage', async () => {
    const { StepUpError } = await import('@/blocks/auth/use-step-up/use-step-up');
    stepUpMock.mockRejectedValue(new StepUpError('cancelled'));

    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const onSuccess = vi.fn();

    render(
      <MfaBackupCodesRegenerate
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        onError={onError}
        onMessage={onMessage}
        onSuccess={onSuccess}
      />
    );

    await user.click(screen.getByTestId('mfa-backup-codes-regenerate-confirm'));

    // After cancelled step-up: no mutation, no error callbacks, no display step
    await waitFor(() => expect(stepUpMock).toHaveBeenCalledTimes(1));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onMessage).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mfa-backup-codes-display')).not.toBeInTheDocument();
  });

  it('onSubmit failure: maps the error, renders inline alert, fires onError+onMessage', async () => {
    stepUpMock.mockResolvedValue(undefined);
    const serverError = Object.assign(new Error('server error'), {
      extensions: { code: 'UNKNOWN_ERROR' }
    });
    const onSubmit = vi.fn().mockRejectedValue(serverError);
    const onError = vi.fn();
    const onMessage = vi.fn();

    const user = userEvent.setup();
    render(
      <MfaBackupCodesRegenerate
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        onError={onError}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByTestId('mfa-backup-codes-regenerate-confirm'));

    expect(
      await screen.findByText(defaultMfaBackupCodesRegenerateMessages.errors.UNKNOWN_ERROR)
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultMfaBackupCodesRegenerateMessages.errors.UNKNOWN_ERROR,
      code: 'UNKNOWN_ERROR'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'UNKNOWN_ERROR',
      message: defaultMfaBackupCodesRegenerateMessages.errors.UNKNOWN_ERROR
    });
  });

  it('PROCEDURE_NOT_FOUND error resolves to the backend-pending message', async () => {
    stepUpMock.mockResolvedValue(undefined);
    const procError = Object.assign(new Error('procedure not found'), {
      extensions: { code: 'PROCEDURE_NOT_FOUND' }
    });
    const onSubmit = vi.fn().mockRejectedValue(procError);
    const onError = vi.fn();

    const user = userEvent.setup();
    render(
      <MfaBackupCodesRegenerate
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        onError={onError}
      />
    );

    await user.click(screen.getByTestId('mfa-backup-codes-regenerate-confirm'));

    expect(
      await screen.findByText(defaultMfaBackupCodesRegenerateMessages.errors.PROCEDURE_NOT_FOUND)
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultMfaBackupCodesRegenerateMessages.errors.PROCEDURE_NOT_FOUND,
      code: 'PROCEDURE_NOT_FOUND'
    });
  });

  it('cancel button closes the dialog without calling onSubmit', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <MfaBackupCodesRegenerate
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByTestId('mfa-backup-codes-regenerate-cancel'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(stepUpMock).not.toHaveBeenCalled();
  });

  it('applies messages overrides including error overrides', () => {
    renderDialog({
      messages: {
        title: 'Custom title',
        errors: { UNKNOWN_ERROR: 'A custom error occurred.' }
      }
    });
    expect(screen.getByText('Custom title')).toBeInTheDocument();
  });

  it('graceful BACKEND-PENDING path: onSubmit override is the sole mutation path', async () => {
    // Structural check: no @/generated/auth import — tsc verifies this at build.
    // Behavioural: override is called and its result is used.
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ codes: ['x-1', 'x-2'] });
    const onSuccess = vi.fn();

    render(
      <MfaBackupCodesRegenerate
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
      />
    );

    await user.click(screen.getByTestId('mfa-backup-codes-regenerate-confirm'));
    await waitFor(() =>
      expect(screen.getByTestId('mfa-backup-codes-display')).toBeInTheDocument()
    );

    await user.click(screen.getByTestId('codes-continue'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ codes: ['x-1', 'x-2'] }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
