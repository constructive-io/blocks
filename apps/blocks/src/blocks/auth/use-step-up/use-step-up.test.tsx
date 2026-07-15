import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

// Mock @/generated/auth — same pattern as dialog test.
const { mutatePasswordMock, mutateTotpMock } = vi.hoisted(() => ({
  mutatePasswordMock: vi.fn(),
  mutateTotpMock: vi.fn()
}));

vi.mock('@/generated/auth', () => ({
  useRequireStepUpQuery: () => ({ data: { requireStepUp: false }, isLoading: false }),
  useVerifyPasswordMutation: () => ({ mutateAsync: mutatePasswordMock, isPending: false }),
  useVerifyTotpMutation: () => ({ mutateAsync: mutateTotpMock, isPending: false })
}));

import { StepUpProvider } from './step-up-provider';
import { useStepUp, StepUpError } from './use-step-up';

beforeEach(() => {
  mutatePasswordMock.mockReset();
  mutateTotpMock.mockReset();
});

// ---------------------------------------------------------------------------
// Consumer component used in tests
// ---------------------------------------------------------------------------

function TestConsumer({
  onResolve,
  onReject,
  options = { type: 'password' as const }
}: {
  onResolve?: () => void;
  onReject?: (err: unknown) => void;
  options?: Parameters<ReturnType<typeof useStepUp>>[0];
}) {
  const stepUp = useStepUp();

  async function trigger() {
    try {
      await stepUp(options);
      onResolve?.();
    } catch (err) {
      onReject?.(err);
    }
  }

  return <button onClick={trigger} data-testid="trigger">Trigger</button>;
}

function wrapper({ children }: { children: ReactNode }) {
  return <StepUpProvider>{children}</StepUpProvider>;
}

// ---------------------------------------------------------------------------
// useStepUp — throws outside provider
// ---------------------------------------------------------------------------

describe('useStepUp — outside provider', () => {
  it('throws when called outside StepUpProvider', () => {
    // Suppress the expected error from React error boundary.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useStepUp() must be called inside <StepUpProvider>'
    );
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// useStepUp — resolve path
// ---------------------------------------------------------------------------

describe('useStepUp — resolve on verify', () => {
  it('resolves the Promise when the user verifies with correct password', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    mutatePasswordMock.mockResolvedValue({ verifyPassword: { result: true } });

    render(
      <StepUpProvider>
        <TestConsumer onResolve={onResolve} options={{ type: 'password' }} />
      </StepUpProvider>
    );

    // Open the dialog
    await user.click(screen.getByTestId('trigger'));
    expect(await screen.findByTestId('step-up-password')).toBeInTheDocument();

    // Fill and submit
    await user.type(screen.getByTestId('step-up-password'), 'CorrectPass1!');
    await user.click(screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(onResolve).toHaveBeenCalledTimes(1));
    expect(mutatePasswordMock).toHaveBeenCalledWith({ input: { password: 'CorrectPass1!' } });
  });

  it('resolves the Promise when the user verifies with correct TOTP code', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    mutateTotpMock.mockResolvedValue({ verifyTotp: { result: true } });

    render(
      <StepUpProvider>
        <TestConsumer onResolve={onResolve} options={{ type: 'mfa' }} />
      </StepUpProvider>
    );

    await user.click(screen.getByTestId('trigger'));
    expect(await screen.findByTestId('step-up-totp')).toBeInTheDocument();

    await user.type(screen.getByTestId('step-up-totp'), '123456');
    await user.click(screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(onResolve).toHaveBeenCalledTimes(1));
  });
});

// ---------------------------------------------------------------------------
// useStepUp — reject on cancel
// ---------------------------------------------------------------------------

describe('useStepUp — reject on cancel', () => {
  it('rejects with StepUpError({ reason: "cancelled" }) when user cancels', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();

    render(
      <StepUpProvider>
        <TestConsumer onReject={onReject} options={{ type: 'password' }} />
      </StepUpProvider>
    );

    await user.click(screen.getByTestId('trigger'));
    expect(await screen.findByTestId('step-up-cancel')).toBeInTheDocument();

    await user.click(screen.getByTestId('step-up-cancel'));

    await waitFor(() => expect(onReject).toHaveBeenCalledTimes(1));
    const err = onReject.mock.calls[0][0];
    expect(err).toBeInstanceOf(StepUpError);
    expect((err as StepUpError).reason).toBe('cancelled');
    expect((err as StepUpError).message).toBe('Step-up cancelled.');
  });
});

