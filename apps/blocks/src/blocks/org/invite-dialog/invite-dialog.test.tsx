import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Keep the block's content in the rendered tree for SSR/hydration assertions.
// The real Base UI shell portals only in the browser and is covered by UI tests.
vi.mock('@constructive-io/ui/dialog', async () => {
  const React = await import('react');
  const InlineDialog = ({ children }: { children?: ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const InlineContainer = ({ children }: { children?: ReactNode }) =>
    React.createElement('div', null, children);
  const InlineTitle = ({ children }: { children?: ReactNode }) =>
    React.createElement('h2', null, children);
  const InlineDescription = ({ children }: { children?: ReactNode }) =>
    React.createElement('p', null, children);

  return {
    Dialog: InlineDialog,
    DialogPopup: InlineContainer,
    DialogHeader: InlineContainer,
    DialogTitle: InlineTitle,
    DialogDescription: InlineDescription,
    DialogPanel: InlineContainer,
    DialogFooter: InlineContainer
  };
});

// Mock the generated admin SDK — never hit the real client.
// (sdk-binding-contract.md §3: tests mock `@/generated/<ns>`)
const { createMutateAsyncMock, updateMutateAsyncMock, queryDataMock } = vi.hoisted(() => ({
  createMutateAsyncMock: vi.fn(),
  updateMutateAsyncMock: vi.fn(),
  queryDataMock: vi.fn()
}));

vi.mock('@/generated/admin', () => ({
  useCreateOrgInviteMutation: () => ({
    mutateAsync: createMutateAsyncMock,
    isPending: false
  }),
  useUpdateOrgInviteMutation: () => ({
    mutateAsync: updateMutateAsyncMock,
    isPending: false
  }),
  useOrgInvitesQuery: () => ({
    data: queryDataMock(),
    isLoading: false,
    refetch: vi.fn().mockResolvedValue(undefined)
  })
}));

import { InviteDialog } from './invite-dialog';
import { defaultOrgInviteDialogMessages } from './messages';

const ORG_ID = 'org-uuid-001';

beforeEach(() => {
  createMutateAsyncMock.mockReset();
  updateMutateAsyncMock.mockReset();
  // Default: empty pending-invites list
  queryDataMock.mockReturnValue({ orgInvites: { nodes: [] } });
});

function makeInviteRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-001',
    email: 'test@example.com',
    entityId: ORG_ID,
    ...overrides
  };
}

function makePendingInvite(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-001',
    email: 'pending@example.com',
    inviteValid: true,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides
  };
}

async function fillAndSubmitEmail(
  user: ReturnType<typeof userEvent.setup>,
  email = 'invited@example.com'
) {
  const input = screen.getByTestId('invite-email');
  await user.clear(input);
  await user.type(input, email);
  await user.click(screen.getByTestId('invite-submit'));
}

