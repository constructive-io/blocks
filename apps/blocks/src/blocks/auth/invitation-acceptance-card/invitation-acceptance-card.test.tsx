import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The data path is the GENERATED hook — mock the module so no real client is
// touched (sdk-binding-contract.md: tests mock `@/generated/<ns>`). Both hooks
// are replaced with stubs returning our controllable mutateAsync.
const { submitAppMock, submitOrgMock } = vi.hoisted(() => ({
  submitAppMock: vi.fn(),
  submitOrgMock: vi.fn()
}));

vi.mock('@/generated/admin', () => ({
  useSubmitAppInviteCodeMutation: () => ({ mutateAsync: submitAppMock, isPending: false }),
  useSubmitOrgInviteCodeMutation: () => ({ mutateAsync: submitOrgMock, isPending: false })
}));

import { InvitationAcceptanceCard } from './invitation-acceptance-card';
import { defaultInvitationAcceptanceMessages } from './messages';

const ORG_USER = {
  id: 'org-1',
  type: 'organization' as const,
  displayName: 'Acme Corp',
  username: 'acme',
  profilePicture: null
};

const INVITER_USER = {
  id: 'inviter-1',
  type: 'person' as const,
  displayName: 'Alice Smith',
  username: 'alice',
  profilePicture: null
};

beforeEach(() => {
  submitAppMock.mockReset();
  submitOrgMock.mockReset();
});

describe('InvitationAcceptanceCard — app invite', () => {
  it('renders app invite title and accept/decline buttons', () => {
    render(<InvitationAcceptanceCard token="tok123" kind="app" />);
    // appInviteTitle: "You've been invited" — may render with smart apostrophe
    expect(screen.getByText(/been invited/)).toBeInTheDocument();
    expect(screen.getByTestId('accept-invite-submit')).toBeInTheDocument();
    expect(screen.getByTestId('decline-invite-button')).toBeInTheDocument();
  });

  it('calls submitAppInviteCode with { input: { token } } on accept', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    submitAppMock.mockResolvedValue({ submitAppInviteCode: { result: true } });

    render(<InvitationAcceptanceCard token="tok123" kind="app" onSuccess={onSuccess} onMessage={onMessage} />);
    await user.click(screen.getByTestId('accept-invite-submit'));

    await waitFor(() => expect(submitAppMock).toHaveBeenCalledTimes(1));
    expect(submitAppMock).toHaveBeenCalledWith({ input: { token: 'tok123' } });
    expect(submitOrgMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ kind: 'app' }));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'inviteAccepted.app' })
    );
  });

  it('shows success screen after app invite acceptance', async () => {
    const user = userEvent.setup();
    submitAppMock.mockResolvedValue({ submitAppInviteCode: { result: true } });

    render(<InvitationAcceptanceCard token="tok123" kind="app" />);
    await user.click(screen.getByTestId('accept-invite-submit'));

    // appSuccessTitle: 'Welcome aboard!'
    expect(await screen.findByText(/Welcome aboard/)).toBeInTheDocument();
  });

  it('fires onDecline when Decline is clicked', async () => {
    const user = userEvent.setup();
    const onDecline = vi.fn();

    render(<InvitationAcceptanceCard token="tok123" kind="app" onDecline={onDecline} />);
    await user.click(screen.getByTestId('decline-invite-button'));

    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(submitAppMock).not.toHaveBeenCalled();
  });

  it('maps a GraphQL error code and shows it inline', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    submitAppMock.mockRejectedValue(
      Object.assign(new Error('invite gone'), { extensions: { code: 'INVITE_NOT_FOUND' } })
    );

    render(<InvitationAcceptanceCard token="tok123" kind="app" onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('accept-invite-submit'));

    expect(
      await screen.findByText(defaultInvitationAcceptanceMessages.errors.INVITE_NOT_FOUND)
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultInvitationAcceptanceMessages.errors.INVITE_NOT_FOUND,
      code: 'INVITE_NOT_FOUND'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'INVITE_NOT_FOUND',
      message: defaultInvitationAcceptanceMessages.errors.INVITE_NOT_FOUND
    });
  });

  it('applies message overrides for a specific error code', async () => {
    const user = userEvent.setup();
    submitAppMock.mockRejectedValue(
      Object.assign(new Error('limit'), { extensions: { code: 'INVITE_LIMIT' } })
    );

    render(
      <InvitationAcceptanceCard
        token="tok123"
        kind="app"
        messages={{ errors: { INVITE_LIMIT: 'Custom limit message.' } }}
      />
    );
    await user.click(screen.getByTestId('accept-invite-submit'));

    expect(await screen.findByText('Custom limit message.')).toBeInTheDocument();
  });

  it('uses onSubmit override instead of the generated hook', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ kind: 'app' });
    const onSuccess = vi.fn();

    render(<InvitationAcceptanceCard token="tok456" kind="app" onSubmit={onSubmit} onSuccess={onSuccess} />);
    await user.click(screen.getByTestId('accept-invite-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ token: 'tok456', kind: 'app' });
    expect(submitAppMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ kind: 'app' }));
  });

  it('does not show success screen when server returns result:false', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    submitAppMock.mockResolvedValue({ submitAppInviteCode: { result: false } });

    render(<InvitationAcceptanceCard token="tok123" kind="app" onSuccess={onSuccess} onMessage={onMessage} />);
    await user.click(screen.getByTestId('accept-invite-submit'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    // Success screen ('Welcome aboard!') must NOT appear
    expect(screen.queryByText(/Welcome aboard/)).not.toBeInTheDocument();
    // Pending screen must appear
    expect(screen.getByText('Request submitted')).toBeInTheDocument();
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'info', key: 'INVITE_PENDING_APPROVAL' })
    );
  });

  it('does not show success screen when server returns null payload', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    submitAppMock.mockResolvedValue({ submitAppInviteCode: null });

    render(<InvitationAcceptanceCard token="tok123" kind="app" onSuccess={onSuccess} />);
    await user.click(screen.getByTestId('accept-invite-submit'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Welcome aboard/)).not.toBeInTheDocument();
    expect(screen.getByText('Request submitted')).toBeInTheDocument();
  });
});

