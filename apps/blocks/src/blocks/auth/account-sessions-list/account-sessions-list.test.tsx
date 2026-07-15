import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated auth SDK — never hit a real client.
// sdk-binding-contract.md: tests mock `@/generated/<ns>`.
const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
vi.mock('@/generated/auth', () => ({
  useRevokeSessionMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
}));

// Mock the use-step-up hook so tests control step-up resolve/reject.
// The StepUpError class is hoisted so tests can throw real instances of it
// that pass the `instanceof StepUpError` check in the component.
const { stepUpMock, MockStepUpError } = vi.hoisted(() => {
  class MockStepUpError extends Error {
    reason: 'cancelled' | 'error';
    constructor(reason: 'cancelled' | 'error') {
      super(reason === 'cancelled' ? 'Step-up cancelled.' : 'Step-up failed.');
      this.name = 'StepUpError';
      this.reason = reason;
    }
  }
  return { stepUpMock: vi.fn(), MockStepUpError };
});
vi.mock('@/blocks/auth/use-step-up/use-step-up', () => ({
  useStepUp: () => stepUpMock,
  StepUpError: MockStepUpError
}));

import { AccountSessionsList } from './account-sessions-list';
import { defaultAccountSessionsListMessages } from './messages';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<import('./account-sessions-list').SessionRow> = {}) {
  return {
    id: 'sess-1',
    isCurrent: false,
    authMethod: 'password' as const,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0',
    parsedDevice: { browser: 'Chrome', os: 'macOS', deviceType: 'desktop' as const },
    ip: '127.0.0.1',
    origin: null,
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    ...overrides
  };
}

function makeCurrentSession() {
  return makeSession({ id: 'sess-current', isCurrent: true });
}

