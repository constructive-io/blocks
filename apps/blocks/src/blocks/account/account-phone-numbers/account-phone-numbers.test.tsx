import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  AccountPhoneNumbers,
  AccountPhoneNumbersError,
  AccountPhoneNumbersUnavailableError,
  type AccountPhoneNumber,
  type AccountPhoneNumbersAdapter
} from './account-phone-numbers';

const primary: AccountPhoneNumber = { id: 'p1', number: '+14155550132', isVerified: true, isPrimary: true };
const pending: AccountPhoneNumber = { id: 'p2', number: '+447400123456', isVerified: false, isPrimary: false };

function createAdapter(initial: AccountPhoneNumber[] = [], overrides: Partial<AccountPhoneNumbersAdapter> = {}) {
  let rows = [...initial];
  const adapter = {
    list: vi.fn(async () => rows),
    add: vi.fn(async ({ number }: { number: string }) => {
      const phone = { id: `new-${rows.length}`, number, isVerified: false, isPrimary: rows.length === 0 };
      rows = [...rows, phone];
      return phone;
    }),
    sendCode: vi.fn(async () => true),
    verify: vi.fn(async ({ code }: { code: string }) => code === '123456'),
    remove: vi.fn(async ({ id }: { id: string }) => {
      rows = rows.filter((row) => row.id !== id);
    }),
    ...overrides
  };
  return adapter;
}

async function renderBlock(adapter: AccountPhoneNumbersAdapter, props: Partial<Parameters<typeof AccountPhoneNumbers>[0]> = {}) {
  const user = userEvent.setup();
  const view = render(<AccountPhoneNumbers adapter={adapter} defaultCountry="US" {...props} />);
  await waitFor(() => expect(screen.queryByText('Loading phone numbers…')).not.toBeInTheDocument());
  return { user, ...view };
}

const rowFor = (display: string) => screen.getByText(display).closest('li') as HTMLElement;
const codeBox = (index: number) => screen.getByLabelText(`Digit ${index} of 6`);

describe('AccountPhoneNumbers', () => {
  it('lists numbers with their status on one line', async () => {
    await renderBlock(createAdapter([primary, pending]));
    const first = rowFor('+1 415 555 0132');
    expect(within(first).getByText('Verified')).toBeInTheDocument();
    expect(within(first).getByText('Primary')).toBeInTheDocument();
    const second = rowFor('+44 7400 123456');
    expect(within(second).getByText('Unverified')).toBeInTheDocument();
    expect(within(second).getByRole('button', { name: 'Send code' })).toBeInTheDocument();
    expect(within(first).queryByRole('button', { name: 'Send code' })).not.toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    await renderBlock(createAdapter());
    expect(screen.getByText('No phone numbers yet.')).toBeInTheDocument();
  });

  it('rejects an incomplete number locally', async () => {
    const adapter = createAdapter();
    const { user } = await renderBlock(adapter);
    await user.type(screen.getByLabelText('Add a phone number'), '555');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a complete number for the selected country.');
    expect(adapter.add).not.toHaveBeenCalled();
  });

  it('adds a number, texts it a code, and verifies it after a wrong attempt', async () => {
    const adapter = createAdapter();
    const { user } = await renderBlock(adapter);

    await user.type(screen.getByLabelText('Add a phone number'), '2025550143');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(adapter.add).toHaveBeenCalledWith({ number: '+12025550143' }));
    expect(adapter.sendCode).toHaveBeenCalledWith({ id: 'new-0', number: '+12025550143' });
    expect(await screen.findByText('Enter the 6-digit code sent to +1 202 555 0143.')).toBeInTheDocument();

    await user.click(codeBox(1));
    await user.paste('000000');
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That code didn’t work.');
    expect(codeBox(1)).toHaveAttribute('aria-invalid', 'true');

    await user.click(codeBox(1));
    await user.paste('123456');
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(within(rowFor('+1 202 555 0143')).getByText('Verified')).toBeInTheDocument());
    expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('+1 202 555 0143 is verified.');
  });

  it('reloads instead of opening the code field when nothing was sent', async () => {
    const adapter = createAdapter([pending], { sendCode: vi.fn(async () => false) });
    const { user } = await renderBlock(adapter);
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    await waitFor(() => expect(adapter.list).toHaveBeenCalledTimes(2));
    expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument();
  });

  it('removes a number', async () => {
    const adapter = createAdapter([primary, pending]);
    const { user } = await renderBlock(adapter);
    await user.click(screen.getByRole('button', { name: 'Remove +44 7400 123456' }));
    await waitFor(() => expect(screen.queryByText('+44 7400 123456')).not.toBeInTheDocument());
    expect(adapter.remove).toHaveBeenCalledWith({ id: 'p2', number: '+447400123456' });
  });

  it('maps backend error codes to messages on the row that caused them', async () => {
    const adapter = createAdapter([pending], {
      sendCode: vi.fn(async () => {
        throw new AccountPhoneNumbersError('TOO_MANY_REQUESTS');
      })
    });
    const onError = vi.fn();
    const { user } = await renderBlock(adapter, { onError, messages: { errors: { TOO_MANY_REQUESTS: 'Slow down.' } } });
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await within(rowFor('+44 7400 123456')).findByRole('alert')).toHaveTextContent('Slow down.');
    expect(onError).toHaveBeenCalledWith(expect.any(AccountPhoneNumbersError), 'send');
  });

  it('reads GraphQL extensions.code, and lets formatError take precedence', async () => {
    const adapter = createAdapter([], {
      add: vi.fn(async () => {
        throw Object.assign(new Error('raw'), { extensions: { code: 'IDENTIFIER_CLAIM_LIMIT' } });
      })
    });
    const { user, rerender } = await renderBlock(adapter);
    await user.type(screen.getByLabelText('Add a phone number'), '2025550143');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('You have too many unverified phone numbers.');

    rerender(<AccountPhoneNumbers adapter={adapter} defaultCountry="US" formatError={(_, action) => `Failed: ${action}`} />);
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed: add');
  });

  it('shows a load failure with a retry', async () => {
    let fail = true;
    const adapter = createAdapter([primary], {
      list: vi.fn(async () => {
        if (fail) throw new Error('Failed to fetch');
        return [primary];
      })
    });
    const { user } = await renderBlock(adapter);
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('+1 415 555 0132')).toBeInTheDocument();
  });

  it('replaces the list with a notice when phone numbers are unavailable', async () => {
    await renderBlock(
      createAdapter([], {
        list: vi.fn(async () => {
          throw new AccountPhoneNumbersUnavailableError();
        })
      })
    );
    expect(screen.getByText('Phone numbers are not available on this account’s authentication service.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Add a phone number')).not.toBeInTheDocument();
  });

  it('reloads for a new identity', async () => {
    const first = createAdapter([primary]);
    const second = createAdapter([pending]);
    const { rerender } = await renderBlock(first, { identityKey: 'a' });
    rerender(<AccountPhoneNumbers adapter={second} identityKey="b" defaultCountry="US" />);
    expect(await screen.findByText('+44 7400 123456')).toBeInTheDocument();
    expect(screen.queryByText('+1 415 555 0132')).not.toBeInTheDocument();
  });
});

