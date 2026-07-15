/**
 * mfa-totp-enroll tests
 *
 * BACKEND-PENDING CASE (b): the three required hooks (useEnableTotpMutation,
 * useConfirmTotpSetupMutation, useGenerateBackupCodesMutation) do NOT exist in
 * the generated SDK yet — the procedures are undeployed. Therefore:
 *   • This block does NOT import from @/generated/auth (no hooks to mock).
 *   • Tests exercise the onSubmit/onConfirm/onGenerateCodes override path.
 *   • The "no adapters" path (graceful degradation) asserts PROCEDURE_NOT_FOUND.
 *
 * NOTE: vi.mock('@/generated/auth') is present as a no-op guard so that if a
 * future developer accidentally adds a generated import, tests break clearly
 * rather than silently hitting the real client.
 */

import { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// No-op guard — this block currently imports nothing from @/generated/auth
// (CASE b), but the mock prevents any accidental real-client hit if that changes.
vi.mock('@/generated/auth', () => ({}));

import { MfaTotpEnroll } from './mfa-totp-enroll';
import { defaultMfaTotpEnrollMessages } from './messages';
import { defaultMfaBackupCodesDisplayMessages } from '@/blocks/auth/mfa-backup-codes-display/messages';

// ---------------------------------------------------------------------------
// Shared adapter factories
// ---------------------------------------------------------------------------

function makeSetupAdapter(overrides?: { qrUrl?: string; manualKey?: string }) {
  return vi.fn().mockResolvedValue({
    qrUrl: overrides?.qrUrl ?? 'https://example.com/qr.png',
    manualKey: overrides?.manualKey ?? 'ABCDEFGHIJKLMNOP'
  });
}

function makeConfirmAdapter(result = true) {
  return vi.fn().mockResolvedValue(result);
}

function makeCodesAdapter(codes?: string[]) {
  return vi.fn().mockResolvedValue(codes ?? ['abc-def-ghi', 'jkl-mno-pqr', 'stu-vwx-yz0']);
}

function makeAdapters() {
  return {
    onSubmit: makeSetupAdapter(),
    onConfirm: makeConfirmAdapter(),
    onGenerateCodes: makeCodesAdapter()
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MfaTotpEnroll', () => {
  it('renders setup step title on mount', async () => {
    await act(async () => {
      render(<MfaTotpEnroll onSubmit={makeSetupAdapter()} />);
    });
    expect(screen.getByText(defaultMfaTotpEnrollMessages.setupTitle)).toBeInTheDocument();
  });

  it('calls onSubmit adapter on mount and shows QR image', async () => {
    const onSubmit = makeSetupAdapter({ qrUrl: 'https://example.com/qr.png' });
    render(<MfaTotpEnroll onSubmit={onSubmit} />);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('img', { name: /qr code/i })).toBeInTheDocument());
    expect(screen.getByRole('img', { name: /qr code/i })).toHaveAttribute('src', 'https://example.com/qr.png');
  });

  it('finishes one-time setup with the latest committed success callback', async () => {
    const setup = deferred<{ qrUrl: string; manualKey: string }>();
    const initialSubmit = vi.fn(() => setup.promise);
    const replacementSubmit = vi.fn().mockResolvedValue({
      qrUrl: 'https://example.com/replacement.png',
      manualKey: 'REPLACEMENTKEY'
    });
    const initialOnMessage = vi.fn();
    const latestOnMessage = vi.fn();

    const { rerender } = render(
      <MfaTotpEnroll onSubmit={initialSubmit} onMessage={initialOnMessage} />
    );
    await waitFor(() => expect(initialSubmit).toHaveBeenCalledTimes(1));

    rerender(
      <MfaTotpEnroll onSubmit={replacementSubmit} onMessage={latestOnMessage} />
    );
    await act(async () => {
      setup.resolve({ qrUrl: 'https://example.com/qr-latest.png', manualKey: 'LATESTCOMMITTEDKEY' });
    });

    expect(initialSubmit).toHaveBeenCalledTimes(1);
    expect(replacementSubmit).not.toHaveBeenCalled();
    expect(initialOnMessage).not.toHaveBeenCalled();
    expect(latestOnMessage).toHaveBeenCalledWith({ kind: 'info', key: 'qr_ready' });
    expect(screen.getByRole('img', { name: /qr code/i })).toHaveAttribute(
      'src',
      'https://example.com/qr-latest.png'
    );
  });

  it('maps a pending setup failure with the latest committed messages and callbacks', async () => {
    const setup = deferred<{ qrUrl: string; manualKey: string }>();
    const onSubmit = vi.fn(() => setup.promise);
    const initialOnError = vi.fn();
    const initialOnMessage = vi.fn();
    const latestOnError = vi.fn();
    const latestOnMessage = vi.fn();

    const { rerender } = render(
      <MfaTotpEnroll
        onSubmit={onSubmit}
        onError={initialOnError}
        onMessage={initialOnMessage}
        messages={{ errors: { RATE_LIMITED: 'Initial setup error.' } }}
      />
    );
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    rerender(
      <MfaTotpEnroll
        onSubmit={onSubmit}
        onError={latestOnError}
        onMessage={latestOnMessage}
        messages={{ errors: { RATE_LIMITED: 'Latest committed setup error.' } }}
      />
    );
    await act(async () => {
      setup.reject(Object.assign(new Error('rate limited'), { extensions: { code: 'RATE_LIMITED' } }));
    });

    expect(initialOnError).not.toHaveBeenCalled();
    expect(initialOnMessage).not.toHaveBeenCalled();
    expect(latestOnError).toHaveBeenCalledWith({
      message: 'Latest committed setup error.',
      code: 'RATE_LIMITED'
    });
    expect(latestOnMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'RATE_LIMITED',
      message: 'Latest committed setup error.'
    });
    expect(screen.getByText('Latest committed setup error.')).toBeInTheDocument();
  });

  it('does not leak callbacks from a suspended render into pending setup', async () => {
    const setup = deferred<{ qrUrl: string; manualKey: string }>();
    const onSubmit = vi.fn(() => setup.promise);
    const committedOnMessage = vi.fn();
    const abandonedOnMessage = vi.fn();
    const never = new Promise<never>(() => {});

    function SuspendAfterEnroll({ suspend }: { suspend: boolean }) {
      if (suspend) throw never;
      return null;
    }

    function EnrollTree({ onMessage, suspend }: { onMessage: typeof committedOnMessage; suspend: boolean }) {
      return (
        <Suspense fallback={<div>Suspended update</div>}>
          <MfaTotpEnroll onSubmit={onSubmit} onMessage={onMessage} />
          <SuspendAfterEnroll suspend={suspend} />
        </Suspense>
      );
    }

    const { rerender } = render(<EnrollTree onMessage={committedOnMessage} suspend={false} />);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    rerender(<EnrollTree onMessage={abandonedOnMessage} suspend />);
    await act(async () => {
      setup.resolve({ qrUrl: 'https://example.com/qr.png', manualKey: 'ABCDEFGHIJKLMNOP' });
    });

    expect(committedOnMessage).toHaveBeenCalledWith({ kind: 'info', key: 'qr_ready' });
    expect(abandonedOnMessage).not.toHaveBeenCalled();

    rerender(<EnrollTree onMessage={committedOnMessage} suspend={false} />);
  });

  it('shows manual entry key formatted in groups of 4', async () => {
    render(<MfaTotpEnroll onSubmit={makeSetupAdapter({ manualKey: 'ABCDEFGHIJKLMNOP' })} />);

    await waitFor(() => expect(screen.getByText(/ABCD/)).toBeInTheDocument());
    // Key should be rendered as code element with groups-of-4 formatting
    const codeEl = screen.getByText(/ABCD EFGH IJKL MNOP/);
    expect(codeEl.tagName).toBe('CODE');
  });

  it('advances to verify step when Next is clicked', async () => {
    const user = userEvent.setup();
    render(<MfaTotpEnroll onSubmit={makeSetupAdapter()} />);

    await waitFor(() => expect(screen.getByTestId('setup-next')).toBeInTheDocument());
    await user.click(screen.getByTestId('setup-next'));

    expect(screen.getByText(defaultMfaTotpEnrollMessages.verifyTitle)).toBeInTheDocument();
    expect(screen.getByTestId('totp-code')).toBeInTheDocument();
  });

  it('returns to setup step when Back is clicked from verify', async () => {
    const user = userEvent.setup();
    render(<MfaTotpEnroll onSubmit={makeSetupAdapter()} />);

    await waitFor(() => expect(screen.getByTestId('setup-next')).toBeInTheDocument());
    await user.click(screen.getByTestId('setup-next'));
    await user.click(screen.getByTestId('verify-back'));

    expect(screen.getByText(defaultMfaTotpEnrollMessages.setupTitle)).toBeInTheDocument();
  });

  it('calls onConfirm with the entered code and advances to backup-codes', async () => {
    const user = userEvent.setup();
    const adapters = makeAdapters();
    const onMessage = vi.fn();

    render(<MfaTotpEnroll {...adapters} onMessage={onMessage} />);

    await waitFor(() => expect(screen.getByTestId('setup-next')).toBeInTheDocument());
    await user.click(screen.getByTestId('setup-next'));

    const codeInput = screen.getByTestId('totp-code');
    await user.type(codeInput, '123456');
    await user.click(screen.getByTestId('verify-submit'));

    await waitFor(() => expect(adapters.onConfirm).toHaveBeenCalledWith('123456'));
    await waitFor(() => expect(adapters.onGenerateCodes).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByText(defaultMfaBackupCodesDisplayMessages.title)).toBeInTheDocument()
    );
  });

  it('displays backup codes in the list', async () => {
    const user = userEvent.setup();
    const codes = ['aaa-bbb-111', 'ccc-ddd-222'];
    const adapters = {
      onSubmit: makeSetupAdapter(),
      onConfirm: makeConfirmAdapter(),
      onGenerateCodes: makeCodesAdapter(codes)
    };

    render(<MfaTotpEnroll {...adapters} />);

    await waitFor(() => expect(screen.getByTestId('setup-next')).toBeInTheDocument());
    await user.click(screen.getByTestId('setup-next'));
    await user.type(screen.getByTestId('totp-code'), '654321');
    await user.click(screen.getByTestId('verify-submit'));

    // Child block [[auth-mfa-backup-codes-display]] renders codes in a <ul aria-label="Backup codes">
    await waitFor(() => expect(screen.getByRole('list', { name: 'Backup codes' })).toBeInTheDocument());
    expect(screen.getByText('aaa-bbb-111')).toBeInTheDocument();
    expect(screen.getByText('ccc-ddd-222')).toBeInTheDocument();
  });

  it('fires onSuccess with backupCodes when Done is clicked', async () => {
    const user = userEvent.setup();
    const codes = ['x1', 'x2'];
    const adapters = {
      onSubmit: makeSetupAdapter(),
      onConfirm: makeConfirmAdapter(),
      onGenerateCodes: makeCodesAdapter(codes)
    };
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    render(<MfaTotpEnroll {...adapters} onSuccess={onSuccess} onMessage={onMessage} />);

    await waitFor(() => expect(screen.getByTestId('setup-next')).toBeInTheDocument());
    await user.click(screen.getByTestId('setup-next'));
    await user.type(screen.getByTestId('totp-code'), '111222');
    await user.click(screen.getByTestId('verify-submit'));

    // Child block [[auth-mfa-backup-codes-display]] requires the confirmation
    // checkbox (requireConfirmation=true by default) before Continue is enabled.
    await waitFor(() => expect(screen.getByTestId('confirm-checkbox')).toBeInTheDocument());
    await user.click(screen.getByTestId('confirm-checkbox'));
    await waitFor(() => expect(screen.getByTestId('continue-button')).not.toBeDisabled());
    await user.click(screen.getByTestId('continue-button'));

    expect(onSuccess).toHaveBeenCalledWith({ backupCodes: codes });
    expect(onMessage).toHaveBeenCalledWith({ kind: 'success', key: 'enrollment_complete' });
  });

  it('shows INVALID_TOTP error when confirm returns false', async () => {
    const user = userEvent.setup();
    const adapters = {
      onSubmit: makeSetupAdapter(),
      onConfirm: makeConfirmAdapter(false),
      onGenerateCodes: makeCodesAdapter()
    };
    const onError = vi.fn();

    render(<MfaTotpEnroll {...adapters} onError={onError} />);

    await waitFor(() => expect(screen.getByTestId('setup-next')).toBeInTheDocument());
    await user.click(screen.getByTestId('setup-next'));
    await user.type(screen.getByTestId('totp-code'), '999999');
    await user.click(screen.getByTestId('verify-submit'));

    await waitFor(() =>
      expect(screen.getByText(defaultMfaTotpEnrollMessages.errors.INVALID_TOTP)).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledWith({
      message: defaultMfaTotpEnrollMessages.errors.INVALID_TOTP,
      code: 'INVALID_TOTP'
    });
  });

  it('applies messages overrides for error codes', async () => {
    const user = userEvent.setup();
    const adapters = {
      onSubmit: makeSetupAdapter(),
      onConfirm: makeConfirmAdapter(false),
      onGenerateCodes: makeCodesAdapter()
    };

    render(
      <MfaTotpEnroll
        {...adapters}
        messages={{ errors: { INVALID_TOTP: 'Nope, wrong code.' } }}
      />
    );

    await waitFor(() => expect(screen.getByTestId('setup-next')).toBeInTheDocument());
    await user.click(screen.getByTestId('setup-next'));
    await user.type(screen.getByTestId('totp-code'), '000000');
    await user.click(screen.getByTestId('verify-submit'));

    await waitFor(() => expect(screen.getByText('Nope, wrong code.')).toBeInTheDocument());
  });

  it('shows PROCEDURE_NOT_FOUND error when no adapters provided (graceful degradation)', async () => {
    const onError = vi.fn();
    const onMessage = vi.fn();

    // No adapters — backend-pending CASE (b): default path throws PROCEDURE_NOT_FOUND.
    render(<MfaTotpEnroll onError={onError} onMessage={onMessage} />);

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PROCEDURE_NOT_FOUND' })
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'PROCEDURE_NOT_FOUND' })
    );
    // The PROCEDURE_NOT_FOUND message should be rendered inline
    await waitFor(() =>
      expect(
        screen.getByText(defaultMfaTotpEnrollMessages.errors.PROCEDURE_NOT_FOUND)
      ).toBeInTheDocument()
    );
  });

  it('shows setup error when onSubmit adapter throws', async () => {
    const onError = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('rate limited'), { extensions: { code: 'RATE_LIMITED' } })
    );

    render(<MfaTotpEnroll onSubmit={onSubmit} onError={onError} />);

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({
      message: defaultMfaTotpEnrollMessages.errors.RATE_LIMITED,
      code: 'RATE_LIMITED'
    });
  });

  it('validates that totp code must be 6 digits before calling onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<MfaTotpEnroll onSubmit={makeSetupAdapter()} onConfirm={onConfirm} onGenerateCodes={makeCodesAdapter()} />);

    await waitFor(() => expect(screen.getByTestId('setup-next')).toBeInTheDocument());
    await user.click(screen.getByTestId('setup-next'));

    // Type only 3 digits — should not call onConfirm
    await user.type(screen.getByTestId('totp-code'), '123');
    await user.click(screen.getByTestId('verify-submit'));

    // Give async a chance to run
    await act(async () => {});

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('advances to backup-codes step even when onGenerateCodes throws (TOTP already enabled)', async () => {
    // B2 regression: generateBackupCodes failure must NOT leave user on step 2.
    // TOTP is already enabled after confirmTotpSetup succeeds, so step 3 must
    // always be reached — with empty codes and an onError/onMessage notification.
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const adapters = {
      onSubmit: makeSetupAdapter(),
      onConfirm: makeConfirmAdapter(true),
      onGenerateCodes: vi.fn().mockRejectedValue(
        Object.assign(new Error('not found'), { extensions: { code: 'PROCEDURE_NOT_FOUND' } })
      )
    };

    render(<MfaTotpEnroll {...adapters} onError={onError} onMessage={onMessage} />);

    await waitFor(() => expect(screen.getByTestId('setup-next')).toBeInTheDocument());
    await user.click(screen.getByTestId('setup-next'));
    await user.type(screen.getByTestId('totp-code'), '123456');
    await user.click(screen.getByTestId('verify-submit'));

    // Must advance to backup-codes step (child block title is visible)
    await waitFor(() =>
      expect(screen.getByText(defaultMfaBackupCodesDisplayMessages.title)).toBeInTheDocument()
    );

    // Error notification must have fired (codes generation failed)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PROCEDURE_NOT_FOUND' })
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'PROCEDURE_NOT_FOUND' })
    );

    // Verify step title must NOT be visible (user is NOT stuck on step 2)
    expect(screen.queryByText(defaultMfaTotpEnrollMessages.verifyTitle)).not.toBeInTheDocument();
  });

  it('data-slot is mfa-totp-enroll', async () => {
    await act(async () => {
      render(<MfaTotpEnroll onSubmit={makeSetupAdapter()} />);
    });
    expect(document.querySelector('[data-slot="mfa-totp-enroll"]')).toBeInTheDocument();
  });
});
