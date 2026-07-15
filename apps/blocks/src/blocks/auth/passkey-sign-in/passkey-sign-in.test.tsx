import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mock @/generated/auth — BACKEND-PENDING (CASE b): the hooks do NOT exist in
// the real generated SDK yet (passkey_begin_sign_in / passkey_finish_sign_in are
// undeployed). We mock the module anyway so tests that import via an indirect path
// don't accidentally reach the real client. The passkey-sign-in component itself
// does NOT import @/generated/auth (see CASE b note in the component), but the
// utility hook pattern still mocks it for consistency with the block contract.
// ---------------------------------------------------------------------------
vi.mock('@/generated/auth', () => ({}));

// ---------------------------------------------------------------------------
// Mock @simplewebauthn/browser — the module is not installed in the authoring
// workspace (consumer installs it at shadcn-add time via the registry dep).
// The vi.mock here satisfies the dynamic import inside use-passkey-sign-in.ts
// so Vite's static analysis doesn't fail the module resolution step.
// ---------------------------------------------------------------------------
vi.mock('@simplewebauthn/browser', () => ({
  startAuthentication: vi.fn()
}));

// ---------------------------------------------------------------------------
// Mock the utility hook so we can control signIn / isPending / isSupported
// without triggering real fetch calls. We also capture the options passed to the
// hook so conditional UI tests can verify callbacks are wired correctly.
// ---------------------------------------------------------------------------
const signInMock = vi.fn();
const mockHookReturn = {
  signIn: signInMock,
  isPending: false,
  isSupported: true,
  errorCode: null
};

import type { UsePasskeySignInOptions } from './hooks/use-passkey-sign-in';

// Holds the last options passed to usePasskeySignIn so tests can inspect them
// and manually invoke the conditional-UI callbacks.
let lastHookOptions: UsePasskeySignInOptions | undefined;

vi.mock('./hooks/use-passkey-sign-in', async (importOriginal) => {
  const original = await importOriginal<typeof import('./hooks/use-passkey-sign-in')>();
  return {
    ...original,
    usePasskeySignIn: vi.fn((opts: UsePasskeySignInOptions) => {
      lastHookOptions = opts;
      return mockHookReturn;
    })
  };
});

import { PasskeySignIn } from './passkey-sign-in';
import { defaultPasskeySignInMessages } from './messages';

function makeResult(overrides: Record<string, unknown> = {}) {
  return {
    session: { id: 's1', accessToken: 'jwt', expiresAt: '2099-01-01' },
    user: { id: 'u1' },
    ...overrides
  };
}

beforeEach(() => {
  signInMock.mockReset();
  mockHookReturn.isPending = false;
  mockHookReturn.isSupported = true;
  mockHookReturn.errorCode = null;
  lastHookOptions = undefined;
});