beforeEach(() => {
  mutateAsyncMock.mockReset();
  stepUpMock.mockReset();
  // Default: step-up resolves (passes) unless overridden per-test.
  stepUpMock.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AccountSessionsList', () => {
  it('renders the card title and description', () => {
    render(<AccountSessionsList />);
    expect(screen.getByText(defaultAccountSessionsListMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSessionsListMessages.description)).toBeInTheDocument();
  });

  it('renders the empty state when no sessions are provided', () => {
    render(<AccountSessionsList sessions={[]} />);
    expect(screen.getByText(defaultAccountSessionsListMessages.noSessionsDescription)).toBeInTheDocument();
  });

  it('renders session rows with device label and metadata', () => {
    const session = makeSession({ ip: '10.0.0.1' });
    render(<AccountSessionsList sessions={[session]} />);
    expect(screen.getByText(/Chrome on macOS/)).toBeInTheDocument();
    expect(screen.getByText(/10\.0\.0\.1/)).toBeInTheDocument();
  });

  it('marks current session with badge and disables its revoke button', () => {
    const sessions = [makeCurrentSession(), makeSession({ id: 'sess-other' })];
    render(<AccountSessionsList sessions={sessions} />);
    // Badge text appears both in the visible badge and the sr-only note — use getAllByText.
    expect(screen.getAllByText(defaultAccountSessionsListMessages.currentSessionBadge).length).toBeGreaterThan(0);

    // The current session row's revoke button must be disabled.
    const revokeButtons = screen.getAllByRole('button', {
      name: defaultAccountSessionsListMessages.revokeButton
    });
    // There are two sessions; the one for current should be disabled.
    expect(revokeButtons.some((btn) => btn.hasAttribute('disabled'))).toBe(true);
  });

  it('shows "Revoke all other sessions" button only when non-current sessions exist', () => {
    render(<AccountSessionsList sessions={[makeCurrentSession()]} />);
    expect(screen.queryByTestId('revoke-all-button')).toBeNull();

    render(<AccountSessionsList sessions={[makeCurrentSession(), makeSession()]} />);
    expect(screen.getByTestId('revoke-all-button')).toBeInTheDocument();
  });

  it('calls the generated revokeSession mutation with { input: { sessionId } } after step-up passes', async () => {
    const user = userEvent.setup();
    const onSessionRevoked = vi.fn();
    const onMessage = vi.fn();

    mutateAsyncMock.mockResolvedValue({ revokeSession: { result: true } });
    stepUpMock.mockResolvedValue(undefined);

    const session = makeSession();
    render(<AccountSessionsList sessions={[session]} onSessionRevoked={onSessionRevoked} onMessage={onMessage} />);

    // Click Revoke to open confirm dialog.
    await user.click(screen.getByRole('button', { name: defaultAccountSessionsListMessages.revokeButton }));
    // Confirm
    await user.click(screen.getByTestId('revoke-confirm-button'));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({ input: { sessionId: 'sess-1' } });
    expect(onSessionRevoked).toHaveBeenCalledWith('sess-1');
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'revokeSession.success' })
    );
    // step-up was called with medium tier
    expect(stepUpMock).toHaveBeenCalledWith({ tier: 'medium' });
  });

  it('does NOT call the mutation when step-up is cancelled for single revoke', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();

    // Throw the hoisted MockStepUpError so `instanceof StepUpError` passes in the component.
    stepUpMock.mockRejectedValue(new MockStepUpError('cancelled'));

    const session = makeSession();
    render(<AccountSessionsList sessions={[session]} onMessage={onMessage} />);

    await user.click(screen.getByRole('button', { name: defaultAccountSessionsListMessages.revokeButton }));
    await user.click(screen.getByTestId('revoke-confirm-button'));

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'warning', key: 'STEP_UP_CANCELLED' })
    );
  });

  it('does NOT call the mutation when step-up is cancelled for revoke-all-others', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();

    stepUpMock.mockRejectedValue(new MockStepUpError('cancelled'));

    const sessions = [makeCurrentSession(), makeSession()];
    render(<AccountSessionsList sessions={sessions} onMessage={onMessage} />);

    await user.click(screen.getByTestId('revoke-all-button'));
    await user.click(screen.getByTestId('revoke-all-confirm-button'));

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'warning', key: 'STEP_UP_CANCELLED' })
    );
    // step-up was called with high tier for revoke-all
    expect(stepUpMock).toHaveBeenCalledWith({ tier: 'high' });
  });

  it('uses the onRevokeSubmit override instead of the generated hook', async () => {
    const user = userEvent.setup();
    const onRevokeSubmit = vi.fn().mockResolvedValue({ result: true });
    const onSessionRevoked = vi.fn();

    const session = makeSession();
    render(
      <AccountSessionsList
        sessions={[session]}
        onRevokeSubmit={onRevokeSubmit}
        onSessionRevoked={onSessionRevoked}
      />
    );

    await user.click(screen.getByRole('button', { name: defaultAccountSessionsListMessages.revokeButton }));
    await user.click(screen.getByTestId('revoke-confirm-button'));

    await waitFor(() => expect(onRevokeSubmit).toHaveBeenCalledTimes(1));
    expect(onRevokeSubmit).toHaveBeenCalledWith({ sessionId: 'sess-1' });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onSessionRevoked).toHaveBeenCalledWith('sess-1');
  });

  it('maps a coded server error and fires onError + onMessage', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('Internal error'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    const session = makeSession();
    render(<AccountSessionsList sessions={[session]} onError={onError} onMessage={onMessage} />);

    await user.click(screen.getByRole('button', { name: defaultAccountSessionsListMessages.revokeButton }));
    await user.click(screen.getByTestId('revoke-confirm-button'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({ message: expect.any(String), code: 'UNKNOWN_ERROR' });
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error', key: 'UNKNOWN_ERROR' }));
  });

  it('applies message overrides via deep merge', () => {
    render(
      <AccountSessionsList
        messages={{ title: 'My Custom Title', errors: { UNKNOWN_ERROR: 'Oops.' } }}
      />
    );
    expect(screen.getByText('My Custom Title')).toBeInTheDocument();
    // Default description still present (not overridden)
    expect(screen.getByText(defaultAccountSessionsListMessages.description)).toBeInTheDocument();
  });

  it('shows unknownLocation when session ip is null', () => {
    const session = makeSession({ ip: null });
    render(<AccountSessionsList sessions={[session]} />);
    expect(screen.getByText(defaultAccountSessionsListMessages.unknownLocation)).toBeInTheDocument();
  });

  it('calls all other sessions revoked after bulk revoke completes', async () => {
    const user = userEvent.setup();
    const onAllOtherSessionsRevoked = vi.fn();
    const onMessage = vi.fn();

    mutateAsyncMock.mockResolvedValue({ revokeSession: { result: true } });

    const sessions = [makeCurrentSession(), makeSession({ id: 's2' }), makeSession({ id: 's3' })];
    render(
      <AccountSessionsList
        sessions={sessions}
        onAllOtherSessionsRevoked={onAllOtherSessionsRevoked}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByTestId('revoke-all-button'));
    await user.click(screen.getByTestId('revoke-all-confirm-button'));

    await waitFor(() => expect(onAllOtherSessionsRevoked).toHaveBeenCalledTimes(1));
    // Both non-current sessions revoked
    expect(mutateAsyncMock).toHaveBeenCalledTimes(2);
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'revokeAllOthers.success' })
    );
  });
});
