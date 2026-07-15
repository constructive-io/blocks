import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated auth module. Each hook is stubbed with a controllable fn.
const {
  mutateAsyncCreateMock,
  mutateAsyncSendVerificationMock,
  mutateAsyncUpdateMock,
  mutateAsyncDeleteMock,
  emailsQueryDataMock
} = vi.hoisted(() => ({
  mutateAsyncCreateMock: vi.fn(),
  mutateAsyncSendVerificationMock: vi.fn(),
  mutateAsyncUpdateMock: vi.fn(),
  mutateAsyncDeleteMock: vi.fn(),
  emailsQueryDataMock: vi.fn()
}));

vi.mock('@/generated/auth', () => ({
  useEmailsQuery: (params: unknown) => ({
    data: emailsQueryDataMock(params),
    isLoading: false
  }),
  useCreateEmailMutation: () => ({
    mutateAsync: mutateAsyncCreateMock,
    isPending: false
  }),
  useSendVerificationEmailMutation: () => ({
    mutateAsync: mutateAsyncSendVerificationMock,
    isPending: false
  }),
  useUpdateEmailMutation: () => ({
    mutateAsync: mutateAsyncUpdateMock,
    isPending: false
  }),
  useDeleteEmailMutation: () => ({
    mutateAsync: mutateAsyncDeleteMock,
    isPending: false
  })
}));

import { AccountEmailsList } from './account-emails-list';
import { defaultAccountEmailsListMessages } from './messages';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEmail(overrides: Partial<{
  id: string;
  email: string;
  isPrimary: boolean;
  isVerified: boolean;
  name: string | null;
  createdAt: string;
}> = {}) {
  return {
    id: 'e1',
    email: 'user@example.com',
    isPrimary: false,
    isVerified: true,
    name: null,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides
  };
}

function twoEmails() {
  return {
    emails: {
      nodes: [
        makeEmail({ id: 'e1', email: 'primary@example.com', isPrimary: true, isVerified: true }),
        makeEmail({ id: 'e2', email: 'secondary@example.com', isPrimary: false, isVerified: true })
      ]
    }
  };
}