describe('PasskeySignIn', () => {
  it('renders the sign-in button when browser supports WebAuthn', () => {
    render(<PasskeySignIn />);
    expect(screen.getByTestId('passkey-sign-in-btn')).toBeInTheDocument();
    expect(screen.getByTestId('passkey-sign-in-btn')).toHaveTextContent('Sign in with passkey');
  });

  it('renders accessible fallback (no button) when isSupported is false', () => {
    // MINOR-1: component renders a role=status div with aria-label instead of null
    // so screen-reader users get the unsupportedBrowser message.
    mockHookReturn.isSupported = false;
    render(<PasskeySignIn />);
    expect(screen.queryByTestId('passkey-sign-in-btn')).toBeNull();
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      defaultPasskeySignInMessages.unsupportedBrowser
    );
  });

  it('shows stepUp label when stepUpMode=true', () => {
    render(<PasskeySignIn stepUpMode />);
    expect(screen.getByTestId('passkey-sign-in-btn')).toHaveTextContent('Verify with passkey');
  });

  it('calls signIn on button click and fires success callbacks', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    signInMock.mockResolvedValue(makeResult());

    render(<PasskeySignIn onSuccess={onSuccess} onMessage={onMessage} />);
    await user.click(screen.getByTestId('passkey-sign-in-btn'));

    await waitFor(() => expect(signInMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ user: { id: 'u1' } }));
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'passkey.signIn.success',
      message: defaultPasskeySignInMessages.successToast
    });
  });

  it('maps CHALLENGE_FAILED error, shows inline alert, and fires error callbacks', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    signInMock.mockRejectedValue(
      Object.assign(new Error('challenge failed'), { extensions: { code: 'CHALLENGE_FAILED' } })
    );

    render(<PasskeySignIn onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('passkey-sign-in-btn'));

    expect(
      await screen.findByText(defaultPasskeySignInMessages.errors.CHALLENGE_FAILED)
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultPasskeySignInMessages.errors.CHALLENGE_FAILED,
      code: 'CHALLENGE_FAILED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'CHALLENGE_FAILED',
      message: defaultPasskeySignInMessages.errors.CHALLENGE_FAILED
    });
  });

  it('treats USER_ABORTED silently (no inline alert) but still fires onError/onMessage', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const abortErr = Object.assign(new Error('NotAllowedError'), {
      extensions: { code: 'USER_ABORTED' }
    });
    signInMock.mockRejectedValue(abortErr);

    render(<PasskeySignIn onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('passkey-sign-in-btn'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    // MINOR-3: AuthErrorAlert renders role=alert in the DOM but sets aria-hidden=true
    // when there is no error (so getByRole won't find it). Use querySelector to reach
    // the element regardless of aria-hidden state and assert no error text is shown.
    // eslint-disable-next-line testing-library/no-container
    const { container } = { container: document.body };
    const alertEl = container.querySelector('[role="alert"]');
    expect(alertEl).toBeTruthy(); // always in DOM
    expect(alertEl).not.toHaveTextContent(defaultPasskeySignInMessages.errors.USER_ABORTED);
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'USER_ABORTED' })
    );
  });

  it('surfaces PROCEDURE_NOT_FOUND from the catalog when backend is pending', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    signInMock.mockRejectedValue(
      Object.assign(new Error('procedure not found'), { extensions: { code: 'PROCEDURE_NOT_FOUND' } })
    );

    render(<PasskeySignIn onError={onError} />);
    await user.click(screen.getByTestId('passkey-sign-in-btn'));

    expect(
      await screen.findByText(defaultPasskeySignInMessages.errors.PROCEDURE_NOT_FOUND)
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PROCEDURE_NOT_FOUND' })
    );
  });

  it('uses the onSubmit override instead of the utility hook', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(makeResult({ user: { id: 'override-user' } }));
    const onSuccess = vi.fn();

    render(<PasskeySignIn userId="test-uid" onSubmit={onSubmit} onSuccess={onSuccess} />);
    await user.click(screen.getByTestId('passkey-sign-in-btn'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ userId: 'test-uid' });
    expect(signInMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ user: { id: 'override-user' } }));
  });

  it('applies message overrides via deep merge', async () => {
    const user = userEvent.setup();
    signInMock.mockRejectedValue(
      Object.assign(new Error('challenge'), { extensions: { code: 'CHALLENGE_FAILED' } })
    );

    render(
      <PasskeySignIn
        onError={vi.fn()}
        messages={{ errors: { CHALLENGE_FAILED: 'Custom challenge message.' } }}
      />
    );
    await user.click(screen.getByTestId('passkey-sign-in-btn'));

    expect(await screen.findByText('Custom challenge message.')).toBeInTheDocument();
  });

  it('renders icon-only variant without text label', () => {
    render(<PasskeySignIn variant="icon" />);
    const btn = screen.getByTestId('passkey-sign-in-btn');
    // Icon-only: aria-label set, no visible text content
    expect(btn).toHaveAttribute('aria-label', defaultPasskeySignInMessages.signInButton);
    expect(btn).not.toHaveTextContent('Sign in with passkey');
  });

  it('shows loading state: button disabled and isPending propagated', async () => {
    // Simulate the hook returning isPending=true (e.g. while signIn resolves)
    mockHookReturn.isPending = true;
    render(<PasskeySignIn />);
    const btn = screen.getByTestId('passkey-sign-in-btn');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toHaveTextContent('Waiting for passkey…');
  });

  it('handles NO_CREDENTIALS error with correct message', async () => {
    const user = userEvent.setup();
    signInMock.mockRejectedValue(
      Object.assign(new Error('no credentials'), { extensions: { code: 'NO_CREDENTIALS' } })
    );

    render(<PasskeySignIn />);
    await user.click(screen.getByTestId('passkey-sign-in-btn'));

    expect(
      await screen.findByText(defaultPasskeySignInMessages.errors.NO_CREDENTIALS)
    ).toBeInTheDocument();
  });

  it('has correct data-slot and CSS classes on root element', () => {
    const { container } = render(<PasskeySignIn className="extra-class" />);
    const slot = container.querySelector('[data-slot="passkey-sign-in"]');
    expect(slot).toBeInTheDocument();
    expect(slot?.className).toContain('w-full');
    expect(slot?.className).toContain('max-w-sm');
    expect(slot?.className).toContain('mx-auto');
    expect(slot?.className).toContain('extra-class');
  });

  // ---------------------------------------------------------------------------
  // B4: Conditional UI path tests
  // ---------------------------------------------------------------------------

  it('B4-1: passes conditionalUI:true to hook when prop is set (no onSubmit, no userId)', () => {
    render(<PasskeySignIn conditionalUI />);
    expect(lastHookOptions?.conditionalUI).toBe(true);
  });

  it('B4-2: conditional UI success fires onSuccess and onMessage(success)', () => {
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    render(<PasskeySignIn conditionalUI onSuccess={onSuccess} onMessage={onMessage} />);

    // Simulate the hook calling onConditionalSuccess (the hook fires this when autofill completes)
    const result = makeResult();
    lastHookOptions?.onConditionalSuccess?.(result);

    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ user: { id: 'u1' } }));
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'passkey.signIn.success',
      message: defaultPasskeySignInMessages.successToast
    });
  });

  it('B4-3: conditional UI activation fires onMessage({ kind:"info", key:"conditional_ui_active" })', () => {
    const onMessage = vi.fn();
    render(<PasskeySignIn conditionalUI onMessage={onMessage} />);

    // Simulate the hook calling onConditionalActivated on mount
    lastHookOptions?.onConditionalActivated?.();

    expect(onMessage).toHaveBeenCalledWith({ kind: 'info', key: 'conditional_ui_active' });
  });

  it('B4-4: conditionalUI=true + onSubmit suppresses background hook ceremony', () => {
    const onSubmit = vi.fn().mockResolvedValue(makeResult());
    render(<PasskeySignIn conditionalUI onSubmit={onSubmit} />);

    // B3: effectiveConditionalUI must be false when onSubmitOverride is present
    expect(lastHookOptions?.conditionalUI).toBe(false);
  });

  it('B4-5: conditionalUI=true + userId suppresses background hook ceremony (mutual exclusion)', () => {
    // MINOR-2: spec says "When userId is provided, conditional UI should be false"
    render(<PasskeySignIn conditionalUI userId="user-123" />);
    expect(lastHookOptions?.conditionalUI).toBe(false);
  });
});
