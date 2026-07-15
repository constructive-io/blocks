import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Mock the generated admin SDK — tests NEVER touch a real client.
 * (sdk-binding-contract.md §11: tests mock `@/generated/<ns>`)
 *
 * useOrgProfilesQuery returns a data shape matching ConnectionResult<OrgProfile>:
 *   { orgProfiles: { nodes: [...] } }
 */
const {
  mutateAsyncCreateMock,
  mutateAsyncUpdateMock,
  mutateAsyncDeleteMock,
  profilesDataMock
} = vi.hoisted(() => ({
  mutateAsyncCreateMock: vi.fn(),
  mutateAsyncUpdateMock: vi.fn(),
  mutateAsyncDeleteMock: vi.fn(),
  profilesDataMock: vi.fn()
}));

vi.mock('@/generated/admin', () => ({
  useOrgProfilesQuery: () => ({
    data: profilesDataMock(),
    isLoading: false,
    error: null
  }),
  useCreateOrgProfileMutation: () => ({
    mutateAsync: mutateAsyncCreateMock,
    isPending: false
  }),
  useUpdateOrgProfileMutation: () => ({
    mutateAsync: mutateAsyncUpdateMock,
    isPending: false
  }),
  useDeleteOrgProfileMutation: () => ({
    mutateAsync: mutateAsyncDeleteMock,
    isPending: false
  })
}));

import { OrgRolesEditor } from './roles-editor';
import { defaultOrgRolesEditorMessages } from './messages';

const ORG_ID = 'org-123';

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    name: 'Editor',
    slug: 'editor',
    description: 'Can edit content',
    entityId: ORG_ID,
    isSystem: false,
    isDefault: false,
    ...overrides
  };
}

function emptyProfiles() {
  profilesDataMock.mockReturnValue({ orgProfiles: { nodes: [] } });
}

function withProfiles(...profiles: ReturnType<typeof makeProfile>[]) {
  profilesDataMock.mockReturnValue({ orgProfiles: { nodes: profiles } });
}

beforeEach(() => {
  mutateAsyncCreateMock.mockReset();
  mutateAsyncUpdateMock.mockReset();
  mutateAsyncDeleteMock.mockReset();
  profilesDataMock.mockReset();
  emptyProfiles();
});

