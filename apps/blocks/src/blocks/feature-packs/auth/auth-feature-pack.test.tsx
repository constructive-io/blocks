import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AuthFeaturePack } from './auth-feature-pack';

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

describe('authentication feature-pack flows', () => {
  it('passes the explicit remember-me choice to password sign-in', async () => {
    const user = userEvent.setup();
    const signIn = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <AuthFeaturePack
        actions={{ signIn }}
        policy={{ signIn: true }}
        view='entry'
      />
    );

    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'ada@example.com');
    await user.type(container.querySelector('input[name="password"]')!, 'short');
    await user.click(screen.getByRole('checkbox', {
      name: 'Keep me signed in on this device'
    }));
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'short',
      rememberMe: true
    }));
  });

  it('uses only a supplied password policy and does not invent a fixed minimum', async () => {
    const user = userEvent.setup();
    const unrestricted = vi.fn().mockResolvedValue(undefined);
    const constrained = vi.fn().mockResolvedValue(undefined);
    const first = render(
      <AuthFeaturePack
        actions={{ signUp: unrestricted }}
        mode='sign-up'
        policy={{ signUp: true }}
        view='entry'
      />
    );

    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'ada@example.com');
    await user.type(first.container.querySelector('input[name="password"]')!, 'tiny');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(unrestricted).toHaveBeenCalled());
    first.unmount();

    const second = render(
      <AuthFeaturePack
        actions={{ signUp: constrained }}
        mode='sign-up'
        passwordPolicy={{ minLength: 8, hint: 'Use a memorable phrase.' }}
        policy={{ signUp: true }}
        view='entry'
      />
    );
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'ada@example.com');
    await user.type(second.container.querySelector('input[name="password"]')!, 'tiny');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(constrained).not.toHaveBeenCalled();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
  });

  it('requires named confirmation and password step-up before requesting deletion', async () => {
    const user = userEvent.setup();
    const requestAccountDeletion = vi.fn().mockResolvedValue(undefined);
    render(
      <AuthFeaturePack
        account={account}
        actions={{ requestAccountDeletion }}
        policy={{ requestAccountDeletion: true }}
        view='account'
      />
    );

    await user.click(screen.getByRole('tab', { name: 'Security' }));
    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Type ada@example.com to confirm' }),
      'ada@example.com'
    );
    await user.type(screen.getByLabelText(/Current password/), 'current-password');
    await user.click(screen.getByRole('button', { name: 'Send deletion email' }));

    await waitFor(() => expect(requestAccountDeletion).toHaveBeenCalledWith({
      password: 'current-password'
    }));
    expect(screen.getByText('Check your email to finish deleting this account.'))
      .toBeInTheDocument();
  });

  it('steps up before disconnecting a loaded external account', async () => {
    const user = userEvent.setup();
    const disconnectConnectedAccount = vi.fn().mockResolvedValue(undefined);
    render(
      <AuthFeaturePack
        account={{
          ...account,
          data: {
            ...account.data,
            connectedAccounts: [{
              id: 'connection-1',
              service: 'GitHub',
              identifier: 'ada-github',
              isVerified: true
            }]
          }
        }}
        actions={{ disconnectConnectedAccount }}
        policy={{ disconnectConnectedAccount: true }}
        view='account'
      />
    );

    await user.click(screen.getByRole('tab', { name: /Connections/ }));
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Type ada-github to confirm' }),
      'ada-github'
    );
    await user.type(screen.getByLabelText(/Current password/), 'current-password');
    await user.click(screen.getByRole('button', { name: 'Disconnect account' }));

    await waitFor(() => expect(disconnectConnectedAccount).toHaveBeenCalledWith({
      accountId: 'connection-1',
      password: 'current-password'
    }));
  });
});
