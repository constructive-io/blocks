import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * This block does NOT import @/generated/auth (CASE b — ceremony procs are
 * backend-pending). The ceremony runs inside the utility hook use-passkey-enroll.
 *
 * Strategy: mock the utility hook directly so tests control enroll/isPending/isSupported
 * without triggering real fetch calls or the @simplewebauthn/browser dynamic import.
 */

// ---------------------------------------------------------------------------
// Mock the utility hook so we can control enroll / isPending / isSupported.
// ---------------------------------------------------------------------------
const enrollMock = vi.fn();

let mockHookReturn = {
  enroll: enrollMock,
  isPending: false,
  isSupported: true
};

vi.mock('./hooks/use-passkey-enroll', async (importOriginal) => {
  const original = await importOriginal<typeof import('./hooks/use-passkey-enroll')>();
  return {
    ...original,
    usePasskeyEnroll: vi.fn(() => mockHookReturn)
  };
});

import { PasskeyEnroll } from './passkey-enroll';
import { defaultPasskeyEnrollMessages } from './messages';
import { usePasskeyEnroll } from './hooks/use-passkey-enroll';

const MOCK_USER_ID = 'user-abc-123';

beforeEach(() => {
  vi.clearAllMocks();
  mockHookReturn = {
    enroll: enrollMock,
    isPending: false,
    isSupported: true
  };
  // Default: browser supports WebAuthn.
  Object.defineProperty(window, 'PublicKeyCredential', {
    value: function () {},
    writable: true,
    configurable: true
  });
});

async function typeCredentialName(user: ReturnType<typeof userEvent.setup>, name = 'My MacBook') {
  const input = screen.getByTestId('passkey-credential-name');
  await user.clear(input);
  await user.type(input, name);
}

async function submitForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('passkey-enroll-submit'));
}

