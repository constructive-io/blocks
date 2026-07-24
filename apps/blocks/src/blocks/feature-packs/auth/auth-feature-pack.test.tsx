import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ConsoleKitFeatureComponentProps } from '../../console-kit/feature-module';
import { authConsoleModule } from './auth-console-module';
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

  it('renders a contributed code challenge and completes it without exposing provider state', async () => {
    const user = userEvent.setup();
    const start = vi.fn().mockResolvedValue({
      id: 'challenge-1',
      method: 'email-otp',
      title: 'Check your email',
      description: 'Enter the code sent to your inbox.',
      response: 'code'
    });
    const complete = vi.fn().mockResolvedValue(undefined);
    const onAuthenticated = vi.fn();
    render(
      <AuthFeaturePack
        challengeContributions={[{
          method: 'email-otp',
          label: 'Email code',
          start,
          complete
        }]}
        onAuthenticated={onAuthenticated}
        view='entry'
      />
    );

    await user.click(screen.getByRole('button', { name: 'Email code' }));
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ email: undefined }));
    await user.type(screen.getByRole('textbox', { name: 'Verification code' }), ' 123456 ');
    await user.click(screen.getByRole('button', { name: 'Verify code' }));

    await waitFor(() => expect(complete).toHaveBeenCalledWith({
      challengeId: 'challenge-1',
      response: { kind: 'code', code: '123456' }
    }));
    expect(onAuthenticated).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Email code authentication completed.'
    );
  });

  it('delegates provider-specific challenge responses before invoking completion', async () => {
    const user = userEvent.setup();
    const credential = { id: 'public-key-credential' };
    const respond = vi.fn().mockResolvedValue({ kind: 'webauthn', credential });
    const complete = vi.fn().mockResolvedValue(undefined);
    render(
      <AuthFeaturePack
        challengeContributions={[{
          method: 'passkey',
          label: 'Use a passkey',
          start: vi.fn().mockResolvedValue({
            id: 'challenge-2',
            method: 'passkey',
            title: 'Use your passkey',
            response: 'webauthn'
          }),
          respond,
          complete
        }]}
        view='entry'
      />
    );

    await user.click(screen.getByRole('button', { name: 'Use a passkey' }));

    await waitFor(() => expect(respond).toHaveBeenCalledWith({
      challenge: expect.objectContaining({ id: 'challenge-2' })
    }));
    expect(complete).toHaveBeenCalledWith({
      challengeId: 'challenge-2',
      response: { kind: 'webauthn', credential }
    });
  });

  it('keeps rejected account actions visible beside the initiating section', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    render(
      <AuthFeaturePack
        account={account}
        actions={{
          changePassword: vi.fn().mockRejectedValue(
            new Error('The current password is incorrect.')
          )
        }}
        onError={onError}
        policy={{ changePassword: true }}
        view='account'
      />
    );

    await user.click(screen.getByRole('tab', { name: 'Security' }));
    await user.type(screen.getByLabelText(/Current password/), 'wrong-password');
    await user.type(screen.getByLabelText(/New password/), 'new-password');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The current password is incorrect.'
    );
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'The current password is incorrect.'
    }));
  });

  it('controls account tabs from semantic Console Kit routes and emits route changes', async () => {
    const user = userEvent.setup();
    const onRouteChange = vi.fn();
    const Module = authConsoleModule.Component;
    const adapterProps = {
      account: {
        ...account,
        data: {
          ...account.data,
          connectedAccounts: [{
            id: 'connection-1',
            service: 'GitHub',
            identifier: 'ada-github'
          }],
          sessions: [{
            id: 'session-1',
            deviceLabel: 'Safari on macOS',
            current: true
          }]
        }
      },
      actions: { changePassword: vi.fn() },
      policy: { changePassword: true },
      view: 'account'
    } as const;
    const shared = {
      adapterProps,
      config: {} as ConsoleKitFeatureComponentProps['config'],
      runtime: {} as ConsoleKitFeatureComponentProps['runtime'],
      onRouteChange,
      onError: vi.fn()
    };
    const { rerender } = render(
      <Module {...shared} route={{ feature: 'auth', screen: 'devices' }} />
    );

    const sessionsTab = screen.getByRole('tab', { name: /Sessions/ });
    expect(sessionsTab).toHaveAttribute('aria-selected', 'true');
    rerender(<Module {...shared} route={{ feature: 'auth', screen: 'security' }} />);
    expect(screen.getByRole('tab', { name: 'Security' }))
      .toHaveAttribute('aria-selected', 'true');
    rerender(
      <Module {...shared} route={{ feature: 'auth', screen: 'connected-accounts' }} />
    );
    expect(screen.getByRole('tab', { name: /Connections/ }))
      .toHaveAttribute('aria-selected', 'true');

    const profileTab = screen.getByRole('tab', { name: 'Profile' });
    expect(profileTab).toHaveClass('focus-visible:ring-[3px]');
    await user.click(profileTab);
    expect(profileTab).toHaveFocus();
    expect(onRouteChange).toHaveBeenLastCalledWith({
      feature: 'auth',
      screen: 'account'
    });
  });

  it('drives password recovery from its semantic route and returns to entry', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    const onRouteChange = vi.fn();
    const Module = authConsoleModule.Component;

    render(
      <Module
        adapterProps={{
          actions: { recoverPassword: vi.fn(), signIn: vi.fn() },
          mode: 'sign-in',
          onModeChange,
          policy: { recoverPassword: true, signIn: true },
          view: 'entry'
        }}
        config={{} as ConsoleKitFeatureComponentProps['config']}
        onError={vi.fn()}
        onRouteChange={onRouteChange}
        route={{ feature: 'auth', screen: 'recovery' }}
        runtime={{} as ConsoleKitFeatureComponentProps['runtime']}
      />
    );

    expect(screen.getByRole('heading', { name: 'Recover your account' }))
      .toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));

    expect(onModeChange).toHaveBeenCalledWith('sign-in');
    expect(onRouteChange).toHaveBeenCalledWith({
      feature: 'auth',
      screen: 'entry'
    });
  });

  it('preserves sign-up when the adapter reloads within the shared entry route', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    const onRouteChange = vi.fn();
    const Module = authConsoleModule.Component;
    const shared = {
      config: {} as ConsoleKitFeatureComponentProps['config'],
      onError: vi.fn(),
      onRouteChange,
      route: { feature: 'auth', screen: 'entry' } as const,
      runtime: {} as ConsoleKitFeatureComponentProps['runtime']
    };
    const { rerender } = render(
      <Module
        {...shared}
        adapterProps={{
          actions: { signIn: vi.fn(), signUp: vi.fn() },
          mode: 'sign-in',
          onModeChange,
          policy: { signIn: true, signUp: true },
          view: 'entry'
        }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(onModeChange).toHaveBeenCalledWith('sign-up');
    expect(onRouteChange).toHaveBeenCalledWith({
      feature: 'auth',
      screen: 'entry'
    });

    rerender(
      <Module
        {...shared}
        adapterProps={{
          actions: { signIn: vi.fn(), signUp: vi.fn() },
          mode: 'sign-up',
          onModeChange,
          policy: { signIn: true, signUp: true },
          view: 'entry'
        }}
      />
    );
    expect(screen.getByRole('heading', { name: 'Create an account' }))
      .toBeVisible();
  });
});
