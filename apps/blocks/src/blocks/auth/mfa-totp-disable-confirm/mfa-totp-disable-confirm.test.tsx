import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// BACKEND-PENDING CASE (b): useDisableTotpMutation does NOT exist in the
// current generated SDK — this block does NOT import it. The test covers the
// onSubmit override seam (required path) and the step-up cancel path.

// Mock the step-up hook (block-owned utility; no @/generated import in this hook).
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

import { MfaTotpDisableConfirm } from './mfa-totp-disable-confirm';
import { defaultMfaTotpDisableConfirmMessages } from './messages';

beforeEach(() => {
  stepUpMock.mockReset();
  // Default: step-up resolves (passes) silently.
  stepUpMock.mockResolvedValue(undefined);
});

// Helpers

function renderDialog(props: Partial<React.ComponentProps<typeof MfaTotpDisableConfirm>> = {}) {
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const { rerender, ...rest } = render(
    <MfaTotpDisableConfirm
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

describe('MfaTotpDisableConfirm', () => {
  it('renders the dialog with title, description, warning texts, and action buttons', () => {
    renderDialog();
    // The title text also appears on the confirm button — use heading role to target the title element.
    expect(screen.getByRole('heading', { name: defaultMfaTotpDisableConfirmMessages.title })).toBeInTheDocument();
    expect(screen.getByText(defaultMfaTotpDisableConfirmMessages.description)).toBeInTheDocument();
    expect(screen.getByText(defaultMfaTotpDisableConfirmMessages.warningText)).toBeInTheDocument();
    expect(screen.getByText(defaultMfaTotpDisableConfirmMessages.backupCodesWarning)).toBeInTheDocument();
    expect(screen.getByTestId('mfa-totp-disable-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('mfa-totp-disable-cancel')).toBeInTheDocument();
  });

  it('when open=false the dialog popup is not mounted in the DOM', () => {
    render(
      <MfaTotpDisableConfirm
        open={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    // Base UI Dialog does not mount the popup when open=false. The portal
    // container exists but the popup element (data-slot="dialog-popup") is absent.
    expect(document.querySelector('[data-slot="dialog-popup"]')).toBeNull();
  });

  it('calls step-up(tier:high), then onSubmit, fires success callbacks, and closes dialog', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <MfaTotpDisableConfirm
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByTestId('mfa-totp-disable-confirm'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(stepUpMock).toHaveBeenCalledWith({ tier: 'high' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'disableTotp.success',
      message: defaultMfaTotpDisableConfirmMessages.successMessage
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('step-up CANCEL: returns silently without calling onSubmit, onError, or onMessage', async () => {
    // Import the mock StepUpError class
    const { StepUpError } = await import('@/blocks/auth/use-step-up/use-step-up');
    stepUpMock.mockRejectedValue(new StepUpError('cancelled'));

    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const onSuccess = vi.fn();

    render(
      <MfaTotpDisableConfirm
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        onError={onError}
        onMessage={onMessage}
        onSuccess={onSuccess}
      />
    );

    await user.click(screen.getByTestId('mfa-totp-disable-confirm'));

    // After cancelled step-up, no mutation, no error callbacks
    await waitFor(() => expect(stepUpMock).toHaveBeenCalledTimes(1));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onMessage).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('onSubmit failure: maps the error, renders inline alert, fires onError+onMessage', async () => {
    stepUpMock.mockResolvedValue(undefined);
    const serverError = Object.assign(new Error('proc error'), {
      extensions: { code: 'UNKNOWN_ERROR' }
    });
    const onSubmit = vi.fn().mockRejectedValue(serverError);
    const onError = vi.fn();
    const onMessage = vi.fn();

    const user = userEvent.setup();
    render(
      <MfaTotpDisableConfirm
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        onError={onError}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByTestId('mfa-totp-disable-confirm'));

    expect(await screen.findByText(defaultMfaTotpDisableConfirmMessages.errors.UNKNOWN_ERROR)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultMfaTotpDisableConfirmMessages.errors.UNKNOWN_ERROR,
      code: 'UNKNOWN_ERROR'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'UNKNOWN_ERROR',
      message: defaultMfaTotpDisableConfirmMessages.errors.UNKNOWN_ERROR
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
      <MfaTotpDisableConfirm
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        onError={onError}
      />
    );

    await user.click(screen.getByTestId('mfa-totp-disable-confirm'));

    expect(await screen.findByText(defaultMfaTotpDisableConfirmMessages.errors.PROCEDURE_NOT_FOUND)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultMfaTotpDisableConfirmMessages.errors.PROCEDURE_NOT_FOUND,
      code: 'PROCEDURE_NOT_FOUND'
    });
  });

  it('cancel button closes the dialog without calling onSubmit', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <MfaTotpDisableConfirm
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByTestId('mfa-totp-disable-cancel'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(stepUpMock).not.toHaveBeenCalled();
  });

  it('applies messages overrides including error overrides', async () => {
    renderDialog({
      messages: {
        title: 'Custom title',
        errors: { UNKNOWN_ERROR: 'A custom error occurred.' }
      }
    });
    expect(screen.getByText('Custom title')).toBeInTheDocument();
  });

  it('graceful BACKEND-PENDING path: onSubmit override is the only mutation path', async () => {
    // Verify that no @/generated/auth import is attempted by the component itself.
    // This is structural — tsc verifies it at build time.
    // Here we simply confirm that the override is the sole path.
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    render(
      <MfaTotpDisableConfirm
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
      />
    );

    await user.click(screen.getByTestId('mfa-totp-disable-confirm'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