// ---------------------------------------------------------------------------
// useStepUp — reject on error
// ---------------------------------------------------------------------------

describe('useStepUp — reject on verification error', () => {
  it('rejects with StepUpError({ reason: "error" }) when mutation throws', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    mutatePasswordMock.mockRejectedValue(
      Object.assign(new Error('server error'), { extensions: { code: 'RATE_LIMITED' } })
    );

    render(
      <StepUpProvider>
        <TestConsumer onReject={onReject} options={{ type: 'password' }} />
      </StepUpProvider>
    );

    await user.click(screen.getByTestId('trigger'));
    await user.type(screen.getByTestId('step-up-password'), 'somepass');
    await user.click(screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(onReject).toHaveBeenCalledTimes(1));
    const err = onReject.mock.calls[0][0];
    expect(err).toBeInstanceOf(StepUpError);
    expect((err as StepUpError).reason).toBe('error');
  });
});

// ---------------------------------------------------------------------------
// useStepUp — concurrent call rejection
// ---------------------------------------------------------------------------

describe('useStepUp — concurrent call rejection', () => {
  it('rejects a second stepUp() call while one is already active', async () => {
    const user = userEvent.setup();
    const onReject1 = vi.fn();
    const onReject2 = vi.fn();

    function TwoTriggers() {
      const stepUp = useStepUp();

      return (
        <>
          <button
            onClick={async () => {
              try { await stepUp({ type: 'password' }); }
              catch (e) { onReject1(e); }
            }}
            data-testid="trigger-1"
          >
            Trigger 1
          </button>
          <button
            onClick={async () => {
              try { await stepUp({ type: 'password' }); }
              catch (e) { onReject2(e); }
            }}
            data-testid="trigger-2"
          >
            Trigger 2
          </button>
        </>
      );
    }

    render(
      <StepUpProvider>
        <TwoTriggers />
      </StepUpProvider>
    );

    // First call opens the dialog.
    await user.click(screen.getByTestId('trigger-1'));
    expect(await screen.findByTestId('step-up-password')).toBeInTheDocument();

    // Second call while dialog is open — should reject immediately.
    await user.click(screen.getByTestId('trigger-2'));

    await waitFor(() => expect(onReject2).toHaveBeenCalledTimes(1));
    const err = onReject2.mock.calls[0][0];
    expect(err).toBeInstanceOf(StepUpError);
    expect((err as StepUpError).reason).toBe('error');

    // First call is still pending (not resolved yet)
    expect(onReject1).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tier mapping
// ---------------------------------------------------------------------------

describe('StepUpProvider — tier resolution', () => {
  it('resolves tier: medium to type: password', async () => {
    const user = userEvent.setup();
    mutatePasswordMock.mockResolvedValue({ verifyPassword: { result: true } });

    render(
      <StepUpProvider>
        <TestConsumer options={{ tier: 'medium' }} />
      </StepUpProvider>
    );

    await user.click(screen.getByTestId('trigger'));
    // Should render password form (not mfa)
    expect(await screen.findByTestId('step-up-password')).toBeInTheDocument();
    expect(screen.queryByTestId('step-up-totp')).not.toBeInTheDocument();
  });

  it('resolves tier: high to type: password in v1 (conservative fallback — no MFA probe yet)', async () => {
    const user = userEvent.setup();
    mutatePasswordMock.mockResolvedValue({ verifyPassword: { result: true } });

    render(
      <StepUpProvider>
        <TestConsumer options={{ tier: 'high' }} />
      </StepUpProvider>
    );

    await user.click(screen.getByTestId('trigger'));
    // v1: tier:'high' falls back to password; wave-2 will probe MFA enrollment.
    expect(await screen.findByTestId('step-up-password')).toBeInTheDocument();
    expect(screen.queryByTestId('step-up-totp')).not.toBeInTheDocument();
  });

  it('type wins over tier when both are provided', async () => {
    const user = userEvent.setup();
    mutateTotpMock.mockResolvedValue({ verifyTotp: { result: true } });

    render(
      <StepUpProvider>
        <TestConsumer options={{ type: 'mfa', tier: 'medium' }} />
      </StepUpProvider>
    );

    await user.click(screen.getByTestId('trigger'));
    // type: 'mfa' wins over tier: 'medium'
    expect(await screen.findByTestId('step-up-totp')).toBeInTheDocument();
    expect(screen.queryByTestId('step-up-password')).not.toBeInTheDocument();
  });
});