describe('InvitationAcceptanceCard — org invite', () => {
  it('renders org invite title with org name interpolated', () => {
    render(
      <InvitationAcceptanceCard
        token="org-tok"
        kind="org"
        org={ORG_USER}
        inviter={INVITER_USER}
      />
    );
    // The title template {{orgName}} is interpolated at render time.
    expect(screen.getByText(/been invited to Acme Corp/)).toBeInTheDocument();
  });

  it('displays inviter and org avatars', () => {
    render(
      <InvitationAcceptanceCard
        token="org-tok"
        kind="org"
        org={ORG_USER}
        inviter={INVITER_USER}
      />
    );
    // Org name appears in the avatar section
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    // Alice Smith appears in the description AND the inviter section — at least one match
    expect(screen.getAllByText(/Alice Smith/).length).toBeGreaterThan(0);
  });

  it('calls submitOrgInviteCode with { input: { token } } on accept', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    submitOrgMock.mockResolvedValue({ submitOrgInviteCode: { result: true } });

    render(
      <InvitationAcceptanceCard
        token="org-tok"
        kind="org"
        org={ORG_USER}
        onSuccess={onSuccess}
      />
    );
    await user.click(screen.getByTestId('accept-invite-submit'));

    await waitFor(() => expect(submitOrgMock).toHaveBeenCalledTimes(1));
    expect(submitOrgMock).toHaveBeenCalledWith({ input: { token: 'org-tok' } });
    expect(submitAppMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'org', org: { id: 'org-1', displayName: 'Acme Corp' } })
    );
  });

  it('shows org success screen with interpolated org name', async () => {
    const user = userEvent.setup();
    submitOrgMock.mockResolvedValue({ submitOrgInviteCode: { result: true } });

    render(
      <InvitationAcceptanceCard token="org-tok" kind="org" org={ORG_USER} />
    );
    await user.click(screen.getByTestId('accept-invite-submit'));

    // orgSuccessTitle: "You've joined {{orgName}}" interpolated to "You've joined Acme Corp"
    expect(await screen.findByText(/joined Acme Corp/)).toBeInTheDocument();
  });

  it('shows role badge when role prop is provided', () => {
    render(
      <InvitationAcceptanceCard
        token="org-tok"
        kind="org"
        org={ORG_USER}
        role="Admin"
      />
    );
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows pending screen and not success screen when org server returns result:false', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();
    submitOrgMock.mockResolvedValue({ submitOrgInviteCode: { result: false } });

    render(
      <InvitationAcceptanceCard token="org-tok" kind="org" org={ORG_USER} onMessage={onMessage} />
    );
    await user.click(screen.getByTestId('accept-invite-submit'));

    await waitFor(() => expect(submitOrgMock).toHaveBeenCalledTimes(1));
    // org success screen must NOT appear
    expect(screen.queryByText(/joined Acme Corp/)).not.toBeInTheDocument();
    // pending screen appears
    expect(screen.getByText('Request submitted')).toBeInTheDocument();
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'info', key: 'INVITE_PENDING_APPROVAL' })
    );
  });

  it('override returning result without org shows pending screen for org invite', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ kind: 'org' }); // no org field = not accepted
    const onSuccess = vi.fn();

    render(
      <InvitationAcceptanceCard
        token="org-tok"
        kind="org"
        org={ORG_USER}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
      />
    );
    await user.click(screen.getByTestId('accept-invite-submit'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/joined Acme Corp/)).not.toBeInTheDocument();
    expect(screen.getByText('Request submitted')).toBeInTheDocument();
  });
});
