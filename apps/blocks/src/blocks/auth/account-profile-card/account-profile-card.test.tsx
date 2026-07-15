import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The data path is the GENERATED hook — mock the module so no real client is
// touched (sdk-binding-contract.md: tests mock `@/generated/<ns>`).
const { mutateAsyncMock, currentUserDataMock } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
  currentUserDataMock: vi.fn()
}));

vi.mock('@/generated/auth', () => ({
  useUpdateUserMutation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false
  }),
  useCurrentUserQuery: (params: { enabled?: boolean }) => {
    if (params?.enabled === false) return { data: undefined };
    const data = currentUserDataMock();
    return { data };
  }
}));

import { AccountProfileCard } from './account-profile-card';
import { defaultAccountProfileCardMessages } from './messages';

// jsdom does not implement URL.createObjectURL — provide a stub for tests that
// exercise the file-select path.
const objectUrlStub = 'blob:test-preview-url';
const revokeStub = vi.fn();
beforeEach(() => {
  mutateAsyncMock.mockReset();
  currentUserDataMock.mockReset();
  revokeStub.mockReset();
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => objectUrlStub),
    revokeObjectURL: revokeStub
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** Minimal person user prop. */
const personUser = {
  id: 'user-1',
  type: 'person' as const,
  displayName: 'Alice Smith',
  profilePicture: null
};

/** Minimal org user prop. */
const orgUser = {
  id: 'org-1',
  type: 'organization' as const,
  displayName: 'Acme Corp',
  profilePicture: null
};

/** A resolved mutation result. */
function makeUpdateResult(overrides: Partial<{ displayName: string; type: number }> = {}) {
  return {
    updateUser: {
      user: {
        id: overrides.type === 2 ? 'org-1' : 'user-1',
        type: overrides.type ?? 1,
        displayName: overrides.displayName ?? 'Alice Smith',
        profilePicture: null
      }
    }
  };
}

describe('AccountProfileCard', () => {
  it('renders the card title and description', () => {
    render(<AccountProfileCard user={personUser} />);
    expect(screen.getByText(defaultAccountProfileCardMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountProfileCardMessages.description)).toBeInTheDocument();
  });

  it('shows "Display name" label for a person user', () => {
    render(<AccountProfileCard user={personUser} />);
    expect(screen.getByText(defaultAccountProfileCardMessages.displayNameLabel)).toBeInTheDocument();
  });

  it('shows "Organization name" label for an org user', () => {
    render(<AccountProfileCard user={orgUser} />);
    expect(screen.getByText(defaultAccountProfileCardMessages.orgNameLabel)).toBeInTheDocument();
  });

  it('pre-fills the display name from the user prop', () => {
    render(<AccountProfileCard user={personUser} />);
    const input = screen.getByTestId('display-name') as HTMLInputElement;
    expect(input.value).toBe('Alice Smith');
  });

  it('calls useUpdateUserMutation with flat { id, userPatch } args and fires success', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockResolvedValue(makeUpdateResult({ displayName: 'Alice Updated' }));

    render(<AccountProfileCard user={personUser} onSuccess={onSuccess} onMessage={onMessage} />);

    // Clear field and type a new name
    const input = screen.getByTestId('display-name') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'Alice Updated');
    await user.click(screen.getByTestId('save-profile-btn'));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', userPatch: expect.objectContaining({ displayName: 'Alice Updated' }) })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: 'user-1',
          type: 'person',
          displayName: 'Alice Updated'
        })
      })
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'profileUpdated' })
    );
  });

  it('maps a server error and fires onError + onMessage with kind=error', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('something went wrong'), {
        extensions: { code: 'UNKNOWN_ERROR' }
      })
    );

    render(<AccountProfileCard user={personUser} onError={onError} onMessage={onMessage} />);
    await user.click(screen.getByTestId('save-profile-btn'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'UNKNOWN_ERROR' })
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'UNKNOWN_ERROR' })
    );
    // inline alert shown
    expect(
      await screen.findByText(defaultAccountProfileCardMessages.errors.UNKNOWN_ERROR)
    ).toBeInTheDocument();
  });

  it('uses the onSubmit override instead of the generated mutation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({
      user: { id: 'user-1', type: 'person', displayName: 'Override Name', profilePicture: null }
    });
    const onSuccess = vi.fn();

    render(
      <AccountProfileCard
        user={personUser}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
      />
    );
    await user.click(screen.getByTestId('save-profile-btn'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }));
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('uses the currentUser query when no user prop is supplied', () => {
    currentUserDataMock.mockReturnValue({
      currentUser: { id: 'fetched-1', type: 1, displayName: 'Fetched User', profilePicture: null }
    });
    render(<AccountProfileCard />);
    const input = screen.getByTestId('display-name') as HTMLInputElement;
    expect(input.value).toBe('Fetched User');
  });

  it('shows an inline error when a file is too large', async () => {
    const user = userEvent.setup();
    render(<AccountProfileCard user={personUser} maxFileSize={100} />);

    const fileInput = screen.getByTestId('profile-picture-input');
    const bigFile = new File(['x'.repeat(200)], 'big.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, bigFile);

    expect(
      await screen.findByText(defaultAccountProfileCardMessages.fileTooLarge)
    ).toBeInTheDocument();
  });

  it('shows an inline error when the file type is not accepted', async () => {
    render(<AccountProfileCard user={personUser} />);

    const fileInput = screen.getByTestId('profile-picture-input') as HTMLInputElement;
    const pdfFile = new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' });

    // Use fireEvent to bypass the accept-attribute filter that userEvent applies
    // so we can test the block's own MIME-type guard.
    Object.defineProperty(fileInput, 'files', { value: [pdfFile], configurable: true });
    fireEvent.change(fileInput);

    expect(
      await screen.findByText(defaultAccountProfileCardMessages.fileTypeNotAccepted)
    ).toBeInTheDocument();
  });

  it('applies a custom messages override for errors', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('unknown'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    render(
      <AccountProfileCard
        user={personUser}
        messages={{ errors: { UNKNOWN_ERROR: 'Custom error message.' } }}
      />
    );
    await user.click(screen.getByTestId('save-profile-btn'));

    expect(await screen.findByText('Custom error message.')).toBeInTheDocument();
  });

  it('select file → save → mutation called with profilePictureUpload (not a File in profilePicture)', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mutateAsyncMock.mockResolvedValue(
      makeUpdateResult({ displayName: 'Alice Smith' })
    );

    render(<AccountProfileCard user={personUser} onSuccess={onSuccess} />);

    // Use fireEvent to bypass the accept-attribute filter in jsdom/userEvent,
    // matching the same pattern used by the existing file-type test.
    const fileInput = screen.getByTestId('profile-picture-input') as HTMLInputElement;
    const imageFile = new File(['img-data'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', { value: [imageFile], configurable: true });
    fireEvent.change(fileInput);

    // Save
    await user.click(screen.getByTestId('save-profile-btn'));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    const callArg = mutateAsyncMock.mock.calls[0][0] as {
      id: string;
      userPatch: { profilePictureUpload?: File; profilePicture?: null };
    };
    // The File must be passed via the dedicated upload field, not inside profilePicture
    expect(callArg.userPatch.profilePictureUpload).toBeInstanceOf(File);
    expect(callArg.userPatch.profilePicture).toBeUndefined();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('remove photo → save → mutation called with profilePicture: null', async () => {
    const user = userEvent.setup();
    const userWithPhoto = { ...personUser, profilePicture: { url: 'https://cdn.example.com/img.jpg' } };
    mutateAsyncMock.mockResolvedValue(
      makeUpdateResult({ displayName: 'Alice Smith' })
    );

    render(<AccountProfileCard user={userWithPhoto} />);

    // Remove photo button should be visible since user has a profilePicture
    await user.click(screen.getByTestId('remove-photo-btn'));

    // Save
    await user.click(screen.getByTestId('save-profile-btn'));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    const callArg = mutateAsyncMock.mock.calls[0][0] as {
      id: string;
      userPatch: { profilePicture: null | undefined; profilePictureUpload?: File };
    };
    expect(callArg.userPatch.profilePicture).toBeNull();
    expect(callArg.userPatch.profilePictureUpload).toBeUndefined();
  });
});
