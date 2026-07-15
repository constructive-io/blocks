/**
 * scim-token-generation-card tests
 *
 * STUB block — no generated hook to mock. Tests cover:
 *   1. Deferred state (no onSubmit override — backend not shipped)
 *   2. Interactive state (onSubmit override provided)
 *   3. Happy path: onSubmit resolves → token shown + callbacks fire
 *   4. Error path: onSubmit rejects → error rendered + callbacks fire
 *   5. Revoke confirmation UI
 *   6. Copy button interaction
 *
 * No vi.mock('@/generated/admin') needed — this block imports none.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OrgScimTokenGenerationCard } from './scim-token-generation-card';
import { defaultOrgScimTokenGenerationCardMessages } from './messages';

const ORG_ID = 'org-uuid-123';

function makeToken(overrides: Partial<{ token: string; expiresAt: string | null }> = {}) {
  return {
    token: 'scim-bearer-secret-xyz',
    expiresAt: null,
    ...overrides
  };
}

beforeEach(() => {
  // jsdom does not implement the clipboard API; provide a no-op stub so
  // handleCopy doesn't throw. The spy is set up per-test to track calls.
  if (!navigator.clipboard) {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true
    });
  }
});

describe('OrgScimTokenGenerationCard', () => {
  it('renders in deferred state when no onSubmit is provided', () => {
    render(<OrgScimTokenGenerationCard orgId={ORG_ID} />);
    expect(screen.getByText(defaultOrgScimTokenGenerationCardMessages.deferredTitle)).toBeInTheDocument();
    expect(
      screen.getByText(defaultOrgScimTokenGenerationCardMessages.deferredDescription)
    ).toBeInTheDocument();
    // Action buttons must NOT appear in deferred state
    expect(screen.queryByTestId('scim-generate')).not.toBeInTheDocument();
    expect(screen.queryByTestId('scim-revoke')).not.toBeInTheDocument();
  });

  it('shows title and description in both states', () => {
    const { rerender } = render(<OrgScimTokenGenerationCard orgId={ORG_ID} />);
    expect(screen.getByText(defaultOrgScimTokenGenerationCardMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultOrgScimTokenGenerationCardMessages.description)).toBeInTheDocument();

    rerender(
      <OrgScimTokenGenerationCard
        orgId={ORG_ID}
        onSubmit={vi.fn().mockResolvedValue(makeToken())}
      />
    );
    expect(screen.getByText(defaultOrgScimTokenGenerationCardMessages.title)).toBeInTheDocument();
  });

  it('renders action buttons when onSubmit is provided', () => {
    render(
      <OrgScimTokenGenerationCard
        orgId={ORG_ID}
        onSubmit={vi.fn().mockResolvedValue(makeToken())}
      />
    );
    expect(screen.getByTestId('scim-generate')).toBeInTheDocument();
    expect(screen.getByTestId('scim-revoke')).toBeInTheDocument();
    // Deferred notice must NOT appear
    expect(
      screen.queryByText(defaultOrgScimTokenGenerationCardMessages.deferredTitle)
    ).not.toBeInTheDocument();
  });

  it('calls onSubmit with orgId and shows token on success, fires callbacks', async () => {
    const user = userEvent.setup();
    const token = makeToken({ token: 'my-secret-token' });
    const onSubmit = vi.fn().mockResolvedValue(token);
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    render(
      <OrgScimTokenGenerationCard
        orgId={ORG_ID}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByTestId('scim-generate'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(ORG_ID));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(token));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'scimToken.generated' })
    );

    // Token input shown
    const tokenInput = screen.getByRole('textbox', { name: /scim bearer token/i });
    expect(tokenInput).toHaveValue('my-secret-token');

    // "shown once" warning visible
    expect(
      screen.getByText(defaultOrgScimTokenGenerationCardMessages.tokenShownOnceWarning)
    ).toBeInTheDocument();
  });

  it('shows error and fires onError/onMessage when onSubmit rejects', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('procedure not found'), {
        extensions: { code: 'PROCEDURE_NOT_FOUND' }
      })
    );

    render(
      <OrgScimTokenGenerationCard
        orgId={ORG_ID}
        onSubmit={onSubmit}
        onError={onError}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByTestId('scim-generate'));

    await waitFor(() =>
      expect(
        screen.getByText(
          defaultOrgScimTokenGenerationCardMessages.errors.PROCEDURE_NOT_FOUND
        )
      ).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledWith({
      message: defaultOrgScimTokenGenerationCardMessages.errors.PROCEDURE_NOT_FOUND,
      code: 'PROCEDURE_NOT_FOUND'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'PROCEDURE_NOT_FOUND',
      message: defaultOrgScimTokenGenerationCardMessages.errors.PROCEDURE_NOT_FOUND
    });
  });

  it('respects messages override for errors', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('fail'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    render(
      <OrgScimTokenGenerationCard
        orgId={ORG_ID}
        onSubmit={onSubmit}
        messages={{ errors: { UNKNOWN_ERROR: 'Custom error text.' } }}
      />
    );

    await user.click(screen.getByTestId('scim-generate'));
    expect(await screen.findByText('Custom error text.')).toBeInTheDocument();
  });

  it('shows revoke confirmation when revoke button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <OrgScimTokenGenerationCard
        orgId={ORG_ID}
        onSubmit={vi.fn().mockResolvedValue(makeToken())}
      />
    );

    await user.click(screen.getByTestId('scim-revoke'));

    expect(
      screen.getByText(defaultOrgScimTokenGenerationCardMessages.revokeConfirmTitle)
    ).toBeInTheDocument();
    expect(screen.getByTestId('scim-revoke-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('scim-revoke-cancel')).toBeInTheDocument();
  });

  it('dismisses revoke confirmation when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <OrgScimTokenGenerationCard
        orgId={ORG_ID}
        onSubmit={vi.fn().mockResolvedValue(makeToken())}
      />
    );

    await user.click(screen.getByTestId('scim-revoke'));
    expect(screen.getByTestId('scim-revoke-confirm')).toBeInTheDocument();

    await user.click(screen.getByTestId('scim-revoke-cancel'));
    expect(screen.queryByTestId('scim-revoke-confirm')).not.toBeInTheDocument();
  });

  it('fires onMessage warning when revoke is confirmed', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();
    render(
      <OrgScimTokenGenerationCard
        orgId={ORG_ID}
        onSubmit={vi.fn().mockResolvedValue(makeToken())}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByTestId('scim-revoke'));
    await user.click(screen.getByTestId('scim-revoke-confirm'));

    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'warning', key: 'scimToken.revoked' })
    );
  });

  it('shows "Copied!" feedback when copy button is clicked', async () => {
    const user = userEvent.setup();
    const token = makeToken({ token: 'clipboard-token' });
    const onSuccess = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(token);

    // Spy on clipboard.writeText if available; jsdom may not expose it.
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    render(<OrgScimTokenGenerationCard orgId={ORG_ID} onSubmit={onSubmit} onSuccess={onSuccess} />);

    await user.click(screen.getByTestId('scim-generate'));
    // Wait for the mutation to resolve
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    // Verify the token input renders the correct value
    expect(screen.getByRole('textbox', { name: /scim bearer token/i })).toHaveValue('clipboard-token');

    await user.click(screen.getByTestId('scim-copy'));
    // The copy button should switch to "Copied!" label after clicking
    expect(await screen.findByText(defaultOrgScimTokenGenerationCardMessages.copiedLabel)).toBeInTheDocument();
    writeTextSpy.mockRestore();
  });
});