describe('OrgRolesEditor', () => {
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it('renders the card title and description', () => {
    render(<OrgRolesEditor orgId={ORG_ID} />);
    expect(screen.getByText(defaultOrgRolesEditorMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultOrgRolesEditorMessages.description)).toBeInTheDocument();
  });

  it('shows empty state when there are no profiles', () => {
    emptyProfiles();
    render(<OrgRolesEditor orgId={ORG_ID} />);
    expect(screen.getByTestId('empty-state')).toHaveTextContent(defaultOrgRolesEditorMessages.emptyState);
  });

  it('renders a list of profiles with edit and delete buttons', () => {
    withProfiles(makeProfile());
    render(<OrgRolesEditor orgId={ORG_ID} />);
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByTestId('edit-button-profile-1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-button-profile-1')).toBeInTheDocument();
  });

  it('does not show edit/delete for system profiles', () => {
    withProfiles(makeProfile({ isSystem: true }));
    render(<OrgRolesEditor orgId={ORG_ID} />);
    expect(screen.queryByTestId('edit-button-profile-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-button-profile-1')).not.toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('renders the Add role button in list view', () => {
    render(<OrgRolesEditor orgId={ORG_ID} />);
    expect(screen.getByTestId('add-role-button')).toHaveTextContent(defaultOrgRolesEditorMessages.addProfileButton);
  });

  // ---------------------------------------------------------------------------
  // Create flow
  // ---------------------------------------------------------------------------

  it('opens the create form when Add role is clicked', async () => {
    const user = userEvent.setup();
    render(<OrgRolesEditor orgId={ORG_ID} />);
    await user.click(screen.getByTestId('add-role-button'));
    expect(screen.getByTestId('profile-form')).toBeInTheDocument();
    expect(screen.getByTestId('profile-name')).toBeInTheDocument();
  });

  it('calls createOrgProfile mutation and fires onProfileSaved on success', async () => {
    const user = userEvent.setup();
    const onProfileSaved = vi.fn();
    const onMessage = vi.fn();
    const created = makeProfile({ id: 'new-profile-id', name: 'Billing Manager', slug: 'billing-manager' });
    mutateAsyncCreateMock.mockResolvedValue({ createOrgProfile: { orgProfile: created } });

    render(<OrgRolesEditor orgId={ORG_ID} onProfileSaved={onProfileSaved} onMessage={onMessage} />);
    await user.click(screen.getByTestId('add-role-button'));

    await user.type(screen.getByTestId('profile-name'), 'Billing Manager');
    await user.type(screen.getByTestId('profile-slug'), 'billing-manager');
    await user.click(screen.getByTestId('save-role-button'));

    await waitFor(() => expect(mutateAsyncCreateMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Billing Manager', entityId: ORG_ID })
    );
    await waitFor(() => expect(onProfileSaved).toHaveBeenCalledWith('new-profile-id'));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'orgRolesEditor.save.success' })
    );
  });

  it('shows an inline error and fires onError when create fails', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncCreateMock.mockRejectedValue(
      Object.assign(new Error('duplicate key'), { extensions: { code: 'DUPLICATE_NAME' } })
    );

    render(<OrgRolesEditor orgId={ORG_ID} onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('add-role-button'));
    await user.type(screen.getByTestId('profile-name'), 'Editor');
    await user.type(screen.getByTestId('profile-slug'), 'editor');
    await user.click(screen.getByTestId('save-role-button'));

    expect(await screen.findByText(defaultOrgRolesEditorMessages.errors.DUPLICATE_NAME)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultOrgRolesEditorMessages.errors.DUPLICATE_NAME,
      code: 'DUPLICATE_NAME'
    });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'DUPLICATE_NAME' })
    );
  });

  // ---------------------------------------------------------------------------
  // Edit flow
  // ---------------------------------------------------------------------------

  it('opens the edit form pre-populated with the profile data', async () => {
    const user = userEvent.setup();
    withProfiles(makeProfile());
    render(<OrgRolesEditor orgId={ORG_ID} />);
    await user.click(screen.getByTestId('edit-button-profile-1'));
    expect(screen.getByTestId('profile-name')).toHaveValue('Editor');
    expect(screen.getByTestId('profile-slug')).toHaveValue('editor');
  });

  it('calls updateOrgProfile mutation with correct id + patch', async () => {
    const user = userEvent.setup();
    const onProfileSaved = vi.fn();
    withProfiles(makeProfile());
    const updated = makeProfile({ name: 'Senior Editor' });
    mutateAsyncUpdateMock.mockResolvedValue({ updateOrgProfile: { orgProfile: updated } });

    render(<OrgRolesEditor orgId={ORG_ID} onProfileSaved={onProfileSaved} />);
    await user.click(screen.getByTestId('edit-button-profile-1'));

    const nameInput = screen.getByTestId('profile-name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Senior Editor');
    await user.click(screen.getByTestId('save-role-button'));

    await waitFor(() => expect(mutateAsyncUpdateMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'profile-1', orgProfilePatch: expect.objectContaining({ name: 'Senior Editor' }) })
    );
    await waitFor(() => expect(onProfileSaved).toHaveBeenCalledWith('profile-1'));
  });

  // ---------------------------------------------------------------------------
  // Delete flow
  // ---------------------------------------------------------------------------

  it('shows a delete confirmation dialog when Delete is clicked', async () => {
    const user = userEvent.setup();
    withProfiles(makeProfile());
    render(<OrgRolesEditor orgId={ORG_ID} />);
    await user.click(screen.getByTestId('delete-button-profile-1'));
    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
  });

  it('calls deleteOrgProfile mutation and fires onProfileDeleted', async () => {
    const user = userEvent.setup();
    const onProfileDeleted = vi.fn();
    const onMessage = vi.fn();
    withProfiles(makeProfile());
    mutateAsyncDeleteMock.mockResolvedValue({ deleteOrgProfile: { orgProfile: { id: 'profile-1' } } });

    render(<OrgRolesEditor orgId={ORG_ID} onProfileDeleted={onProfileDeleted} onMessage={onMessage} />);
    await user.click(screen.getByTestId('delete-button-profile-1'));
    await user.click(screen.getByTestId('confirm-delete-button'));

    await waitFor(() => expect(mutateAsyncDeleteMock).toHaveBeenCalledWith({ id: 'profile-1' }));
    await waitFor(() => expect(onProfileDeleted).toHaveBeenCalledWith('profile-1'));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'orgRolesEditor.delete.success' })
    );
  });

  it('shows inline error and fires onError when delete fails with PROFILE_IN_USE', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    withProfiles(makeProfile());
    mutateAsyncDeleteMock.mockRejectedValue(
      Object.assign(new Error('profile in use'), { extensions: { code: 'PROFILE_IN_USE' } })
    );

    render(<OrgRolesEditor orgId={ORG_ID} onError={onError} />);
    await user.click(screen.getByTestId('delete-button-profile-1'));
    await user.click(screen.getByTestId('confirm-delete-button'));

    expect(await screen.findByText(defaultOrgRolesEditorMessages.errors.PROFILE_IN_USE)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultOrgRolesEditorMessages.errors.PROFILE_IN_USE,
      code: 'PROFILE_IN_USE'
    });
  });

  // ---------------------------------------------------------------------------
  // Override seam
  // ---------------------------------------------------------------------------

  it('uses onSubmit override instead of the create mutation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(makeProfile({ id: 'override-id' }));
    const onProfileSaved = vi.fn();

    render(<OrgRolesEditor orgId={ORG_ID} onSubmit={onSubmit} onProfileSaved={onProfileSaved} />);
    await user.click(screen.getByTestId('add-role-button'));
    await user.type(screen.getByTestId('profile-name'), 'Override Role');
    await user.type(screen.getByTestId('profile-slug'), 'override-role');
    await user.click(screen.getByTestId('save-role-button'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Override Role', entityId: ORG_ID })
    );
    expect(mutateAsyncCreateMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onProfileSaved).toHaveBeenCalledWith('override-id'));
  });

  it('uses onDelete override instead of the delete mutation', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    withProfiles(makeProfile());

    render(<OrgRolesEditor orgId={ORG_ID} onDelete={onDelete} />);
    await user.click(screen.getByTestId('delete-button-profile-1'));
    await user.click(screen.getByTestId('confirm-delete-button'));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('profile-1'));
    expect(mutateAsyncDeleteMock).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Message override
  // ---------------------------------------------------------------------------

  it('applies messages overrides for a single error code', async () => {
    const user = userEvent.setup();
    mutateAsyncCreateMock.mockRejectedValue(
      Object.assign(new Error('permission denied'), { extensions: { code: 'PERMISSION_DENIED' } })
    );

    render(
      <OrgRolesEditor
        orgId={ORG_ID}
        messages={{ errors: { PERMISSION_DENIED: 'Custom: no permission.' } }}
      />
    );
    await user.click(screen.getByTestId('add-role-button'));
    await user.type(screen.getByTestId('profile-name'), 'Foo');
    await user.type(screen.getByTestId('profile-slug'), 'foo');
    await user.click(screen.getByTestId('save-role-button'));

    expect(await screen.findByText('Custom: no permission.')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // PROCEDURE_NOT_FOUND — graceful path (messages.errors has the key)
  // ---------------------------------------------------------------------------

  it('maps PROCEDURE_NOT_FOUND gracefully and fires onMessage', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();
    mutateAsyncCreateMock.mockRejectedValue(
      Object.assign(new Error('procedure not found'), { extensions: { code: 'PROCEDURE_NOT_FOUND' } })
    );

    render(<OrgRolesEditor orgId={ORG_ID} onMessage={onMessage} />);
    await user.click(screen.getByTestId('add-role-button'));
    await user.type(screen.getByTestId('profile-name'), 'Test Role');
    await user.type(screen.getByTestId('profile-slug'), 'test-role');
    await user.click(screen.getByTestId('save-role-button'));

    expect(
      await screen.findByText(defaultOrgRolesEditorMessages.errors.PROCEDURE_NOT_FOUND)
    ).toBeInTheDocument();
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'PROCEDURE_NOT_FOUND' })
    );
  });

  // ---------------------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------------------

  it('returns to list view when Cancel is clicked in the form', async () => {
    const user = userEvent.setup();
    render(<OrgRolesEditor orgId={ORG_ID} />);
    await user.click(screen.getByTestId('add-role-button'));
    expect(screen.getByTestId('profile-form')).toBeInTheDocument();

    await user.click(screen.getByTestId('cancel-button'));
    expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('add-role-button')).toBeInTheDocument();
  });

  it('dismisses the delete dialog when Cancel is clicked', async () => {
    const user = userEvent.setup();
    withProfiles(makeProfile());
    render(<OrgRolesEditor orgId={ORG_ID} />);
    await user.click(screen.getByTestId('delete-button-profile-1'));
    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('cancel-delete-button'));
    expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument();
  });
});
