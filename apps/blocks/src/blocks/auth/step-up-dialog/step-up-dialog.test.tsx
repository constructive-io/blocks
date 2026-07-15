import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated auth SDK — the data path is the generated hook.
// useRequireStepUpQuery returns { data: { requireStepUp: false } } by default
// (i.e. step-up is NOT already valid, so the dialog renders its form).
const { mutatePasswordMock, mutateTotpMock } = vi.hoisted(() => ({
  mutatePasswordMock: vi.fn(),
  mutateTotpMock: vi.fn()
}));

// requireStepUp query — controllable per-test via this module-level variable.
let requireStepUpResult: boolean | null = false;

vi.mock('@/generated/auth', () => ({
  useRequireStepUpQuery: ({ enabled }: { enabled?: boolean }) => ({
    data: enabled ? { requireStepUp: requireStepUpResult } : undefined,
    isLoading: false
  }),
  useVerifyPasswordMutation: () => ({
    mutateAsync: mutatePasswordMock,
    isPending: false
  }),
  useVerifyTotpMutation: () => ({
    mutateAsync: mutateTotpMock,
    isPending: false
  })
}));

import { StepUpDialog } from './step-up-dialog';

beforeEach(() => {
  requireStepUpResult = false;
  mutatePasswordMock.mockReset();
  mutateTotpMock.mockReset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDialog(props: Partial<React.ComponentProps<typeof StepUpDialog>> = {}) {
  const onVerify = props.onVerify ?? vi.fn();
  const result = render(
    <StepUpDialog
      open={true}
      type="password"
      onVerify={onVerify}
      {...props}
    />
  );
  return { ...result, onVerify };
}

// ---------------------------------------------------------------------------
// Render tests
// ---------------------------------------------------------------------------

describe('StepUpDialog — password mode', () => {
  it('renders password form when open and step-up not yet valid', () => {
    renderDialog({ type: 'password' });
    expect(screen.getByText('Confirm your password')).toBeInTheDocument();
    expect(screen.getByTestId('step-up-password')).toBeInTheDocument();
    expect(screen.getByTestId('step-up-submit')).toHaveTextContent('Confirm');
    expect(screen.getByTestId('step-up-cancel')).toHaveTextContent('Cancel');
  });

  it('renders mfa form in mfa mode', () => {
    renderDialog({ type: 'mfa' });
    expect(screen.getByText('Confirm with two-factor authentication')).toBeInTheDocument();
    expect(screen.getByTestId('step-up-totp')).toBeInTheDocument();
    expect(screen.getByTestId('step-up-submit')).toHaveTextContent('Confirm');
  });
});

// ---------------------------------------------------------------------------
// Short-circuit path — requireStepUp returns true
// ---------------------------------------------------------------------------

describe('StepUpDialog — short-circuit (requireStepUp=true)', () => {
  it('fires onVerify({ ok:true }) without rendering the form when step-up is already valid', async () => {
    requireStepUpResult = true;
    const onVerify = vi.fn();
    const onMessage = vi.fn();

    render(
      <StepUpDialog open={true} type="password" onVerify={onVerify} onMessage={onMessage} />
    );

    // onVerify fires via useEffect — no user interaction required.
    await waitFor(() => expect(onVerify).toHaveBeenCalledWith({ ok: true }));
    expect(onMessage).toHaveBeenCalledWith({ kind: 'success', key: 'stepUp.skipped' });

    // The password/TOTP form inputs must NOT be present (short-circuited).
    expect(screen.queryByTestId('step-up-password')).not.toBeInTheDocument();
    expect(screen.queryByTestId('step-up-submit')).not.toBeInTheDocument();

    // The generated mutations are never called.
    expect(mutatePasswordMock).not.toHaveBeenCalled();
  });

  it('does NOT short-circuit when requireStepUp returns false', () => {
    requireStepUpResult = false;
    const onVerify = vi.fn();

    render(<StepUpDialog open={true} type="password" onVerify={onVerify} />);

    // Form renders normally; onVerify has not fired.
    expect(screen.getByTestId('step-up-password')).toBeInTheDocument();
    expect(onVerify).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Happy path: password verify
// ---------------------------------------------------------------------------

describe('StepUpDialog — password verify (happy path)', () => {
  it('calls verifyPassword mutation and fires onVerify({ ok: true })', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();
    const onMessage = vi.fn();
    mutatePasswordMock.mockResolvedValue({ verifyPassword: { result: true } });

    renderDialog({ type: 'password', onVerify, onMessage });

    await user.type(screen.getByTestId('step-up-password'), 'MySecret1!');
    await user.click(screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(mutatePasswordMock).toHaveBeenCalledTimes(1));
    expect(mutatePasswordMock).toHaveBeenCalledWith({ input: { password: 'MySecret1!' } });
    await waitFor(() => expect(onVerify).toHaveBeenCalledWith({ ok: true }));
    expect(onMessage).toHaveBeenCalledWith({ kind: 'success', key: 'stepUp.verified' });
  });

  it('calls verifyTotp mutation and fires onVerify({ ok: true }) in mfa mode', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();
    mutateTotpMock.mockResolvedValue({ verifyTotp: { result: true } });

    renderDialog({ type: 'mfa', onVerify });

    await user.type(screen.getByTestId('step-up-totp'), '123456');
    await user.click(screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(mutateTotpMock).toHaveBeenCalledTimes(1));
    expect(mutateTotpMock).toHaveBeenCalledWith({ input: { totpValue: '123456' } });
    await waitFor(() => expect(onVerify).toHaveBeenCalledWith({ ok: true }));
  });
});

// ---------------------------------------------------------------------------
// Error paths
// ---------------------------------------------------------------------------

describe('StepUpDialog — error paths', () => {
  it('shows INVALID_CREDENTIALS error when verifyPassword returns false', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();
    const onError = vi.fn();
    mutatePasswordMock.mockResolvedValue({ verifyPassword: { result: false } });

    renderDialog({ type: 'password', onVerify, onError });

    await user.type(screen.getByTestId('step-up-password'), 'wrongpass');
    await user.click(screen.getByTestId('step-up-submit'));

    expect(await screen.findByText('Incorrect password. Please try again.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: 'Incorrect password. Please try again.',
      code: 'INVALID_CREDENTIALS'
    });
    expect(onVerify).toHaveBeenCalledWith({ ok: false, reason: 'error' });
  });

  it('shows INVALID_TOTP error when verifyTotp returns false', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();
    mutateTotpMock.mockResolvedValue({ verifyTotp: { result: false } });

    renderDialog({ type: 'mfa', onVerify });

    await user.type(screen.getByTestId('step-up-totp'), '000000');
    await user.click(screen.getByTestId('step-up-submit'));

    expect(await screen.findByText('Invalid code. Check your authenticator app and try again.')).toBeInTheDocument();
    expect(onVerify).toHaveBeenCalledWith({ ok: false, reason: 'error' });
  });

  it('maps a coded GraphQL error and applies messages override', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutatePasswordMock.mockRejectedValue(
      Object.assign(new Error('rate limited'), { extensions: { code: 'RATE_LIMITED' } })
    );

    renderDialog({
      type: 'password',
      onVerify,
      onError,
      onMessage,
      messages: { errors: { RATE_LIMITED: 'Slow down!' } }
    });

    await user.type(screen.getByTestId('step-up-password'), 'somepassword');
    await user.click(screen.getByTestId('step-up-submit'));

    expect(await screen.findByText('Slow down!')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: 'Slow down!', code: 'RATE_LIMITED' });
    expect(onMessage).toHaveBeenCalledWith({ kind: 'error', key: 'RATE_LIMITED', message: 'Slow down!' });
    expect(onVerify).toHaveBeenCalledWith(expect.objectContaining({ ok: false, reason: 'error' }));
  });
});

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

