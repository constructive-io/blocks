import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// BACKEND-PENDING (Case b): useAnonymousSignInMutation does NOT exist in the
// generated auth SDK yet (anonymous_sign_in proc not deployed). The component
// does not import @/generated/auth, so no module mock is needed for the default
// path. When the proc ships and the component is updated, add:
//
//   const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
//   vi.mock('@/generated/auth', () => ({
//     useAnonymousSignInMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
//   }));
//
// Per sdk-binding-contract.md: tests NEVER hit a real client.

import { AnonymousSignInButton } from './anonymous-sign-in-button';
import { defaultAnonymousSignInButtonMessages } from './messages';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 's1',
    userId: 'anon-u1',
    accessToken: 'anon-jwt',
    accessTokenExpiresAt: '2099-01-01T00:00:00Z',
    isAnonymous: true as const,
    ...overrides
  };
}

describe('AnonymousSignInButton', () => {
  it('renders with default button text', () => {
    render(<AnonymousSignInButton />);
    expect(screen.getByTestId('anonymous-sign-in-button')).toHaveTextContent(
      defaultAnonymousSignInButtonMessages.buttonText
    );
  });

  it('renders custom children as button text', () => {
    render(<AnonymousSignInButton>Try it free</AnonymousSignInButton>);
    expect(screen.getByTestId('anonymous-sign-in-button')).toHaveTextContent('Try it free');
  });

  // BACKEND-PENDING (Case b): without onSubmit override AND without the
  // generated hook, clicking fires PROCEDURE_NOT_FOUND. This is the graceful
  // degradation path until the backend proc ships.
  it('fires PROCEDURE_NOT_FOUND when no onSubmit override is provided (backend pending)', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(<AnonymousSignInButton onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('anonymous-sign-in-button'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({
      message: defaultAnonymousSignInButtonMessages.errors.PROCEDURE_NOT_FOUND,
      code: 'PROCEDURE_NOT_FOUND'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'PROCEDURE_NOT_FOUND',
      message: defaultAnonymousSignInButtonMessages.errors.PROCEDURE_NOT_FOUND
    });

    // Inline error alert should appear
    expect(
      await screen.findByText(defaultAnonymousSignInButtonMessages.errors.PROCEDURE_NOT_FOUND)
    ).toBeInTheDocument();
  });

  it('PROCEDURE_NOT_FOUND message is overridable via messages prop', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const customMsg = 'Coming soon — backend not yet deployed.';

    render(
      <AnonymousSignInButton
        onError={onError}
        messages={{ errors: { PROCEDURE_NOT_FOUND: customMsg } }}
      />
    );
    await user.click(screen.getByTestId('anonymous-sign-in-button'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({ message: customMsg, code: 'PROCEDURE_NOT_FOUND' });
    expect(await screen.findByText(customMsg)).toBeInTheDocument();
  });

  it('uses the onSubmit override and fires onSuccess', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(makeResult());
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    render(<AnonymousSignInButton onSubmit={onSubmit} onSuccess={onSuccess} onMessage={onMessage} />);
    await user.click(screen.getByTestId('anonymous-sign-in-button'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ userId: 'anon-u1', isAnonymous: true }));
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'anonymousSignIn.success',
      message: defaultAnonymousSignInButtonMessages.successMessage
    });
  });

  it('maps a coded server error via the onSubmit path', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('anonymous sessions disabled'), { extensions: { code: 'ANONYMOUS_DISABLED' } })
      );

    render(<AnonymousSignInButton onSubmit={onSubmit} onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('anonymous-sign-in-button'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({
      message: defaultAnonymousSignInButtonMessages.errors.ANONYMOUS_DISABLED,
      code: 'ANONYMOUS_DISABLED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'ANONYMOUS_DISABLED',
      message: defaultAnonymousSignInButtonMessages.errors.ANONYMOUS_DISABLED
    });
    expect(
      await screen.findByText(defaultAnonymousSignInButtonMessages.errors.ANONYMOUS_DISABLED)
    ).toBeInTheDocument();
  });

  it('applies a messages override to an error code via onSubmit path', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const customMsg = 'Rate limit hit — please wait a moment.';
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('rate limited'), { extensions: { code: 'RATE_LIMITED' } })
      );

    render(
      <AnonymousSignInButton
        onSubmit={onSubmit}
        onError={onError}
        messages={{ errors: { RATE_LIMITED: customMsg } }}
      />
    );
    await user.click(screen.getByTestId('anonymous-sign-in-button'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({ message: customMsg, code: 'RATE_LIMITED' });
    expect(await screen.findByText(customMsg)).toBeInTheDocument();
  });

  it('shows pending state while onSubmit is in flight', async () => {
    const user = userEvent.setup();
    let resolve!: (r: ReturnType<typeof makeResult>) => void;
    const pendingPromise = new Promise<ReturnType<typeof makeResult>>((res) => {
      resolve = res;
    });
    const onSubmit = vi.fn().mockReturnValue(pendingPromise);

    render(<AnonymousSignInButton onSubmit={onSubmit} />);
    await user.click(screen.getByTestId('anonymous-sign-in-button'));

    // While pending the button should be disabled
    await waitFor(() =>
      expect(screen.getByTestId('anonymous-sign-in-button')).toBeDisabled()
    );

    // Resolve the promise to unblock
    resolve(makeResult());
    await waitFor(() =>
      expect(screen.getByTestId('anonymous-sign-in-button')).not.toBeDisabled()
    );
  });
});