describe('InviteDialog', () => {
  it('renders the dialog with email field and submit button', () => {
    render(<InviteDialog orgId={ORG_ID} open />);
    expect(screen.getByText(defaultOrgInviteDialogMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultOrgInviteDialogMessages.description)).toBeInTheDocument();
    expect(screen.getByTestId('invite-email')).toBeInTheDocument();
    expect(screen.getByTestId('invite-submit')).toHaveTextContent(defaultOrgInviteDialogMessages.submitButton);
  });

  it('shows empty pending invites message when there are no pending invites', () => {
    queryDataMock.mockReturnValue({ orgInvites: { nodes: [] } });
    render(<InviteDialog orgId={ORG_ID} open />);
    expect(screen.getByText(defaultOrgInviteDialogMessages.pendingInvitesEmpty)).toBeInTheDocument();
  });

  it('calls createOrgInviteMutation with correct args and fires onInviteSent + onMessage', async () => {
    const user = userEvent.setup();
    const onInviteSent = vi.fn();
    const onMessage = vi.fn();
    createMutateAsyncMock.mockResolvedValue({
      createOrgInvite: { orgInvite: makeInviteRecord({ email: 'invited@example.com' }) }
    });

    render(
      <InviteDialog
        orgId={ORG_ID}
        open
        onInviteSent={onInviteSent}
        onMessage={onMessage}
      />
    );

    await fillAndSubmitEmail(user, 'invited@example.com');

    await waitFor(() => expect(createMutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(createMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: ORG_ID,
        email: 'invited@example.com',
        inviteLimit: 1
      })
    );
    await waitFor(() => expect(onInviteSent).toHaveBeenCalledTimes(1));
    expect(onInviteSent).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'invited@example.com' })
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'createOrgInvite.success' })
    );
  });

  it('maps a server error code to the messages catalog and fires onError + onMessage', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    createMutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('pg: already a member'), { extensions: { code: 'ALREADY_MEMBER' } })
    );

    render(
      <InviteDialog
        orgId={ORG_ID}
        open
        onError={onError}
        onMessage={onMessage}
        messages={{ errors: { ALREADY_MEMBER: 'Already a member override.' } }}
      />
    );

    await fillAndSubmitEmail(user);

    expect(await screen.findByText('Already a member override.')).toBeInTheDocument();
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Already a member override.', code: 'ALREADY_MEMBER' })
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'ALREADY_MEMBER' })
    );
  });

  it('shows inline validation error for invalid email and does not call mutation', async () => {
    const user = userEvent.setup();
    render(<InviteDialog orgId={ORG_ID} open />);

    await fillAndSubmitEmail(user, 'not-an-email');

    expect(await screen.findByText(defaultOrgInviteDialogMessages.errors.INVALID_EMAIL)).toBeInTheDocument();
    expect(createMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('uses the onSubmit override instead of the generated hook', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({
      inviteId: 'override-inv',
      email: 'override@example.com',
      profileId: null
    });
    const onInviteSent = vi.fn();

    render(
      <InviteDialog
        orgId={ORG_ID}
        open
        onSubmit={onSubmit}
        onInviteSent={onInviteSent}
      />
    );

    await fillAndSubmitEmail(user, 'override@example.com');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'override@example.com',
        expiryDays: 7,
        inviteLimit: 1
      })
    );
    expect(createMutateAsyncMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onInviteSent).toHaveBeenCalledTimes(1));
  });

  it('renders pending invites list when there are pending invites', () => {
    queryDataMock.mockReturnValue({
      orgInvites: { nodes: [makePendingInvite()] }
    });
    render(<InviteDialog orgId={ORG_ID} open />);
    expect(screen.getByText('pending@example.com')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByLabelText('Resend invitation to pending@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel invitation to pending@example.com')).toBeInTheDocument();
  });

  it('hydrates with the expiry fallback before committing the client clock', async () => {
    const serverTime = Date.parse('2026-01-01T00:00:00.000Z');
    const clientTime = Date.parse('2026-01-02T00:00:00.000Z');
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(serverTime);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    queryDataMock.mockReturnValue({
      orgInvites: {
        nodes: [makePendingInvite({ expiresAt: '2026-01-03T12:00:00.000Z' })]
      }
    });

    const serverMarkup = renderToString(<InviteDialog orgId={ORG_ID} open expiryDays={7} />);
    const container = document.createElement('div');
    container.innerHTML = serverMarkup;
    document.body.appendChild(container);
    const recoverableErrors: unknown[] = [];
    let root: Root | undefined;

    try {
      expect(container).toHaveTextContent('Expires in 7 days');
      nowSpy.mockReturnValue(clientTime);

      await act(async () => {
        root = hydrateRoot(container, <InviteDialog orgId={ORG_ID} open expiryDays={7} />, {
          onRecoverableError: (error) => recoverableErrors.push(error)
        });
      });

      expect(recoverableErrors).toEqual([]);
      expect(consoleErrorSpy.mock.calls.flat().join(' ')).not.toMatch(
        /hydration|server rendered html|didn't match/i
      );
      expect(container).toHaveTextContent('Expires in 2 days');
    } finally {
      if (root) await act(async () => root?.unmount());
      container.remove();
      consoleErrorSpy.mockRestore();
      nowSpy.mockRestore();
    }
  });

  it('rounds expiry days from one committed mount-time reading', async () => {
    const mountedAt = Date.parse('2026-04-01T00:00:00.000Z');
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(mountedAt);
    queryDataMock.mockReturnValue({
      orgInvites: {
        nodes: [makePendingInvite({ expiresAt: '2026-04-02T11:45:36.000Z' })]
      }
    });

    try {
      render(<InviteDialog orgId={ORG_ID} open expiryDays={9} />);
      await waitFor(() => expect(screen.getByText('Expires in 1 days')).toBeInTheDocument());
      expect(screen.queryByText('Expires in 9 days')).not.toBeInTheDocument();
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('uses expiryDays when a pending invite has no expiry timestamp', async () => {
    queryDataMock.mockReturnValue({
      orgInvites: { nodes: [makePendingInvite({ expiresAt: null })] }
    });

    render(<InviteDialog orgId={ORG_ID} open expiryDays={11} />);

    await waitFor(() => expect(screen.getByText('Expires in 11 days')).toBeInTheDocument());
  });

  it('takes no repeating clock interval after mount', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    queryDataMock.mockReturnValue({
      orgInvites: { nodes: [makePendingInvite()] }
    });

    try {
      render(<InviteDialog orgId={ORG_ID} open />);
      expect(setIntervalSpy).not.toHaveBeenCalled();
    } finally {
      setIntervalSpy.mockRestore();
    }
  });

  it('cancel confirm dialog shows and calls updateOrgInviteMutation on confirm', async () => {
    const user = userEvent.setup();
    queryDataMock.mockReturnValue({
      orgInvites: { nodes: [makePendingInvite({ id: 'inv-cancel', email: 'cancel@example.com' })] }
    });
    updateMutateAsyncMock.mockResolvedValue({
      updateOrgInvite: { orgInvite: { id: 'inv-cancel', inviteValid: false } }
    });
    const onMessage = vi.fn();

    render(<InviteDialog orgId={ORG_ID} open onMessage={onMessage} />);

    // Click the "Cancel" button (aria-label) on the invite row to open confirm dialog
    const cancelBtn = screen.getByLabelText('Cancel invitation to cancel@example.com');
    await user.click(cancelBtn);

    // Wait for the confirm title to appear in the DOM (it may be in portal)
    await waitFor(() => {
      // The confirm dialog title text should appear somewhere in the document
      const allText = document.body.textContent ?? '';
      expect(allText).toContain(defaultOrgInviteDialogMessages.cancelInviteConfirmTitle);
    });

    // Find and click the confirm button by its role
    const confirmBtn = await screen.findByRole('button', {
      name: defaultOrgInviteDialogMessages.cancelInviteConfirmButton
    });
    await user.click(confirmBtn);

    await waitFor(() => expect(updateMutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(updateMutateAsyncMock).toHaveBeenCalledWith({
      id: 'inv-cancel',
      orgInvitePatch: { inviteValid: false }
    });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'cancelOrgInvite.success' })
    );
  });

  it('handles PROCEDURE_NOT_FOUND error gracefully', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();
    createMutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('procedure not found'), { extensions: { code: 'PROCEDURE_NOT_FOUND' } })
    );

    render(<InviteDialog orgId={ORG_ID} open onMessage={onMessage} />);

    await fillAndSubmitEmail(user);

    expect(
      await screen.findByText(defaultOrgInviteDialogMessages.errors.PROCEDURE_NOT_FOUND)
    ).toBeInTheDocument();
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'PROCEDURE_NOT_FOUND' })
    );
  });

  it('fires onMessage with kind: warning for INVITE_EXISTS error', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();
    const onError = vi.fn();
    createMutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('invite already exists'), { extensions: { code: 'INVITE_EXISTS' } })
    );

    render(<InviteDialog orgId={ORG_ID} open onMessage={onMessage} onError={onError} />);

    await fillAndSubmitEmail(user);

    expect(
      await screen.findByText(defaultOrgInviteDialogMessages.errors.INVITE_EXISTS)
    ).toBeInTheDocument();
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'warning', key: 'INVITE_EXISTS' })
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVITE_EXISTS' })
    );
  });

  it('resend: calls updateInvite + createInvite and fires resendOrgInvite.success', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();
    queryDataMock.mockReturnValue({
      orgInvites: { nodes: [makePendingInvite({ id: 'inv-resend', email: 'resend@example.com' })] }
    });
    updateMutateAsyncMock.mockResolvedValue({
      updateOrgInvite: { orgInvite: { id: 'inv-resend', inviteValid: false } }
    });
    createMutateAsyncMock.mockResolvedValue({
      createOrgInvite: { orgInvite: makeInviteRecord({ id: 'inv-new', email: 'resend@example.com' }) }
    });

    render(<InviteDialog orgId={ORG_ID} open onMessage={onMessage} />);

    const resendBtn = screen.getByLabelText('Resend invitation to resend@example.com');
    await user.click(resendBtn);

    await waitFor(() => expect(updateMutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(updateMutateAsyncMock).toHaveBeenCalledWith({
      id: 'inv-resend',
      orgInvitePatch: { inviteValid: false }
    });
    await waitFor(() => expect(createMutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(createMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: ORG_ID, email: 'resend@example.com' })
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'resendOrgInvite.success' })
    );
  });
});