describe('StepUpDialog — cancel', () => {
  it('fires onVerify({ ok: false, reason: "cancelled" }) on cancel button', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();

    renderDialog({ type: 'password', onVerify });

    await user.click(screen.getByTestId('step-up-cancel'));
    expect(onVerify).toHaveBeenCalledWith({ ok: false, reason: 'cancelled' });
  });
});

// ---------------------------------------------------------------------------
// onSubmitPassword override path
// ---------------------------------------------------------------------------

describe('StepUpDialog — onSubmitPassword override', () => {
  it('calls the override instead of the generated mutation (success path)', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();
    const onSubmitPassword = vi.fn().mockResolvedValue({ ok: true } as const);

    renderDialog({ type: 'password', onVerify, onSubmitPassword });

    await user.type(screen.getByTestId('step-up-password'), 'hunter2!');
    await user.click(screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(onSubmitPassword).toHaveBeenCalledTimes(1));
    expect(onSubmitPassword).toHaveBeenCalledWith({ password: 'hunter2!' });
    expect(mutatePasswordMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onVerify).toHaveBeenCalledWith({ ok: true }));
  });

  it('propagates the override failure result (reason + error) verbatim to onVerify', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();
    const causeErr = new Error('custom backend failure');
    // Override returns its own reason:'error' + cause — must flow through unchanged.
    const onSubmitPassword = vi.fn().mockResolvedValue({
      ok: false,
      reason: 'error' as const,
      error: causeErr
    });

    renderDialog({ type: 'password', onVerify, onSubmitPassword });

    await user.type(screen.getByTestId('step-up-password'), 'any-pass');
    await user.click(screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(onVerify).toHaveBeenCalledTimes(1));
    // reason and error from the override must be preserved in the onVerify call.
    expect(onVerify).toHaveBeenCalledWith({ ok: false, reason: 'error', error: causeErr });
    expect(mutatePasswordMock).not.toHaveBeenCalled();
  });

  it('propagates reason:"cancelled" from override without treating it as an error', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();
    const onError = vi.fn();
    const onSubmitPassword = vi.fn().mockResolvedValue({
      ok: false,
      reason: 'cancelled' as const
    });

    renderDialog({ type: 'password', onVerify, onError, onSubmitPassword });

    await user.type(screen.getByTestId('step-up-password'), 'any-pass');
    await user.click(screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(onVerify).toHaveBeenCalledTimes(1));
    expect(onVerify).toHaveBeenCalledWith({ ok: false, reason: 'cancelled' });
    // cancelled is not an error — onError must NOT fire
    expect(onError).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// onSubmitTotp override path
// ---------------------------------------------------------------------------

describe('StepUpDialog — onSubmitTotp override', () => {
  it('calls the override instead of the generated mutation (success path)', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();
    const onSubmitTotp = vi.fn().mockResolvedValue({ ok: true } as const);

    renderDialog({ type: 'mfa', onVerify, onSubmitTotp });

    await user.type(screen.getByTestId('step-up-totp'), '654321');
    await user.click(screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(onSubmitTotp).toHaveBeenCalledTimes(1));
    expect(onSubmitTotp).toHaveBeenCalledWith({ totpValue: '654321' });
    expect(mutateTotpMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onVerify).toHaveBeenCalledWith({ ok: true }));
  });

  it('propagates the totp override failure result verbatim to onVerify', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();
    const causeErr = new Error('totp backend error');
    const onSubmitTotp = vi.fn().mockResolvedValue({
      ok: false,
      reason: 'error' as const,
      error: causeErr
    });

    renderDialog({ type: 'mfa', onVerify, onSubmitTotp });

    await user.type(screen.getByTestId('step-up-totp'), '000000');
    await user.click(screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(onVerify).toHaveBeenCalledTimes(1));
    expect(onVerify).toHaveBeenCalledWith({ ok: false, reason: 'error', error: causeErr });
    expect(mutateTotpMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Validation — blocks submit on empty field
// ---------------------------------------------------------------------------

describe('StepUpDialog — validation', () => {
  it('blocks submit when password field is empty', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();

    renderDialog({ type: 'password', onVerify });

    await user.click(screen.getByTestId('step-up-submit'));

    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(mutatePasswordMock).not.toHaveBeenCalled();
    expect(onVerify).not.toHaveBeenCalled();
  });
});