beforeEach(() => {
  mutateAsyncCreateMock.mockReset();
  mutateAsyncSendVerificationMock.mockReset();
  mutateAsyncUpdateMock.mockReset();
  mutateAsyncDeleteMock.mockReset();
  emailsQueryDataMock.mockReturnValue({
    emails: { nodes: [] }
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openAddDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('add-email-button'));
}

async function fillAndSubmitAdd(
  user: ReturnType<typeof userEvent.setup>,
  email = 'new@example.com'
) {
  await openAddDialog(user);
  await user.type(screen.getByTestId('add-email-input'), email);
  await user.click(screen.getByTestId('add-email-submit'));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AccountEmailsList', () => {
  it('renders the card title and description', () => {
    render(<AccountEmailsList />);
    expect(screen.getByText(defaultAccountEmailsListMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountEmailsListMessages.description)).toBeInTheDocument();
  });

  it('renders email rows with primary and verified badges', () => {
    emailsQueryDataMock.mockReturnValue(twoEmails());
    render(<AccountEmailsList />);

    // Primary email row
    const primaryRow = screen.getByTestId('email-row-e1');
    expect(within(primaryRow).getByText('primary@example.com')).toBeInTheDocument();
    expect(within(primaryRow).getByTestId('badge-primary-e1')).toHaveTextContent('Primary');
    expect(within(primaryRow).getByTestId('badge-verified-e1')).toHaveTextContent('Verified');

    // Secondary email row
    const secondaryRow = screen.getByTestId('email-row-e2');
    expect(within(secondaryRow).getByText('secondary@example.com')).toBeInTheDocument();
    expect(within(secondaryRow).queryByTestId('badge-primary-e2')).not.toBeInTheDocument();
  });

  it('disables delete button for primary email and enables for non-primary', () => {
    emailsQueryDataMock.mockReturnValue(twoEmails());
    render(<AccountEmailsList />);

    expect(screen.getByTestId('delete-button-e1')).toBeDisabled();
    expect(screen.getByTestId('delete-button-e2')).not.toBeDisabled();
  });

  it('shows unverified badge for unverified email', () => {
    emailsQueryDataMock.mockReturnValue({
      emails: {
        nodes: [
          makeEmail({ id: 'e3', email: 'unverified@example.com', isPrimary: false, isVerified: false })
        ]
      }
    });
    render(<AccountEmailsList />);
    expect(screen.getByTestId('badge-unverified-e3')).toHaveTextContent('Unverified');
    expect(screen.getByTestId('verify-button-e3')).toBeInTheDocument();
  });

  it('add-email happy path: calls createEmail + sendVerificationEmail, fires onEmailAdded + onMessage', async () => {
    const user = userEvent.setup();
    const onEmailAdded = vi.fn();
    const onMessage = vi.fn();

    const newRow = makeEmail({ id: 'e99', email: 'new@example.com' });
    mutateAsyncCreateMock.mockResolvedValue({ createEmail: { email: newRow } });
    mutateAsyncSendVerificationMock.mockResolvedValue({ sendVerificationEmail: { result: true } });

    render(<AccountEmailsList onEmailAdded={onEmailAdded} onMessage={onMessage} />);
    await fillAndSubmitAdd(user, 'new@example.com');

    await waitFor(() => expect(mutateAsyncCreateMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncCreateMock).toHaveBeenCalledWith({ email: 'new@example.com' });
    await waitFor(() => expect(mutateAsyncSendVerificationMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncSendVerificationMock).toHaveBeenCalledWith({
      input: { email: 'new@example.com' }
    });
    await waitFor(() => expect(onEmailAdded).toHaveBeenCalledTimes(1));
    expect(onEmailAdded).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'emailAdded' })
    );
  });

  it('add-email error path: shows inline error alert and fires onError on EMAIL_TAKEN', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    mutateAsyncCreateMock.mockRejectedValue(
      Object.assign(new Error('email already exists'), { extensions: { code: 'EMAIL_TAKEN' } })
    );

    render(
      <AccountEmailsList
        onError={onError}
        onMessage={onMessage}
        messages={{ errors: { EMAIL_TAKEN: 'That email is taken.' } }}
      />
    );
    await fillAndSubmitAdd(user);

    expect(await screen.findByText('That email is taken.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: 'That email is taken.', code: 'EMAIL_TAKEN' });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'EMAIL_TAKEN', message: 'That email is taken.' })
    );
  });

  it('add-email validates the field and blocks submit on invalid email', async () => {
    const user = userEvent.setup();
    render(<AccountEmailsList />);
    await openAddDialog(user);
    await user.type(screen.getByTestId('add-email-input'), 'not-an-email');
    await user.click(screen.getByTestId('add-email-submit'));

    expect(await screen.findByText('Please enter a valid email')).toBeInTheDocument();
    expect(mutateAsyncCreateMock).not.toHaveBeenCalled();
  });

  it('set-primary: calls updateEmail, fires onPrimaryChanged and onMessage', async () => {
    const user = userEvent.setup();
    const onPrimaryChanged = vi.fn();
    const onMessage = vi.fn();

    const updatedRow = makeEmail({ id: 'e2', email: 'secondary@example.com', isPrimary: true });
    mutateAsyncUpdateMock.mockResolvedValue({ updateEmail: { email: updatedRow } });
    emailsQueryDataMock.mockReturnValue(twoEmails());

    render(<AccountEmailsList onPrimaryChanged={onPrimaryChanged} onMessage={onMessage} />);
    await user.click(screen.getByTestId('set-primary-button-e2'));

    await waitFor(() => expect(mutateAsyncUpdateMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncUpdateMock).toHaveBeenCalledWith({
      id: 'e2',
      emailPatch: { isPrimary: true }
    });
    await waitFor(() => expect(onPrimaryChanged).toHaveBeenCalledTimes(1));
    expect(onPrimaryChanged).toHaveBeenCalledWith(expect.objectContaining({ id: 'e2' }));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'primaryChanged' })
    );
  });

  it('delete non-primary: opens confirm dialog, calls deleteEmail, fires onEmailDeleted', async () => {
    const user = userEvent.setup();
    const onEmailDeleted = vi.fn();
    const onMessage = vi.fn();

    mutateAsyncDeleteMock.mockResolvedValue({ deleteEmail: { email: { id: 'e2' } } });
    emailsQueryDataMock.mockReturnValue(twoEmails());

    render(<AccountEmailsList onEmailDeleted={onEmailDeleted} onMessage={onMessage} />);

    // Click delete on non-primary row
    await user.click(screen.getByTestId('delete-button-e2'));

    // Confirm dialog should appear
    expect(await screen.findByTestId('delete-email-confirm')).toBeInTheDocument();

    // Confirm deletion
    await user.click(screen.getByTestId('delete-email-confirm'));

    await waitFor(() => expect(mutateAsyncDeleteMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncDeleteMock).toHaveBeenCalledWith({ id: 'e2' });
    await waitFor(() => expect(onEmailDeleted).toHaveBeenCalledTimes(1));
    expect(onEmailDeleted).toHaveBeenCalledWith('e2');
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'emailDeleted' })
    );
  });

  it('delete primary email: delete button is disabled and delete call is never made', async () => {
    const user = userEvent.setup();
    emailsQueryDataMock.mockReturnValue(twoEmails());
    render(<AccountEmailsList />);

    const primaryDeleteBtn = screen.getByTestId('delete-button-e1');
    expect(primaryDeleteBtn).toBeDisabled();

    // Try clicking anyway
    await user.click(primaryDeleteBtn);
    expect(mutateAsyncDeleteMock).not.toHaveBeenCalled();
  });

  it('onSubmitAdd override: calls override fn, skips generated hooks', async () => {
    const user = userEvent.setup();
    const overrideRow = makeEmail({ id: 'ov1', email: 'override@example.com' });
    const onSubmitAdd = vi.fn().mockResolvedValue(overrideRow);
    const onEmailAdded = vi.fn();

    render(<AccountEmailsList onSubmitAdd={onSubmitAdd} onEmailAdded={onEmailAdded} />);
    await fillAndSubmitAdd(user, 'override@example.com');

    await waitFor(() => expect(onSubmitAdd).toHaveBeenCalledTimes(1));
    expect(onSubmitAdd).toHaveBeenCalledWith('override@example.com');
    expect(mutateAsyncCreateMock).not.toHaveBeenCalled();
    expect(mutateAsyncSendVerificationMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onEmailAdded).toHaveBeenCalledWith(expect.objectContaining({ id: 'ov1' })));
  });

  it('readOnly mode: hides all action buttons', () => {
    emailsQueryDataMock.mockReturnValue(twoEmails());
    render(<AccountEmailsList readOnly />);

    expect(screen.queryByTestId('add-email-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-button-e1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-button-e2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('set-primary-button-e2')).not.toBeInTheDocument();
  });

  it('resend verification: calls sendVerificationEmail for an unverified row', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();

    mutateAsyncSendVerificationMock.mockResolvedValue({ sendVerificationEmail: { result: true } });
    emailsQueryDataMock.mockReturnValue({
      emails: {
        nodes: [
          makeEmail({ id: 'e5', email: 'unverified@example.com', isPrimary: false, isVerified: false })
        ]
      }
    });

    render(<AccountEmailsList onMessage={onMessage} />);
    await user.click(screen.getByTestId('verify-button-e5'));

    await waitFor(() => expect(mutateAsyncSendVerificationMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncSendVerificationMock).toHaveBeenCalledWith({
      input: { email: 'unverified@example.com' }
    });
    await waitFor(() =>
      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'info', key: 'verificationSent' })
      )
    );
  });
});
