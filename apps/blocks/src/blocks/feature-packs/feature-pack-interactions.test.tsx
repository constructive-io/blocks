import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AuthEntryPanel } from './auth/auth-entry-panel';
import { AuthFeaturePack } from './auth/auth-feature-pack';
import { NotificationsFeaturePack } from './notifications/notifications-feature-pack';
import { OrganizationsFeaturePack } from './organizations/organizations-feature-pack';
import { StorageFeaturePack } from './storage/storage-feature-pack';
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
        policy={{ assignInviteRole: true, invite: true }}
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
        policy={{ assignInviteRole: true, invite: true }}
        resource={{
          status: 'ready',
          data: { members: [], roles: ['Administrator'] }
        }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveTextContent('No role');
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'app@example.com');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() => expect(invite).toHaveBeenCalledWith({
      email: 'app@example.com',
      role: undefined
    }));
  });

  it('allows an organization invitation without assigning one of the visible profiles', async () => {
    const user = userEvent.setup();
    const inviteMember = vi.fn().mockResolvedValue(undefined);
    render(
      <OrganizationsFeaturePack
        actions={{ inviteMember }}
        policy={{ assignInviteRole: true, inviteMember: true }}
        resource={{
          status: 'ready',
          data: {
            activeOrganizationId: 'organization-1',
            organizations: [{ id: 'organization-1', name: 'Acme' }],
            members: [],
            roles: ['Administrator']
          }
        }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveTextContent('No role');
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'org@example.com');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() => expect(inviteMember).toHaveBeenCalledWith({
      organizationId: 'organization-1',
      email: 'org@example.com',
      role: undefined
    }));
  });

  it('hides invitation profiles when policy only grants invitation creation', async () => {
    const user = userEvent.setup();
    render(
      <UsersFeaturePack
        actions={{ invite: vi.fn() }}
        policy={{ invite: true }}
        resource={{
          status: 'ready',
          data: { members: [], roles: ['Administrator'] }
        }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    expect(screen.queryByRole('combobox', { name: 'Role' })).not.toBeInTheDocument();
  });

  it('drops a selected app profile when the backend-filtered role list changes', async () => {
    const user = userEvent.setup();
    const invite = vi.fn();
    const resource = {
      status: 'ready' as const,
      data: { members: [], roles: ['Administrator'] }
    };
    const view = render(
      <UsersFeaturePack
        actions={{ invite }}
        policy={{ assignInviteRole: true, invite: true }}
        resource={resource}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Role' }));
    const option = screen.getByText('Administrator').closest('[role="option"]');
    fireEvent.pointerDown(option as HTMLElement, { pointerType: 'mouse' });
    fireEvent.click(option as HTMLElement);

    view.rerender(
      <UsersFeaturePack
        actions={{ invite }}
        policy={{ assignInviteRole: true, invite: true }}
        resource={{
          ...resource,
          data: { ...resource.data, inviteRoles: [] }
        }}
      />
    );
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'app@example.com');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() => expect(invite).toHaveBeenCalledWith({
      email: 'app@example.com',
      role: undefined
    }));
  });

  it('drops a selected organization profile when the backend-filtered role list changes', async () => {
    const user = userEvent.setup();
    const inviteMember = vi.fn();
    const resource = {
      status: 'ready' as const,
      data: {
        activeOrganizationId: 'organization-1',
        organizations: [{ id: 'organization-1', name: 'Acme' }],
        members: [],
        roles: ['Administrator']
      }
    };
    const view = render(
      <OrganizationsFeaturePack
        actions={{ inviteMember }}
        policy={{ assignInviteRole: true, inviteMember: true }}
        resource={resource}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Invite member' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Role' }));
    const option = screen.getByText('Administrator').closest('[role="option"]');
    fireEvent.pointerDown(option as HTMLElement, { pointerType: 'mouse' });
    fireEvent.click(option as HTMLElement);

    view.rerender(
      <OrganizationsFeaturePack
        actions={{ inviteMember }}
        policy={{ assignInviteRole: true, inviteMember: true }}
        resource={{
          ...resource,
          data: { ...resource.data, inviteRoles: [] }
        }}
      />
    );
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'org@example.com');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() => expect(inviteMember).toHaveBeenCalledWith({
      organizationId: 'organization-1',
      email: 'org@example.com',
      role: undefined
    }));
  });

  it('requires confirmation before removing a member and keeps a failed confirmation open', async () => {
    const user = userEvent.setup();
    const remove = vi.fn().mockRejectedValue(new Error('Removal rejected'));
    const onError = vi.fn();
    render(
      <UsersFeaturePack
        actions={{ remove }}
        onError={onError}
        policy={{ remove: true }}
        resource={{
          status: 'ready',
          data: {
            members: [{
              id: 'membership-1',
              userId: 'user-1',
              name: 'Ada Lovelace',
              email: 'ada@example.com',
              status: 'active',
              role: 'Member'
            }]
          }
        }}
      />
    );

    const actionTrigger = screen.getByRole('button', { name: 'Actions for Ada Lovelace' });
    await user.click(actionTrigger);
    await user.click(await screen.findByRole('menuitem', { name: 'Remove membership' }));
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove membership' }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Removal rejected' })
    ));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('routes user role changes through the injected update callback', async () => {
    const updateRole = vi.fn();
    render(
      <UsersFeaturePack
        actions={{ updateRole }}
        policy={{ updateRole: true }}
        resource={{
          status: 'ready',
          data: {
            roles: ['Member', 'Admin'],
            members: [{
              id: 'membership-1',
              userId: 'user-1',
              name: 'Ada Lovelace',
              email: 'ada@example.com',
              status: 'active',
              role: 'Member'
            }]
          }
        }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Role for Ada Lovelace' }));
    const option = screen.getByText('Admin').closest('[role="option"]');
    expect(option).not.toBeNull();
    fireEvent.pointerDown(option as HTMLElement, { pointerType: 'mouse' });
    fireEvent.click(option as HTMLElement);

    await waitFor(() => expect(updateRole).toHaveBeenCalledWith({
      membershipId: 'membership-1',
      role: 'Admin'
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
});
