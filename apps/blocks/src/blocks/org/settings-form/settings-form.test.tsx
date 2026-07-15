import { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated hook module — never hit a real client.
// CASE a: useUserQuery and useUpdateUserMutation exist in the auth SDK.
// CASE b: useDeleteOrgMutation is absent (backend-pending) — not imported, not mocked.
const { mutateAsyncMock, userQueryMock } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
  userQueryMock: vi.fn(),
}));
vi.mock('@/generated/auth', () => ({
  useUserQuery: (params: unknown) => userQueryMock(params),
  useUpdateUserMutation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

// Mock step-up hook — controls step-up resolve/cancel behavior per test.
const { stepUpMock } = vi.hoisted(() => ({ stepUpMock: vi.fn() }));
vi.mock('@/blocks/auth/use-step-up/use-step-up', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/blocks/auth/use-step-up/use-step-up')>();
  return {
    ...actual,
    useStepUp: () => stepUpMock,
  };
});

import { OrgSettingsForm } from './settings-form';
import { StepUpError } from '@/blocks/auth/use-step-up/use-step-up';

type MockOrgUser = {
  id: string;
  displayName: string;
  username: string;
  profilePicture: string | null;
};

function setOrgQuery(user?: MockOrgUser | null) {
  userQueryMock.mockReturnValue({
    data: user === undefined ? undefined : { user },
    isLoading: user === undefined,
    error: null,
  });
}

beforeEach(() => {
  mutateAsyncMock.mockReset();
  userQueryMock.mockReset();
  setOrgQuery({
    id: 'org-1',
    displayName: 'Acme Corp',
    username: 'acme-corp',
    profilePicture: null,
  });
  stepUpMock.mockReset();
  // Default: step-up resolves (succeeds) unless overridden per test.
  stepUpMock.mockResolvedValue(undefined);
});

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function makeDeleteAdapter(impl?: () => Promise<void>) {
  return vi.fn(impl ?? (() => Promise.resolve()));
}

async function openDeleteDialog(user: ReturnType<typeof userEvent.setup>) {
  const btn = screen.getByTestId('delete-org-button');
  await user.click(btn);
}

async function typeConfirmName(user: ReturnType<typeof userEvent.setup>, name: string) {
  const input = screen.getByTestId('delete-confirm-input');
  await user.clear(input);
  await user.type(input, name);
}

async function clickDeleteConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('delete-confirm-button'));
}

async function replaceSlug(user: ReturnType<typeof userEvent.setup>, slug: string) {
  const input = screen.getByTestId('username');
  await user.clear(input);
  await user.type(input, slug);
}

const SLUG_CHANGE_WARNING = 'Changing the slug will break existing links to this organization.';

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