describe('PasskeyEnroll', () => {
  it('renders the card with credential name input and submit button', () => {
    render(<PasskeyEnroll userId={MOCK_USER_ID} />);
    expect(screen.getByText(defaultPasskeyEnrollMessages.title)).toBeInTheDocument();
    expect(screen.getByTestId('passkey-credential-name')).toBeInTheDocument();
    expect(screen.getByTestId('passkey-enroll-submit')).toHaveTextContent(defaultPasskeyEnrollMessages.enrollButton);
  });

  it('renders unsupported message when enabled=false', () => {
    render(<PasskeyEnroll userId={MOCK_USER_ID} enabled={false} />);
    expect(screen.getByText(defaultPasskeyEnrollMessages.unsupportedBrowser)).toBeInTheDocument();
    expect(screen.queryByTestId('passkey-enroll-submit')).not.toBeInTheDocument();
  });

  it('keeps Hook order stable when browser support becomes available', () => {
    mockHookReturn = { ...mockHookReturn, isSupported: false };
    const { rerender } = render(<PasskeyEnroll userId={MOCK_USER_ID} />);

    expect(screen.getByText(defaultPasskeyEnrollMessages.unsupportedBrowser)).toBeInTheDocument();

    mockHookReturn = { ...mockHookReturn, isSupported: true };
    rerender(<PasskeyEnroll userId={MOCK_USER_ID} />);

    expect(screen.getByTestId('passkey-credential-name')).toBeInTheDocument();
    expect(screen.getByTestId('passkey-enroll-submit')).toBeInTheDocument();
  });

  it('keeps Hook order stable across explicit enabled transitions', () => {
    const { rerender } = render(<PasskeyEnroll userId={MOCK_USER_ID} enabled />);
    expect(screen.getByTestId('passkey-enroll-submit')).toBeInTheDocument();

    rerender(<PasskeyEnroll userId={MOCK_USER_ID} enabled={false} />);
    expect(screen.getByText(defaultPasskeyEnrollMessages.unsupportedBrowser)).toBeInTheDocument();

    rerender(<PasskeyEnroll userId={MOCK_USER_ID} enabled />);
    expect(screen.getByTestId('passkey-credential-name')).toBeInTheDocument();
    expect(screen.getByTestId('passkey-enroll-submit')).toBeInTheDocument();
  });

  it('happy path: calls enroll with credentialName + userId, fires success callbacks', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    enrollMock.mockResolvedValue({ credentialId: 'cred-1', credentialName: 'Touch ID' });

    render(<PasskeyEnroll userId={MOCK_USER_ID} onSuccess={onSuccess} onMessage={onMessage} />);
    await typeCredentialName(user, 'Touch ID');
    await submitForm(user);

    await waitFor(() => expect(enrollMock).toHaveBeenCalledTimes(1));
    expect(enrollMock).toHaveBeenCalledWith({ credentialName: 'Touch ID', userId: MOCK_USER_ID });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ credentialId: 'cred-1', credentialName: 'Touch ID' });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'passkeyEnroll.success' })
    );
  });

  it('fires onMessage with info/browser_prompt_shown before enroll resolves', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();

    enrollMock.mockResolvedValue({ credentialId: 'c1', credentialName: 'Touch ID' });

    render(<PasskeyEnroll userId={MOCK_USER_ID} onMessage={onMessage} />);
    await typeCredentialName(user, 'Touch ID');
    await submitForm(user);

    await waitFor(() => expect(onMessage).toHaveBeenCalledTimes(2));
    const calls = (onMessage.mock.calls as Array<[{ kind: string; key: string }]>).map((c) => c[0]);
    expect(calls[0]).toEqual({ kind: 'info', key: 'browser_prompt_shown' });
    expect(calls[1]).toMatchObject({ kind: 'success', key: 'passkeyEnroll.success' });
  });

  it('maps a coded error and fires onError + onMessage', async () => {
    const user = userEvent.setup();
    const err = Object.assign(new Error('dup'), { extensions: { code: 'ALREADY_REGISTERED' } });
    enrollMock.mockRejectedValue(err);
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(<PasskeyEnroll userId={MOCK_USER_ID} onError={onError} onMessage={onMessage} />);
    await typeCredentialName(user, 'Work Key');
    await submitForm(user);

    expect(await screen.findByText(defaultPasskeyEnrollMessages.errors.ALREADY_REGISTERED)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultPasskeyEnrollMessages.errors.ALREADY_REGISTERED,
      code: 'ALREADY_REGISTERED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'ALREADY_REGISTERED',
      message: defaultPasskeyEnrollMessages.errors.ALREADY_REGISTERED
    });
  });

  it('applies messages.errors override for a custom code', async () => {
    const user = userEvent.setup();
    const err = Object.assign(new Error('fail'), { extensions: { code: 'CHALLENGE_FAILED' } });
    enrollMock.mockRejectedValue(err);

    render(
      <PasskeyEnroll
        userId={MOCK_USER_ID}
        messages={{ errors: { CHALLENGE_FAILED: 'Custom challenge error.' } }}
      />
    );
    await typeCredentialName(user, 'Security Key');
    await submitForm(user);

    expect(await screen.findByText('Custom challenge error.')).toBeInTheDocument();
  });

  it('handles browser abort silently: no error banner, but onError + onMessage fire', async () => {
    const user = userEvent.setup();
    const abortErr = Object.assign(new Error('user cancelled'), { name: 'NotAllowedError' });
    enrollMock.mockRejectedValue(abortErr);
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(<PasskeyEnroll userId={MOCK_USER_ID} onError={onError} onMessage={onMessage} />);
    await typeCredentialName(user, 'Touch ID');
    await submitForm(user);

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({ message: 'Passkey registration was cancelled.', code: 'BROWSER_ABORT' });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'BROWSER_ABORT',
      message: 'Passkey registration was cancelled.'
    });
    // No visible error banner for a user-initiated abort.
    expect(screen.queryByText('Passkey registration was cancelled.')).not.toBeInTheDocument();
  });

  it('renders PROCEDURE_NOT_FOUND message when backend fires that code', async () => {
    const user = userEvent.setup();
    const err = Object.assign(new Error('not found'), { extensions: { code: 'PROCEDURE_NOT_FOUND' } });
    enrollMock.mockRejectedValue(err);

    render(<PasskeyEnroll userId={MOCK_USER_ID} />);
    await typeCredentialName(user, 'Test Key');
    await submitForm(user);

    expect(
      await screen.findByText(defaultPasskeyEnrollMessages.errors.PROCEDURE_NOT_FOUND)
    ).toBeInTheDocument();
  });

  it('validates that credential name is required and blocks submission', async () => {
    const user = userEvent.setup();

    render(<PasskeyEnroll userId={MOCK_USER_ID} />);
    // Submit without typing a name.
    await user.click(screen.getByTestId('passkey-enroll-submit'));

    expect(await screen.findByText(defaultPasskeyEnrollMessages.credentialNameRequired)).toBeInTheDocument();
    expect(enrollMock).not.toHaveBeenCalled();
  });

  it('shows enrollingButton label and hint text while isPending is true', () => {
    mockHookReturn = { ...mockHookReturn, isPending: true };
    render(<PasskeyEnroll userId={MOCK_USER_ID} />);

    expect(screen.getByTestId('passkey-enroll-submit')).toHaveTextContent(
      defaultPasskeyEnrollMessages.enrollingButton
    );
    expect(screen.getByText(defaultPasskeyEnrollMessages.browserPromptHint)).toBeInTheDocument();
  });

  it('onSubmit override seam: threads onSubmit prop to hook as onSubmitOverride, fires onSuccess with override return value, default enrollMock not called independently', async () => {
    const user = userEvent.setup();
    const enrollResult = { credentialId: 'override-cred-1', credentialName: 'Touch ID' };
    const overrideFn = vi.fn().mockResolvedValue(enrollResult);
    const onSuccess = vi.fn();
    const onSuccessDefault = vi.fn();

    // For this test: enrollMock is NOT used — we want to confirm the component
    // passes onSubmit → onSubmitOverride to the hook. We re-mock the hook for this
    // render to simulate the override path: enroll calls overrideFn directly.
    const localEnrollMock = vi.fn().mockImplementation(
      (input: { credentialName: string; userId: string }) => overrideFn(input)
    );
    // Temporarily update mockHookReturn so the hook returns the local enroll.
    mockHookReturn = { enroll: localEnrollMock, isPending: false, isSupported: true };

    render(<PasskeyEnroll userId={MOCK_USER_ID} onSubmit={overrideFn} onSuccess={onSuccess} />);

    // (primary contract) hook was wired with onSubmitOverride = the passed onSubmit prop.
    expect(usePasskeyEnroll).toHaveBeenCalledWith(
      expect.objectContaining({ onSubmitOverride: overrideFn })
    );

    await typeCredentialName(user, 'Touch ID');
    await submitForm(user);

    // (a) overrideFn was called with { credentialName, userId }.
    await waitFor(() => expect(overrideFn).toHaveBeenCalledTimes(1));
    expect(overrideFn).toHaveBeenCalledWith({ credentialName: 'Touch ID', userId: MOCK_USER_ID });

    // (b) onSuccess fires with the return value from the override.
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(enrollResult);

    // (c) the top-level default enrollMock was NOT called (localEnrollMock was used instead).
    expect(enrollMock).not.toHaveBeenCalled();
    void onSuccessDefault;
  });
});
