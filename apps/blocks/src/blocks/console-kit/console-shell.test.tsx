import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatabaseIcon, UsersIcon } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { ConsoleShell } from './console-shell';

describe('ConsoleShell', () => {
  it('routes features through the host link, locks signed-out features, and opens the account menu', async () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    const user = userEvent.setup();
    const navigate = vi.fn();
    const signOut = vi.fn();
    render(
      <ConsoleShell
        account={{
          name: 'Ada Lovelace',
          secondaryLabel: 'ada@example.com',
          actionGroups: [{ id: 'session', actions: [{ id: 'sign-out', label: 'Sign out', onSelect: signOut }] }]
        }}
        brand={{ name: 'Northstar Labs' }}
        breadcrumbs={[{ id: 'data', label: 'Data', current: true }]}
        navigation={[{
          id: 'features',
          label: 'Manage application',
          items: [
            { id: 'data', label: 'Data', href: '#console-data', icon: DatabaseIcon, isActive: true },
            { id: 'users', label: 'App access', href: '#console-users', icon: UsersIcon, disabled: true, status: 'locked', badge: 'Sign in' }
          ]
        }]}
        renderLink={(props) => (
          <a
            {...props}
            data-host-link=''
            onClick={(event) => {
              props.onClick?.(event);
              if (!event.defaultPrevented) navigate(props.href);
              event.preventDefault();
            }}
          />
        )}
      >
        <p>Feature content</p>
      </ConsoleShell>
    );

    const rail = screen.getByRole('complementary', { name: 'Application' });
    const data = within(rail).getByRole('link', { name: 'Data' });
    expect(data).toHaveAttribute('aria-current', 'page');
    expect(data).toHaveAttribute('data-host-link');
    fireEvent.click(data);
    expect(navigate).toHaveBeenCalledWith('#console-data');

    const locked = within(rail).getByRole('link', { name: /App access/ });
    expect(locked).toHaveAttribute('aria-disabled', 'true');
    expect(locked).toHaveTextContent('Sign in');
    fireEvent.click(locked);
    expect(navigate).toHaveBeenCalledTimes(1);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Data');
    expect(screen.getByText('Feature content')).toBeVisible();

    await user.click(within(rail).getByRole('button', { name: 'Account: Ada Lovelace' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