describe('OrgSettingsForm', () => {
  it('renders the form with name and slug fields', () => {
    render(<OrgSettingsForm orgId="org-1" />);
    expect(screen.getByText('General settings')).toBeInTheDocument();
    expect(screen.getByTestId('displayName')).toBeInTheDocument();
    expect(screen.getByTestId('username')).toBeInTheDocument();
    expect(screen.getByTestId('save-settings-submit')).toHaveTextContent('Save changes');
  });

  it('calls useUpdateUserMutation with the correct args on save', async () => {
    const user = userEvent.setup();
    const onSaveSuccess = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockResolvedValue({
      updateUser: {
        user: {
          id: 'org-1',
          displayName: 'New Name',
          username: 'new-slug',
          profilePicture: null,
        },
      },
    });

    render(<OrgSettingsForm orgId="org-1" onSaveSuccess={onSaveSuccess} onMessage={onMessage} />);

    const nameInput = screen.getByTestId('displayName');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');

    const slugInput = screen.getByTestId('username');
    await user.clear(slugInput);
    await user.type(slugInput, 'new-slug');

    await user.click(screen.getByTestId('save-settings-submit'));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      id: 'org-1',
      userPatch: { displayName: 'New Name', username: 'new-slug' },
    });
    await waitFor(() => expect(onSaveSuccess).toHaveBeenCalledTimes(1));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'orgSettings.saved' })
    );
  });

  it('uses the onSubmit override instead of the generated hook', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({
      id: 'org-1',
      displayName: 'Override Name',
      username: 'override-slug',
      profilePicture: null,
    });
    const onSaveSuccess = vi.fn();

    render(<OrgSettingsForm orgId="org-1" onSubmit={onSubmit} onSaveSuccess={onSaveSuccess} />);

    // Values are pre-populated from query mock; just submit.
    await user.click(screen.getByTestId('save-settings-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onSaveSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Override Name' })
    );
  });

  it('maps a save error and fires onError + onMessage', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('permission denied'), {
        extensions: { code: 'PERMISSION_DENIED' },
      })
    );

    render(<OrgSettingsForm orgId="org-1" onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('save-settings-submit'));

    await waitFor(() =>
      expect(screen.getByText('You do not have permission to edit this organization.')).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledWith({
      message: 'You do not have permission to edit this organization.',
      code: 'PERMISSION_DENIED',
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'PERMISSION_DENIED',
      message: 'You do not have permission to edit this organization.',
    });
  });

  it('validates that display name is required', async () => {
    const user = userEvent.setup();
    render(<OrgSettingsForm orgId="org-1" />);

    const nameInput = screen.getByTestId('displayName');
    await user.clear(nameInput);
    await user.click(screen.getByTestId('save-settings-submit'));

    expect(await screen.findByText('Organization name is required.')).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('validates slug format', async () => {
    const user = userEvent.setup();
    render(<OrgSettingsForm orgId="org-1" />);

    const slugInput = screen.getByTestId('username');
    await user.clear(slugInput);
    await user.type(slugInput, 'bad slug!');
    await user.click(screen.getByTestId('save-settings-submit'));

    expect(
      await screen.findByText('Slug may only contain letters, numbers, and hyphens.')
    ).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('captures the first loaded slug and removes the warning when it is restored', async () => {
    const user = userEvent.setup();
    setOrgQuery(undefined);
    const { rerender } = render(<OrgSettingsForm orgId="org-1" />);

    setOrgQuery({
      id: 'org-1',
      displayName: 'Acme Corp',
      username: 'acme-corp',
      profilePicture: null,
    });
    rerender(<OrgSettingsForm orgId="org-1" />);

    await replaceSlug(user, 'acme-corp');
    expect(screen.queryByText(SLUG_CHANGE_WARNING)).not.toBeInTheDocument();

    await replaceSlug(user, 'new-acme-slug');
    expect(screen.getByText(SLUG_CHANGE_WARNING)).toBeInTheDocument();

    await replaceSlug(user, 'acme-corp');
    expect(screen.queryByText(SLUG_CHANGE_WARNING)).not.toBeInTheDocument();
  });

  it('captures a fresh original slug when orgId changes without a remount', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<OrgSettingsForm orgId="org-1" />);

    await replaceSlug(user, 'new-acme-slug');
    expect(screen.getByText(SLUG_CHANGE_WARNING)).toBeInTheDocument();

    setOrgQuery({
      id: 'org-2',
      displayName: 'Beta Corp',
      username: 'beta-corp',
      profilePicture: null,
    });
    rerender(<OrgSettingsForm orgId="org-2" />);

    await replaceSlug(user, 'beta-corp');
    expect(screen.queryByText(SLUG_CHANGE_WARNING)).not.toBeInTheDocument();

    await replaceSlug(user, 'new-beta-slug');
    expect(screen.getByText(SLUG_CHANGE_WARNING)).toBeInTheDocument();
  });

  it('does not capture a slug from an abandoned suspended render', async () => {
    const user = userEvent.setup();
    const never = new Promise<never>(() => {});

    function SuspendAfterForm({ suspend }: { suspend: boolean }) {
      if (suspend) throw never;
      return null;
    }

    function SettingsTree({ suspend }: { suspend: boolean }) {
      return (
        <Suspense fallback={<div>Suspended update</div>}>
          <OrgSettingsForm orgId="org-1" />
          <SuspendAfterForm suspend={suspend} />
        </Suspense>
      );
    }

    setOrgQuery(undefined);
    const { rerender } = render(<SettingsTree suspend={false} />);

    setOrgQuery({
      id: 'org-1',
      displayName: 'Abandoned Corp',
      username: 'abandoned-slug',
      profilePicture: null,
    });
    rerender(<SettingsTree suspend />);

    setOrgQuery({
      id: 'org-1',
      displayName: 'Committed Corp',
      username: 'committed-slug',
      profilePicture: null,
    });
    rerender(<SettingsTree suspend={false} />);

    await replaceSlug(user, 'committed-slug');
    expect(screen.queryByText(SLUG_CHANGE_WARNING)).not.toBeInTheDocument();

    await replaceSlug(user, 'changed-after-commit');
    expect(screen.getByText(SLUG_CHANGE_WARNING)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Danger Zone / Delete
  // -----------------------------------------------------------------------

  it('shows the delete button when onDeleteSubmit is provided', () => {
    render(<OrgSettingsForm orgId="org-1" onDeleteSubmit={makeDeleteAdapter()} />);
    expect(screen.getByTestId('delete-org-button')).toBeInTheDocument();
  });

  it('opens the delete confirmation dialog on click', async () => {
    const user = userEvent.setup();
    render(<OrgSettingsForm orgId="org-1" onDeleteSubmit={makeDeleteAdapter()} />);

    await openDeleteDialog(user);

    expect(screen.getByTestId('delete-confirm-input')).toBeInTheDocument();
    expect(screen.getByTestId('delete-confirm-button')).toBeInTheDocument();
  });

  it('keeps delete confirm button disabled until name matches', async () => {
    const user = userEvent.setup();
    render(<OrgSettingsForm orgId="org-1" onDeleteSubmit={makeDeleteAdapter()} />);

    await openDeleteDialog(user);
    expect(screen.getByTestId('delete-confirm-button')).toBeDisabled();

    await typeConfirmName(user, 'Acme');
    expect(screen.getByTestId('delete-confirm-button')).toBeDisabled();

    await typeConfirmName(user, 'Acme Corp');
    expect(screen.getByTestId('delete-confirm-button')).not.toBeDisabled();
  });

  it('calls step-up tier=high then onDeleteSubmit on confirm', async () => {
    const user = userEvent.setup();
    const onDeleteSubmit = makeDeleteAdapter();
    const onDeleteSuccess = vi.fn();
    const onMessage = vi.fn();

    render(
      <OrgSettingsForm
        orgId="org-1"
        onDeleteSubmit={onDeleteSubmit}
        onDeleteSuccess={onDeleteSuccess}
        onMessage={onMessage}
      />
    );

    await openDeleteDialog(user);
    await typeConfirmName(user, 'Acme Corp');
    await clickDeleteConfirm(user);

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledWith({ tier: 'high' }));
    await waitFor(() => expect(onDeleteSubmit).toHaveBeenCalledWith('org-1'));
    expect(onDeleteSuccess).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'orgSettings.deleted', message: 'Acme Corp has been deleted.' })
    );
  });

  it('aborts deletion silently when step-up is cancelled (mutation NOT called)', async () => {
    const user = userEvent.setup();
    const onDeleteSubmit = makeDeleteAdapter();
    stepUpMock.mockRejectedValue(new StepUpError('cancelled'));

    render(<OrgSettingsForm orgId="org-1" onDeleteSubmit={onDeleteSubmit} />);

    await openDeleteDialog(user);
    await typeConfirmName(user, 'Acme Corp');
    await clickDeleteConfirm(user);

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledTimes(1));
    // Mutation must NOT have been called — step-up was cancelled.
    expect(onDeleteSubmit).not.toHaveBeenCalled();
  });

  it('shows error when onDeleteSubmit rejects', async () => {
    const user = userEvent.setup();
    const onDeleteSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('procedure not found'), {
        extensions: { code: 'PROCEDURE_NOT_FOUND' },
      })
    );
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(
      <OrgSettingsForm
        orgId="org-1"
        onDeleteSubmit={onDeleteSubmit}
        onError={onError}
        onMessage={onMessage}
      />
    );

    await openDeleteDialog(user);
    await typeConfirmName(user, 'Acme Corp');
    await clickDeleteConfirm(user);

    await waitFor(() =>
      expect(
        screen.getByText(
          'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures'
        )
      ).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PROCEDURE_NOT_FOUND' })
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'PROCEDURE_NOT_FOUND' })
    );
  });
});
