import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AuthEntryPanel } from './auth/auth-entry-panel';
import { AuthFeaturePack } from './auth/auth-feature-pack';
import { NotificationsFeaturePack } from './notifications/notifications-feature-pack';
import { organizationsConsoleModule } from './organizations/organizations-console-module';
import { OrganizationsFeaturePack } from './organizations/organizations-feature-pack';
import { StorageFeaturePack } from './storage/storage-feature-pack';
import { usersConsoleModule } from './users/users-console-module';
import { UsersFeaturePack } from './users/users-feature-pack';

describe('feature-pack interaction policy', () => {
  it('keeps standalone sign-in semantic and hides unavailable mode switches', () => {
    const { container } = render(
      <AuthEntryPanel
        actions={{ signIn: vi.fn() }}
        onModeChange={vi.fn()}
        policy={{ signIn: true }}
      />
    );

    expect(container.querySelector('main')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Forgot password?' })).toBeNull();
  });

  it('isolates account form labels per instance and clears changed passwords', async () => {
    const user = userEvent.setup();
    const changePassword = vi.fn().mockResolvedValue(undefined);
    const account = {
      status: 'ready',
      data: {
        identity: {
          id: 'user-1',
          displayName: 'Ada Lovelace',
          primaryEmail: 'ada@example.com'
        }
      }
    } as const;

    render(
      <>
        <AuthFeaturePack
          account={account}
          actions={{ changePassword }}
          policy={{ changePassword: true }}
          view='account'
        />
        <AuthFeaturePack
          account={account}
          actions={{ changePassword: vi.fn() }}
          policy={{ changePassword: true }}
          view='account'
        />
      </>
    );

    // Security section holds password fields; open both instances first.
    const securityTabs = screen.getAllByRole('tab', { name: 'Security' });
    await user.click(securityTabs[0]!);
    await user.click(securityTabs[1]!);

    const currentPasswords = screen.getAllByLabelText(/Current password/);
    const newPasswords = screen.getAllByLabelText(/New password/);
    expect(new Set(currentPasswords.map((input) => input.id)).size).toBe(2);
    expect(new Set(newPasswords.map((input) => input.id)).size).toBe(2);

    await user.type(currentPasswords[0]!, 'old-password');
    await user.type(newPasswords[0]!, 'a-new-password-with-12-characters');
    await user.click(screen.getAllByRole('button', { name: 'Change password' })[0]!);

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'old-password',
      newPassword: 'a-new-password-with-12-characters'
    }));
    expect(currentPasswords[0]).toHaveValue('');
    expect(newPasswords[0]).toHaveValue('');
  });

  it('keeps email verification resend feedback next to the account action', async () => {
    const user = userEvent.setup();
    const sendVerificationEmail = vi.fn().mockResolvedValue(undefined);
    render(
      <AuthFeaturePack
        account={{
          status: 'ready',
          data: {
            identity: {
              id: 'user-1',
              displayName: 'Ada Lovelace',
              primaryEmail: 'ada@example.com',
              emailVerified: false
            }
          }
        }}
        actions={{ sendVerificationEmail }}
        policy={{ sendVerificationEmail: true }}
        view='account'
      />
    );

    await user.click(screen.getByRole('button', { name: 'Send verification email' }));

    await waitFor(() => expect(sendVerificationEmail).toHaveBeenCalledWith({
      email: 'ada@example.com'
    }));
    expect(screen.getByRole('status')).toHaveTextContent('Verification email sent.');
  });

  it('confirms another-device session revocation before calling the host action', async () => {
    const user = userEvent.setup();
    const revokeSession = vi.fn().mockResolvedValue(undefined);
    render(
      <AuthFeaturePack
        account={{
          status: 'ready',
          data: {
            identity: {
              id: 'user-1',
              displayName: 'Ada Lovelace',
              primaryEmail: 'ada@example.com'
            },
            sessions: [{
              id: 'session-2',
              deviceLabel: 'Firefox on Linux',
              current: false,
              lastSeenAt: '2026-07-23T08:30:00.000Z'
            }]
          }
        }}
        actions={{ revokeSession }}
        policy={{ revokeSession: true }}
        view='account'
      />
    );

    await user.click(screen.getByRole('tab', { name: /Sessions/ }));
    await user.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(revokeSession).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Revoke Firefox on Linux?');

    await user.click(screen.getByRole('button', { name: 'Revoke session' }));
    await waitFor(() => expect(revokeSession).toHaveBeenCalledWith({
      sessionId: 'session-2'
    }));
  });

  it('does not render a notification action unless policy and a host action allow it', () => {
    const notification = {
      id: 'notification-1',
      title: 'Export complete',
      createdAt: 'Just now',
      actionLabel: 'Open export',
      actionHref: '/exports/1'
    } as const;
    const openNotification = vi.fn();
    const { rerender } = render(
      <NotificationsFeaturePack
        actions={{ openNotification }}
        policy={{ openNotification: false }}
        resource={{
          status: 'ready',
          data: { notifications: [notification], unreadCount: 1 }
        }}
      />
    );

    expect(screen.queryByRole('button', { name: 'Open export' })).toBeNull();

    rerender(
      <NotificationsFeaturePack
        policy={{ openNotification: true }}
        resource={{
          status: 'ready',
          data: { notifications: [notification], unreadCount: 1 }
        }}
      />
    );
    expect(screen.queryByRole('button', { name: 'Open export' })).toBeNull();

    rerender(
      <NotificationsFeaturePack
        actions={{ openNotification }}
        policy={{ openNotification: true }}
        resource={{
          status: 'ready',
          data: { notifications: [notification], unreadCount: 1 }
        }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open export' }));
    expect(openNotification).toHaveBeenCalledWith({ notification });
  });

  it('confirms notification deletion and keeps a failed action open', async () => {
    const user = userEvent.setup();
    const deleteNotification = vi.fn().mockRejectedValue(new Error('Delete rejected'));
    const onError = vi.fn();
    render(
      <NotificationsFeaturePack
        actions={{ deleteNotification }}
        onError={onError}
        policy={{ deleteNotification: true }}
        resource={{
          status: 'ready',
          data: {
            notifications: [{
              id: 'notification-1',
              title: 'Export complete',
              createdAt: 'Just now'
            }],
            unreadCount: 1
          }
        }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete Export complete' }));
    expect(deleteNotification).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete notification' }));
    await waitFor(() => expect(deleteNotification).toHaveBeenCalledWith({
      notificationId: 'notification-1'
    }));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Delete rejected' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('The notification could not be deleted.');
  });

  it('offers the first invitation from an empty users resource and preserves failed input', async () => {
    const user = userEvent.setup();
    const invite = vi.fn().mockRejectedValue(new Error('Invite rejected'));
    const onError = vi.fn();
    render(
      <UsersFeaturePack
        actions={{ invite }}
        onError={onError}
        policy={{ invite: true }}
        resource={{ status: 'empty' }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    const email = screen.getByRole('textbox', { name: 'Email address' });
    await user.type(email, 'member@example.com');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invite rejected' })
    ));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(email).toHaveValue('member@example.com');
  });

  it('allows an app invitation without assigning one of the visible profiles', async () => {
    const user = userEvent.setup();
    const invite = vi.fn().mockResolvedValue(undefined);
    render(
      <UsersFeaturePack
        actions={{ invite }}
        policy={{ assignInviteProfile: true, invite: true }}
        resource={{
          status: 'ready',
          data: {
            members: [],
            invitations: [],
            profiles: [{
              id: 'profile-admin',
              name: 'Administrator',
              permissionIds: []
            }],
            inviteProfileIds: ['profile-admin']
          }
        }}
      />
    );

    await user.click(screen.getByRole('tab', { name: /Invitations/ }));
    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    expect(screen.getByRole('combobox', { name: 'Access profile' })).toHaveTextContent('No profile');
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'app@example.com');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() => expect(invite).toHaveBeenCalledWith({
      recipient: 'app@example.com',
      profileId: undefined
    }));
  });

  it('confirms application invitation cancellation before calling the host action', async () => {
    const user = userEvent.setup();
    const cancelInvite = vi.fn().mockResolvedValue(undefined);
    render(
      <UsersFeaturePack
        actions={{ cancelInvite }}
        policy={{ cancelInvite: true }}
        resource={{
          status: 'ready',
          data: {
            members: [],
            invitations: [{
              id: 'invite-1',
              recipient: 'grace@example.com',
              status: 'pending',
              actionPolicy: { cancelInvite: true }
            }]
          }
        }}
      />
    );

    await user.click(screen.getByRole('tab', { name: /Invitations/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancelInvite).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Cancel invitation for grace@example.com?'
    );

    await user.click(screen.getByRole('button', { name: 'Cancel invitation' }));
    await waitFor(() => expect(cancelInvite).toHaveBeenCalledWith({
      inviteId: 'invite-1'
    }));
  });

  it('reports controlled App access section changes to the host', async () => {
    const user = userEvent.setup();
    const onSectionChange = vi.fn();
    render(
      <UsersFeaturePack
        onSectionChange={onSectionChange}
        resource={{
          status: 'ready',
          data: { members: [], invitations: [] }
        }}
        section='members'
      />
    );

    await user.click(screen.getByRole('tab', { name: /Invitations/ }));

    expect(onSectionChange).toHaveBeenCalledWith('invitations');
    expect(screen.getByRole('tab', { name: /Members/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('allows an organization invitation without assigning one of the visible profiles', async () => {
    const user = userEvent.setup();
    const inviteMember = vi.fn().mockResolvedValue(undefined);
    render(
      <OrganizationsFeaturePack
        actions={{ inviteMember }}
        policy={{ assignInviteProfile: true, inviteMember: true }}
        resource={{
          status: 'ready',
          data: {
            activeOrganizationId: 'organization-1',
            organizations: [{ id: 'organization-1', name: 'Acme' }],
            members: [],
            invites: [],
            profiles: [{
              id: 'profile-admin',
              name: 'Administrator',
              permissions: '',
              permissionIds: [],
              isSystem: false,
              isDefault: false
            }],
            assignableInviteProfileIds: ['profile-admin']
          }
        }}
      />
    );

    await user.click(screen.getByRole('tab', { name: /Invitations/ }));
    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    expect(screen.getByRole('combobox', { name: 'Access profile' })).toHaveTextContent('No profile');
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'org@example.com');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() => expect(inviteMember).toHaveBeenCalledWith({
      organizationId: 'organization-1',
      channel: 'email',
      recipient: 'org@example.com',
      profileId: undefined,
      expiresAt: undefined,
      multiple: false,
      inviteLimit: undefined,
      isReadOnly: false
    }));
  });

  it('confirms organization invitation cancellation before calling the host action', async () => {
    const user = userEvent.setup();
    const cancelInvite = vi.fn().mockRejectedValue(new Error('Cancellation rejected'));
    render(
      <OrganizationsFeaturePack
        actions={{ cancelInvite }}
        policy={{ cancelInvite: true }}
        resource={{
          status: 'ready',
          data: {
            organizations: [{ id: 'org-1', name: 'Research' }],
            activeOrganizationId: 'org-1',
            members: [],
            invites: [{
              id: 'invite-2',
              channel: 'email',
              recipient: 'katherine@example.com',
              email: 'katherine@example.com',
              status: 'pending',
              multiple: false,
              isReadOnly: false,
              actionPolicy: { cancelInvite: true }
            }]
          }
        }}
      />
    );

    await user.click(screen.getByRole('tab', { name: /Invitations/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancelInvite).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Cancel invitation for katherine@example.com?'
    );

    await user.click(screen.getByRole('button', { name: 'Cancel invitation' }));
    await waitFor(() => expect(cancelInvite).toHaveBeenCalledWith({
      organizationId: 'org-1',
      inviteId: 'invite-2'
    }));
    expect(screen.getByRole('alert')).toHaveTextContent('Cancellation rejected');
  });

  it('reports reusable organization invitation copy success and failure', async () => {
    const user = userEvent.setup();
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Clipboard permission denied'));

    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText }
      });

      render(
        <OrganizationsFeaturePack
          resource={{
            status: 'ready',
            data: {
              organizations: [{ id: 'org-1', name: 'Research' }],
              activeOrganizationId: 'org-1',
              members: [],
              invites: [
                {
                  id: 'invite-success',
                  channel: 'link',
                  recipient: 'Reusable success link',
                  token: 'success-token',
                  status: 'pending',
                  multiple: true,
                  isReadOnly: false
                },
                {
                  id: 'invite-failure',
                  channel: 'link',
                  recipient: 'Reusable failure link',
                  token: 'failure-token',
                  status: 'pending',
                  multiple: true,
                  isReadOnly: false
                }
              ]
            }
          }}
          section='invitations'
        />
      );

      const copyButtons = screen.getAllByRole('button', { name: 'Copy token' });
      await user.click(copyButtons[0]!);

      await waitFor(() => expect(writeText).toHaveBeenCalledWith('success-token'));
      expect(screen.getByRole('button', { name: 'Copied' })).toBeEnabled();
      expect(screen.getByRole('status')).toHaveTextContent('Invitation token copied.');

      await user.click(screen.getByRole('button', { name: 'Copy token' }));

      await waitFor(() => expect(writeText).toHaveBeenCalledWith('failure-token'));
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The invitation token could not be copied.'
      );
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    }
  });

  it('requires organization row policy for identity and danger-zone actions', async () => {
    const user = userEvent.setup();
    const updateOrganization = vi.fn().mockResolvedValue(undefined);
    const leaveOrganization = vi.fn().mockResolvedValue(undefined);
    const deleteOrganization = vi.fn().mockResolvedValue(undefined);
    const actions = { deleteOrganization, leaveOrganization, updateOrganization };
    const policy = {
      deleteOrganization: true,
      leaveOrganization: true,
      updateOrganization: true
    } as const;
    const member = {
      id: 'membership-1',
      userId: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      governance: 'owner',
      status: 'active',
      isApproved: true,
      isBanned: false,
      isDisabled: false,
      isActive: true,
      isExternal: false,
      isReadOnly: false
    } as const;
    const resource = (allowed: boolean) => ({
      status: 'ready' as const,
      data: {
        organizations: [{
          id: 'org-1',
          name: 'Research',
          actionPolicy: {
            deleteOrganization: allowed,
            leaveOrganization: allowed,
            updateOrganization: allowed
          }
        }],
        activeOrganizationId: 'org-1',
        currentActorId: 'user-1',
        members: [member],
        invites: []
      }
    });
    const { rerender } = render(
      <OrganizationsFeaturePack
        actions={actions}
        policy={policy}
        resource={resource(false)}
        section='settings'
      />
    );

    expect(screen.getByRole('textbox', { name: 'Organization name' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save organization' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Leave organization' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete organization' })).toBeNull();

    rerender(
      <OrganizationsFeaturePack
        actions={actions}
        policy={policy}
        resource={resource(true)}
        section='settings'
      />
    );

    const name = screen.getByRole('textbox', { name: 'Organization name' });
    expect(name).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Leave organization' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete organization' })).toBeEnabled();

    await user.clear(name);
    await user.type(name, 'Research Lab');
    await user.click(screen.getByRole('button', { name: 'Save organization' }));

    await waitFor(() => expect(updateOrganization).toHaveBeenCalledWith({
      organizationId: 'org-1',
      name: 'Research Lab',
      slug: undefined
    }));
  });

  it('recovers when an organization confirmation action throws synchronously', async () => {
    const user = userEvent.setup();
    const deleteOrganization = vi.fn(() => {
      throw new Error('Deletion rejected');
    });
    const onError = vi.fn();
    render(
      <OrganizationsFeaturePack
        actions={{ deleteOrganization }}
        onError={onError}
        policy={{ deleteOrganization: true }}
        resource={{
          status: 'ready',
          data: {
            organizations: [{
              id: 'org-1',
              name: 'Research',
              actionPolicy: { deleteOrganization: true }
            }],
            activeOrganizationId: 'org-1',
            members: [],
            invites: []
          }
        }}
        section='settings'
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete organization' }));
    await user.click(screen.getByRole('button', { name: 'Delete organization' }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Deletion rejected' })
    ));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Deletion rejected');
    expect(screen.getByRole('button', { name: 'Delete organization' })).toBeEnabled();
  });

  it('hides invitation profiles when policy only grants invitation creation', async () => {
    const user = userEvent.setup();
    render(
      <UsersFeaturePack
        actions={{ invite: vi.fn() }}
        policy={{ invite: true }}
        resource={{
          status: 'ready',
          data: {
            members: [],
            invitations: [],
            profiles: [{
              id: 'profile-admin',
              name: 'Administrator',
              permissionIds: []
            }],
            inviteProfileIds: ['profile-admin']
          }
        }}
      />
    );

    await user.click(screen.getByRole('tab', { name: /Invitations/ }));
    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    expect(screen.queryByRole('combobox', { name: 'Access profile' })).not.toBeInTheDocument();
  });

  it('drops a selected app profile when the backend-filtered role list changes', async () => {
    const user = userEvent.setup();
    const invite = vi.fn();
    const resource = {
      status: 'ready' as const,
      data: {
        members: [],
        invitations: [],
        profiles: [{
          id: 'profile-admin',
          name: 'Administrator',
          permissionIds: []
        }],
        inviteProfileIds: ['profile-admin']
      }
    };
    const view = render(
      <UsersFeaturePack
        actions={{ invite }}
        policy={{ assignInviteProfile: true, invite: true }}
        resource={resource}
      />
    );
    await user.click(screen.getByRole('tab', { name: /Invitations/ }));
    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Access profile' }));
    const option = screen.getByText('Administrator').closest('[role="option"]');
    fireEvent.pointerDown(option as HTMLElement, { pointerType: 'mouse' });
    fireEvent.click(option as HTMLElement);

    view.rerender(
      <UsersFeaturePack
        actions={{ invite }}
        policy={{ assignInviteProfile: true, invite: true }}
        resource={{
          ...resource,
          data: { ...resource.data, inviteProfileIds: [] }
        }}
      />
    );
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'app@example.com');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() => expect(invite).toHaveBeenCalledWith({
      recipient: 'app@example.com',
      profileId: undefined
    }));
  });

  it('drops a selected organization profile when the backend-filtered profile list changes', async () => {
    const user = userEvent.setup();
    const inviteMember = vi.fn();
    const resource = {
      status: 'ready' as const,
      data: {
        activeOrganizationId: 'organization-1',
        organizations: [{ id: 'organization-1', name: 'Acme' }],
        members: [],
        invites: [],
        profiles: [{
          id: 'profile-admin',
          name: 'Administrator',
          permissions: '',
          permissionIds: [],
          isSystem: false,
          isDefault: false
        }],
        assignableInviteProfileIds: ['profile-admin']
      }
    };
    const view = render(
      <OrganizationsFeaturePack
        actions={{ inviteMember }}
        policy={{ assignInviteProfile: true, inviteMember: true }}
        resource={resource}
      />
    );
    await user.click(screen.getByRole('tab', { name: /Invitations/ }));
    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Access profile' }));
    const option = screen.getByText('Administrator').closest('[role="option"]');
    fireEvent.pointerDown(option as HTMLElement, { pointerType: 'mouse' });
    fireEvent.click(option as HTMLElement);

    view.rerender(
      <OrganizationsFeaturePack
        actions={{ inviteMember }}
        policy={{ assignInviteProfile: true, inviteMember: true }}
        resource={{
          ...resource,
          data: { ...resource.data, assignableInviteProfileIds: [] }
        }}
      />
    );
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'org@example.com');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() => expect(inviteMember).toHaveBeenCalledWith({
      organizationId: 'organization-1',
      channel: 'email',
      recipient: 'org@example.com',
      profileId: undefined,
      expiresAt: undefined,
      multiple: false,
      inviteLimit: undefined,
      isReadOnly: false
    }));
  });

  it('requires confirmation before disabling a member and keeps a failed confirmation open', async () => {
    const user = userEvent.setup();
    const setDisabled = vi.fn().mockRejectedValue(new Error('Lifecycle update rejected'));
    const onError = vi.fn();
    render(
      <UsersFeaturePack
        actions={{ setDisabled }}
        onError={onError}
        policy={{ setDisabled: true }}
        resource={{
          status: 'ready',
          data: {
            members: [{
              id: 'membership-1',
              userId: 'user-1',
              name: 'Ada Lovelace',
              email: 'ada@example.com',
              lifecycle: {
                approved: true,
                verified: true,
                banned: false,
                disabled: false,
                active: true
              },
              governance: { owner: false, admin: false },
              directPermissionIds: [],
              effectivePermissionIds: [],
              actionPolicy: { setDisabled: true }
            }]
          }
        }}
      />
    );

    const actionTrigger = screen.getByRole('button', { name: 'Actions for Ada Lovelace' });
    await user.click(actionTrigger);
    await user.click(await screen.findByRole('menuitem', { name: 'Disable access' }));
    expect(setDisabled).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Disable access' }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Lifecycle update rejected' })
    ));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('routes profile grants through the injected semantic callback', async () => {
    const setProfile = vi.fn();
    render(
      <UsersFeaturePack
        actions={{ setProfile }}
        policy={{ setProfile: true }}
        resource={{
          status: 'ready',
          data: {
            profiles: [
              { id: 'profile-member', name: 'Member', permissionIds: [] },
              { id: 'profile-admin', name: 'Admin', permissionIds: [] }
            ],
            members: [{
              id: 'membership-1',
              userId: 'user-1',
              name: 'Ada Lovelace',
              email: 'ada@example.com',
              lifecycle: {
                approved: true,
                verified: true,
                banned: false,
                disabled: false,
                active: true
              },
              governance: { owner: false, admin: false },
              profile: { id: 'profile-member', name: 'Member' },
              directPermissionIds: [],
              effectivePermissionIds: [],
              actionPolicy: { setProfile: true }
            }]
          }
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Manage access' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Access profile' }));
    const option = screen.getByText('Admin').closest('[role="option"]');
    expect(option).not.toBeNull();
    fireEvent.pointerDown(option as HTMLElement, { pointerType: 'mouse' });
    fireEvent.click(option as HTMLElement);

    await waitFor(() => expect(setProfile).toHaveBeenCalledWith({
      membershipId: 'membership-1',
      profileId: 'profile-admin'
    }));
  });

  it('renders storage folders as text when navigation policy is denied', () => {
    render(
      <StorageFeaturePack
        actions={{ navigate: vi.fn(), selectBucket: vi.fn() }}
        policy={{ navigate: false, selectBucket: false }}
        resource={{
          status: 'ready',
          data: {
            activeBucketKey: 'documents',
            buckets: [
              { id: 'bucket-1', key: 'documents', name: 'Documents', access: 'private' },
              { id: 'bucket-2', key: 'images', name: 'Images', access: 'private' }
            ],
            objects: [{ id: 'folder-1', key: 'reports', name: 'Reports', kind: 'folder' }]
          }
        }}
      />
    );

    expect(screen.queryByRole('button', { name: 'Reports' })).toBeNull();
    expect(screen.getByRole('button', { name: /Images/ })).toBeDisabled();
  });

  it('explains filtered-empty member searches without treating the resource as empty', async () => {
    const user = userEvent.setup();
    render(
      <UsersFeaturePack
        resource={{
          status: 'ready',
          data: {
            members: [{
              id: 'membership-1',
              userId: 'user-1',
              name: 'Ada Lovelace',
              email: 'ada@example.com',
              lifecycle: {
                approved: true,
                verified: true,
                banned: false,
                disabled: false,
                active: true
              },
              governance: { owner: true, admin: true },
              directPermissionIds: [],
              effectivePermissionIds: []
            }]
          }
        }}
      />
    );

    await user.type(
      screen.getByRole('searchbox', { name: 'Search application members' }),
      'grace'
    );
    expect(screen.getByText('No application members match')).toBeVisible();
    expect(screen.getByText(/No results for “grace”/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByText('Ada Lovelace')).toBeVisible();
    expect(screen.queryByText('No application members match')).toBeNull();
  });

  it('toggles password visibility and uses mode-specific pending labels on auth entry', async () => {
    const user = userEvent.setup();
    const signIn = vi.fn(() => new Promise<void>(() => undefined));
    render(
      <AuthEntryPanel
        actions={{ signIn }}
        policy={{ signIn: true }}
      />
    );

    const password = document.querySelector<HTMLInputElement>('input[name="password"]');
    expect(password).not.toBeNull();
    expect(password).toHaveAttribute('type', 'password');
    await user.type(password!, 'super-secret-pass');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');

    const email = document.querySelector<HTMLInputElement>('input[name="email"]');
    expect(email).not.toBeNull();
    await user.type(email!, 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
  });

  it('visibly targets and focuses a route-selected App access member', async () => {
    render(
      <UsersFeaturePack
        focusedMemberId='membership-2'
        resource={{
          status: 'ready',
          data: {
            members: [
              {
                id: 'membership-1',
                userId: 'user-1',
                name: 'Ada Lovelace',
                email: 'ada@example.com',
                lifecycle: { approved: true, verified: true, banned: false, disabled: false, active: true },
                governance: { owner: true, admin: true },
                directPermissionIds: [],
                effectivePermissionIds: []
              },
              {
                id: 'membership-2',
                userId: 'user-2',
                name: 'Grace Hopper',
                email: 'grace@example.com',
                lifecycle: { approved: true, verified: true, banned: false, disabled: false, active: true },
                governance: { owner: false, admin: false },
                directPermissionIds: [],
                effectivePermissionIds: []
              }
            ]
          }
        }}
      />
    );

    const target = screen.getByText('Grace Hopper').closest('li');
    expect(target).toHaveAttribute('aria-current', 'true');
    await waitFor(() => expect(target).toHaveFocus());
  });

  it('focuses a route-selected organization member after clearing a hiding filter', async () => {
    const user = userEvent.setup();
    const resource = {
      status: 'ready' as const,
      data: {
        activeOrganizationId: 'organization-1',
        organizations: [{ id: 'organization-1', name: 'Acme' }],
        members: [
          {
            id: 'membership-1',
            userId: 'user-1',
            name: 'Ada Lovelace',
            email: 'ada@example.com',
            governance: 'owner' as const,
            status: 'active' as const,
            isApproved: true,
            isBanned: false,
            isDisabled: false,
            isActive: true,
            isExternal: false,
            isReadOnly: false
          },
          {
            id: 'membership-2',
            userId: 'user-2',
            name: 'Grace Hopper',
            email: 'grace@example.com',
            governance: 'member' as const,
            status: 'active' as const,
            isApproved: true,
            isBanned: false,
            isDisabled: false,
            isActive: true,
            isExternal: false,
            isReadOnly: false
          }
        ]
      }
    };
    const view = render(<OrganizationsFeaturePack resource={resource} />);

    await user.type(
      screen.getByRole('searchbox', { name: 'Search organization members' }),
      'Ada'
    );
    expect(screen.queryByText('Grace Hopper')).toBeNull();

    view.rerender(
      <OrganizationsFeaturePack
        focusedMemberId='membership-2'
        resource={resource}
      />
    );

    const target = await screen.findByText('Grace Hopper');
    const row = target.closest('tr');
    expect(row).toHaveAttribute('aria-current', 'true');
    await waitFor(() => expect(row).toHaveFocus());
  });

  it('clears an organization invite profile when delivery is not a single-use email', async () => {
    const user = userEvent.setup();
    const inviteMember = vi.fn().mockResolvedValue(undefined);
    render(
      <OrganizationsFeaturePack
        actions={{ inviteMember }}
        policy={{ assignInviteProfile: true, inviteMember: true }}
        resource={{
          status: 'ready',
          data: {
            activeOrganizationId: 'organization-1',
            organizations: [{ id: 'organization-1', name: 'Acme' }],
            members: [],
            invites: [],
            profiles: [{
              id: 'profile-admin',
              name: 'Administrator',
              permissions: '',
              permissionIds: [],
              isSystem: false,
              isDefault: false
            }],
            assignableInviteProfileIds: ['profile-admin']
          }
        }}
        section='invitations'
      />
    );

    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Access profile' }));
    const profile = screen.getByText('Administrator').closest('[role="option"]');
    fireEvent.pointerDown(profile as HTMLElement, { pointerType: 'mouse' });
    fireEvent.click(profile as HTMLElement);

    fireEvent.click(screen.getByRole('combobox', { name: 'Delivery channel' }));
    const sms = screen.getByText('SMS').closest('[role="option"]');
    fireEvent.pointerDown(sms as HTMLElement, { pointerType: 'mouse' });
    fireEvent.click(sms as HTMLElement);

    expect(screen.getByText(/only to single-use email invitations/)).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Access profile' })).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '+15551234567');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() => expect(inviteMember).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'sms',
      profileId: undefined
    })));
  });

  it('creates organization credentials with least privilege and protects the one-time key', async () => {
    const user = userEvent.setup();
    const createOrganizationApiKey = vi.fn().mockResolvedValue({ token: 'secret-once' });
    render(
      <OrganizationsFeaturePack
        actions={{ createOrganizationApiKey }}
        policy={{ createOrganizationApiKey: true }}
        resource={{
          status: 'ready',
          data: {
            activeOrganizationId: 'organization-1',
            organizations: [{ id: 'organization-1', name: 'Acme' }],
            members: [],
            principals: [{
              id: 'principal-1',
              name: 'Reporting integration',
              useAdminOwner: false,
              isReadOnly: true,
              bypassStepUp: false
            }],
            apiKeys: []
          }
        }}
        section='developer'
      />
    );

    await user.click(screen.getByRole('button', { name: 'Create API key' }));
    const creationDialog = screen.getByRole('dialog');
    expect(within(creationDialog).getByRole('combobox', { name: 'Access level' })).toHaveTextContent('Read only');
    expect(within(creationDialog).getByRole('combobox', { name: 'MFA requirement' })).toHaveTextContent('Verified');
    await user.type(within(creationDialog).getByRole('textbox', { name: 'Key name' }), 'Read-only reporting');
    await user.click(within(creationDialog).getByRole('button', { name: 'Create API key' }));

    await screen.findByDisplayValue('secret-once');
    expect(createOrganizationApiKey).toHaveBeenCalledWith(expect.objectContaining({
      accessLevel: 'read_only',
      mfaLevel: 'verified'
    }));
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'I stored this API key securely' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByDisplayValue('secret-once')).toBeNull());
  });

  it('maps semantic App access detail routes to the focused record', async () => {
    const UsersConsoleFeature = usersConsoleModule.Component;
    render(
      <UsersConsoleFeature
        adapterProps={{
          resource: {
            status: 'ready',
            data: {
              members: [{
                id: 'membership-1',
                userId: 'user-1',
                name: 'Ada Lovelace',
                email: 'ada@example.com',
                lifecycle: { approved: true, verified: true, banned: false, disabled: false, active: true },
                governance: { owner: true, admin: true },
                directPermissionIds: [],
                effectivePermissionIds: []
              }]
            }
          }
        }}
        config={{} as never}
        onError={vi.fn()}
        onRouteChange={vi.fn()}
        route={{ feature: 'users', screen: 'member', membershipId: 'membership-1' }}
        runtime={{} as never}
      />
    );

    const target = screen.getByText('Ada Lovelace').closest('li');
    expect(target).toHaveAttribute('aria-current', 'true');
    await waitFor(() => expect(target).toHaveFocus());
  });

  it('selects the organization named by a controlled route before rendering tenant data', async () => {
    const OrganizationsConsoleFeature = organizationsConsoleModule.Component;
    const selectOrganization = vi.fn().mockResolvedValue(undefined);
    const organizations = [
      { id: 'organization-a', name: 'Alpha' },
      { id: 'organization-b', name: 'Bravo' }
    ];
    const adapterProps = {
      actions: { selectOrganization },
      policy: { selectOrganization: true },
      resource: {
        status: 'ready' as const,
        data: {
          activeOrganizationId: 'organization-a',
          organizations,
          members: [{
            id: 'membership-a',
            userId: 'user-a',
            name: 'Alpha member',
            email: 'alpha@example.com',
            governance: 'owner' as const,
            status: 'active' as const,
            isApproved: true,
            isBanned: false,
            isDisabled: false,
            isActive: true,
            isExternal: false,
            isReadOnly: false
          }]
        }
      }
    };
    const view = render(
      <OrganizationsConsoleFeature
        adapterProps={adapterProps}
        config={{} as never}
        onError={vi.fn()}
        onRouteChange={vi.fn()}
        route={{
          feature: 'organizations',
          screen: 'members',
          organizationId: 'organization-b'
        }}
        runtime={{} as never}
      />
    );

    await waitFor(() => expect(selectOrganization).toHaveBeenCalledWith({
      organizationId: 'organization-b'
    }));
    expect(screen.getByLabelText('Loading content')).toBeVisible();
    expect(screen.queryByText('Alpha member')).toBeNull();

    view.rerender(
      <OrganizationsConsoleFeature
        adapterProps={{
          actions: { selectOrganization },
          policy: { selectOrganization: true },
          resource: {
            status: 'ready',
            data: {
              activeOrganizationId: 'organization-b',
              organizations,
              members: []
            }
          }
        }}
        config={{} as never}
        onError={vi.fn()}
        onRouteChange={vi.fn()}
        route={{
          feature: 'organizations',
          screen: 'members',
          organizationId: 'organization-b'
        }}
        runtime={{} as never}
      />
    );

    expect(screen.getByRole('heading', { name: 'Bravo' })).toBeVisible();
    expect(selectOrganization).toHaveBeenCalledTimes(1);
  });

  it('opens organization creation from its semantic route and reports dismissal', async () => {
    const user = userEvent.setup();
    const OrganizationsConsoleFeature = organizationsConsoleModule.Component;
    const onRouteChange = vi.fn();
    render(
      <OrganizationsConsoleFeature
        adapterProps={{
          actions: { createOrganization: vi.fn() },
          policy: { createOrganization: true },
          resource: {
            status: 'ready',
            data: {
              activeOrganizationId: 'organization-a',
              organizations: [{ id: 'organization-a', name: 'Alpha' }],
              members: []
            }
          }
        }}
        config={{} as never}
        onError={vi.fn()}
        onRouteChange={onRouteChange}
        route={{ feature: 'organizations', screen: 'create' }}
        runtime={{} as never}
      />
    );

    expect(screen.getByRole('dialog')).toHaveTextContent('Create an organization');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onRouteChange).toHaveBeenCalledWith({
      feature: 'organizations',
      screen: 'organizations'
    }));
  });

  it('maps organization profile and developer routes to precise destinations', async () => {
    const OrganizationsConsoleFeature = organizationsConsoleModule.Component;
    const adapterProps = {
      resource: {
        status: 'ready' as const,
        data: {
          activeOrganizationId: 'organization-1',
          organizations: [{ id: 'organization-1', name: 'Acme' }],
          members: [],
          profiles: [{
            id: 'profile-support',
            name: 'Support',
            permissions: '',
            permissionIds: [],
            isSystem: false,
            isDefault: false
          }],
          principals: [{
            id: 'principal-1',
            name: 'Reporting integration',
            useAdminOwner: false,
            isReadOnly: true,
            bypassStepUp: false
          }],
          apiKeys: []
        }
      }
    };
    const view = render(
      <OrganizationsConsoleFeature
        adapterProps={adapterProps}
        config={{} as never}
        onError={vi.fn()}
        onRouteChange={vi.fn()}
        route={{
          feature: 'organizations',
          screen: 'profile',
          organizationId: 'organization-1',
          profileId: 'profile-support'
        }}
        runtime={{} as never}
      />
    );

    const profile = screen.getByRole('heading', { name: 'Support' }).closest('section');
    expect(profile).toHaveAttribute('aria-current', 'true');
    await waitFor(() => expect(profile).toHaveFocus());

    view.rerender(
      <OrganizationsConsoleFeature
        adapterProps={adapterProps}
        config={{} as never}
        onError={vi.fn()}
        onRouteChange={vi.fn()}
        route={{
          feature: 'organizations',
          screen: 'api-keys',
          organizationId: 'organization-1'
        }}
        runtime={{} as never}
      />
    );
    expect(screen.getByText('Organization API keys')).toBeVisible();
    expect(screen.queryByText('Machine principals')).toBeNull();
  });
});
