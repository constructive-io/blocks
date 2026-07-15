import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock generated hooks — tests never hit a real client.
// sdk-binding-contract.md: tests mock `@/generated/<ns>`.
const { createUserMock, usersQueryMock } = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  usersQueryMock: vi.fn()
}));

vi.mock('@/generated/auth', () => ({
  useCreateUserMutation: () => ({ mutateAsync: createUserMock, isPending: false }),
  useUsersQuery: usersQueryMock
}));

import { OrgCreateCard } from './create-card';
import { defaultOrgCreateCardMessages } from './messages';

beforeEach(() => {
  createUserMock.mockReset();
  // Default: slug check returns empty (available)
  usersQueryMock.mockReturnValue({ data: { users: { nodes: [] } }, isLoading: false });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function orgUserRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'org-1',
    type: 2,
    displayName: 'Acme Corp',
    username: 'acme-corp',
    profilePicture: null,
    ...overrides
  };
}

/**
 * Fill step 1 and advance to step 3 (no logo step, shortest path to submit).
 */
async function fillStep1AndAdvance(
  user: ReturnType<typeof userEvent.setup>,
  opts: { name?: string; slug?: string } = {}
) {
  const name = opts.name ?? 'Acme Corp';
  const slug = opts.slug ?? 'acme-corp';

  await user.type(screen.getByTestId('org-displayName'), name);
  // Clear auto-derived slug, then type desired slug
  const slugInput = screen.getByTestId('org-username');
  await user.clear(slugInput);
  await user.type(slugInput, slug);

  await user.click(screen.getByTestId('step1-next'));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('OrgCreateCard', () => {
  it('renders step 1 with name and slug fields and a Continue button', () => {
    render(<OrgCreateCard showLogoStep={false} />);
    expect(screen.getByTestId('org-displayName')).toBeInTheDocument();
    expect(screen.getByTestId('org-username')).toBeInTheDocument();
    expect(screen.getByTestId('step1-next')).toHaveTextContent(defaultOrgCreateCardMessages.nextButton);
  });

  it('auto-derives slug from display name while slug has not been manually edited', async () => {
    const user = userEvent.setup();
    render(<OrgCreateCard showLogoStep={false} />);

    await user.type(screen.getByTestId('org-displayName'), 'Acme Corp');

    const slugInput = screen.getByTestId('org-username') as HTMLInputElement;
    expect(slugInput.value).toBe('acme-corp');
  });

  it('shows a validation error when name is empty', async () => {
    const user = userEvent.setup();
    render(<OrgCreateCard showLogoStep={false} />);

    await user.click(screen.getByTestId('step1-next'));

    // Both displayName and username fields show the required error; at least one must be present.
    const errors = await screen.findAllByText(defaultOrgCreateCardMessages.nameRequired);
    expect(errors.length).toBeGreaterThan(0);
    // Should not have advanced to step 3
    expect(screen.queryByTestId('org-submit')).not.toBeInTheDocument();
  });

  it('shows a validation error when slug contains invalid characters', async () => {
    const user = userEvent.setup();
    render(<OrgCreateCard showLogoStep={false} />);

    await user.type(screen.getByTestId('org-displayName'), 'Acme Corp');
    const slugInput = screen.getByTestId('org-username');
    await user.clear(slugInput);
    await user.type(slugInput, 'Acme Corp!'); // spaces + special chars

    await user.click(screen.getByTestId('step1-next'));

    expect(await screen.findByText(defaultOrgCreateCardMessages.slugInvalid)).toBeInTheDocument();
    expect(screen.queryByTestId('org-submit')).not.toBeInTheDocument();
  });

  it('advances to step 3 when step 1 is valid (no logo step)', async () => {
    const user = userEvent.setup();
    render(<OrgCreateCard showLogoStep={false} />);

    await fillStep1AndAdvance(user);

    await waitFor(() => expect(screen.getByTestId('org-submit')).toBeInTheDocument());
    // step3Title appears in both the step indicator span and the h2; query the heading
    expect(screen.getByRole('heading', { name: defaultOrgCreateCardMessages.step3Title })).toBeInTheDocument();
  });

  it('calls the generated createUser mutation with type=2 and fires onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    createUserMock.mockResolvedValue({ createUser: { user: orgUserRecord() } });

    render(<OrgCreateCard showLogoStep={false} onSuccess={onSuccess} onMessage={onMessage} />);

    await fillStep1AndAdvance(user);
    await user.click(screen.getByTestId('org-submit'));

    await waitFor(() => expect(createUserMock).toHaveBeenCalledTimes(1));
    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 2, displayName: 'Acme Corp', username: 'acme-corp' })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        org: expect.objectContaining({ id: 'org-1', type: 'organization' })
      })
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'orgCreate.success' })
    );
  });

  it('normalizes User.type=2 to "organization"', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    createUserMock.mockResolvedValue({ createUser: { user: orgUserRecord({ type: 2 }) } });

    render(<OrgCreateCard showLogoStep={false} onSuccess={onSuccess} />);
    await fillStep1AndAdvance(user);
    await user.click(screen.getByTestId('org-submit'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    const result = onSuccess.mock.calls[0][0] as { org: { type: string } };
    expect(result.org.type).toBe('organization');
  });

  it('maps a PERMISSION_DENIED error inline and fires onError + onMessage', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    createUserMock.mockRejectedValue(
      Object.assign(new Error('permission denied'), { extensions: { code: 'PERMISSION_DENIED' } })
    );

    render(<OrgCreateCard showLogoStep={false} onError={onError} onMessage={onMessage} />);
    await fillStep1AndAdvance(user);
    await user.click(screen.getByTestId('org-submit'));

    expect(await screen.findByText(defaultOrgCreateCardMessages.errors.PERMISSION_DENIED)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultOrgCreateCardMessages.errors.PERMISSION_DENIED,
      code: 'PERMISSION_DENIED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'PERMISSION_DENIED',
      message: defaultOrgCreateCardMessages.errors.PERMISSION_DENIED
    });
  });

  it('maps PROCEDURE_NOT_FOUND gracefully (backend-pending code)', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    createUserMock.mockRejectedValue(
      Object.assign(new Error('procedure not found'), { extensions: { code: 'PROCEDURE_NOT_FOUND' } })
    );

    render(<OrgCreateCard showLogoStep={false} onError={onError} />);
    await fillStep1AndAdvance(user);
    await user.click(screen.getByTestId('org-submit'));

    expect(await screen.findByText(defaultOrgCreateCardMessages.errors.PROCEDURE_NOT_FOUND)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultOrgCreateCardMessages.errors.PROCEDURE_NOT_FOUND,
      code: 'PROCEDURE_NOT_FOUND'
    });
  });

  it('uses onSubmit override instead of generated hook', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({
      org: { id: 'override-org', type: 'organization', displayName: 'Override Org', username: 'override', profilePicture: null }
    });
    const onSuccess = vi.fn();

    render(<OrgCreateCard showLogoStep={false} onSubmit={onSubmit} onSuccess={onSuccess} />);
    await fillStep1AndAdvance(user);
    await user.click(screen.getByTestId('org-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Acme Corp', username: 'acme-corp' })
    );
    expect(createUserMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ org: expect.objectContaining({ id: 'override-org' }) })
    );
  });

  it('applies a custom error message override', async () => {
    const user = userEvent.setup();
    createUserMock.mockRejectedValue(
      Object.assign(new Error('permission denied'), { extensions: { code: 'PERMISSION_DENIED' } })
    );

    render(
      <OrgCreateCard
        showLogoStep={false}
        messages={{ errors: { PERMISSION_DENIED: 'Custom permission message.' } }}
      />
    );
    await fillStep1AndAdvance(user);
    await user.click(screen.getByTestId('org-submit'));

    expect(await screen.findByText('Custom permission message.')).toBeInTheDocument();
  });

  it('shows the logo step when showLogoStep=true and allows skipping', async () => {
    const user = userEvent.setup();
    createUserMock.mockResolvedValue({ createUser: { user: orgUserRecord() } });

    render(<OrgCreateCard showLogoStep={true} onSuccess={vi.fn()} />);
    await fillStep1AndAdvance(user);

    // After step 1, should land on step 2 (logo)
    await waitFor(() => expect(screen.getByTestId('step2-skip')).toBeInTheDocument());
    // step2Title appears in both the step indicator and the h2; query the heading specifically
    expect(screen.getByRole('heading', { name: defaultOrgCreateCardMessages.step2Title })).toBeInTheDocument();

    // Skip logo → step 3
    await act(async () => {
      await user.click(screen.getByTestId('step2-skip'));
    });

    await waitFor(() => expect(screen.getByTestId('org-submit')).toBeInTheDocument());
    // step3Title appears in both the step indicator and the h2 heading
    expect(screen.getByRole('heading', { name: defaultOrgCreateCardMessages.step3Title })).toBeInTheDocument();
  });

  it('allows navigating back from step 3 to step 1 (no logo step)', async () => {
    const user = userEvent.setup();
    render(<OrgCreateCard showLogoStep={false} />);

    await fillStep1AndAdvance(user);
    await waitFor(() => expect(screen.getByTestId('step3-back')).toBeInTheDocument());

    await user.click(screen.getByTestId('step3-back'));
    expect(await screen.findByTestId('step1-next')).toBeInTheDocument();
  });

  it('maps a USERNAME_TAKEN error from the mutation inline and fires onError', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    createUserMock.mockRejectedValue(
      Object.assign(new Error('username taken'), { extensions: { code: 'USERNAME_TAKEN' } })
    );

    render(<OrgCreateCard showLogoStep={false} onError={onError} />);
    await fillStep1AndAdvance(user);
    await user.click(screen.getByTestId('org-submit'));

    expect(await screen.findByText(defaultOrgCreateCardMessages.errors.USERNAME_TAKEN)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultOrgCreateCardMessages.errors.USERNAME_TAKEN,
      code: 'USERNAME_TAKEN'
    });
  });

  it('maps an UNKNOWN_ERROR from the mutation and fires onError', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    // Throw with explicit UNKNOWN_ERROR code so parseGraphQLError maps it to the custom message.
    createUserMock.mockRejectedValue(
      Object.assign(new Error('unknown error'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    render(<OrgCreateCard showLogoStep={false} onError={onError} />);
    await fillStep1AndAdvance(user);
    await user.click(screen.getByTestId('org-submit'));

    expect(await screen.findByText(defaultOrgCreateCardMessages.errors.UNKNOWN_ERROR)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: defaultOrgCreateCardMessages.errors.UNKNOWN_ERROR,
      code: 'UNKNOWN_ERROR'
    });
  });

  it('sets aria-current="step" on the confirm step indicator when showLogoStep=false', async () => {
    const user = userEvent.setup();
    render(<OrgCreateCard showLogoStep={false} />);

    await fillStep1AndAdvance(user);

    // After advancing to step 3 (confirm), the 2nd indicator (position index 1, state=3) should be current.
    await waitFor(() => expect(screen.getByTestId('org-submit')).toBeInTheDocument());

    const stepItems = screen.getAllByRole('listitem');
    // When showLogoStep=false there are 2 indicators; the last one (index 1) maps to state 3 (Confirm).
    const confirmItem = stepItems[1];
    expect(confirmItem).toHaveAttribute('aria-current', 'step');
    // The first indicator (state 1) should NOT have aria-current.
    expect(stepItems[0]).not.toHaveAttribute('aria-current');
  });
});
