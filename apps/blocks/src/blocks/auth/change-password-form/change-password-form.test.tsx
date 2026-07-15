import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated hook — tests never hit a real client.
// (sdk-binding-contract.md §11, MASTER-PROMPT §5.5)
const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
vi.mock('@/generated/auth', () => ({
  useSetPasswordMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
}));

// Mock useStepUp — tests cover both the success and cancel paths.
const { stepUpMock } = vi.hoisted(() => ({ stepUpMock: vi.fn() }));
vi.mock('@/blocks/auth/use-step-up/use-step-up', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/blocks/auth/use-step-up/use-step-up')>();
  return {
    ...original,
    useStepUp: () => stepUpMock
  };
});

import { ChangePasswordForm } from './change-password-form';
import { StepUpError } from '@/blocks/auth/use-step-up/use-step-up';

beforeEach(() => {
  mutateAsyncMock.mockReset();
  stepUpMock.mockReset();
  // Default: step-up resolves (user verified)
  stepUpMock.mockResolvedValue(undefined);
});

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  {
    currentPassword = 'OldPass1!',
    newPassword = 'NewPass1!',
    confirmPassword = 'NewPass1!'
  } = {}
) {
  await user.type(screen.getByTestId('current-password'), currentPassword);
  await user.type(screen.getByTestId('new-password'), newPassword);
  await user.type(screen.getByTestId('confirm-password'), confirmPassword);
  await user.click(screen.getByTestId('change-password-submit'));
}

describe('ChangePasswordForm', () => {
  it('renders the form fields and submit button', () => {
    render(<ChangePasswordForm />);
    expect(screen.getByTestId('current-password')).toBeInTheDocument();
    expect(screen.getByTestId('new-password')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-password')).toBeInTheDocument();
    expect(screen.getByTestId('change-password-submit')).toHaveTextContent('Update password');
  });

  it('calls step-up with tier=medium then the generated mutation on happy path', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockResolvedValue({ setPassword: { result: true } });

    render(<ChangePasswordForm onSuccess={onSuccess} onMessage={onMessage} />);
    await fillAndSubmit(user);

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledTimes(1));
    expect(stepUpMock).toHaveBeenCalledWith({ tier: 'medium' });

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      input: { currentPassword: 'OldPass1!', newPassword: 'NewPass1!' }
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ success: true });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'changePassword.success' })
    );
  });

  it('shows mismatch error and does NOT call mutation when passwords differ', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);
    await fillAndSubmit(user, { newPassword: 'NewPass1!', confirmPassword: 'Different!' });

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('step-up cancel — mutation NOT called, fires onError with STEP_UP_CANCELLED', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    stepUpMock.mockRejectedValue(new StepUpError('cancelled'));

    render(<ChangePasswordForm onError={onError} onMessage={onMessage} />);
    await fillAndSubmit(user);

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({ message: 'Identity verification was cancelled.', code: 'STEP_UP_CANCELLED' });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'STEP_UP_CANCELLED',
      message: 'Identity verification was cancelled.'
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('treats result=false as INVALID_CREDENTIALS and fires onError', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    mutateAsyncMock.mockResolvedValue({ setPassword: { result: false } });

    render(<ChangePasswordForm onError={onError} />);
    await fillAndSubmit(user);

    expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: 'Current password is incorrect.', code: 'INVALID_CREDENTIALS' });
  });

  it('maps a coded server error and applies the messages override', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('pg error'), { extensions: { code: 'WEAK_PASSWORD' } })
    );

    render(
      <ChangePasswordForm
        onError={onError}
        onMessage={onMessage}
        messages={{ errors: { WEAK_PASSWORD: 'Pick a stronger password.' } }}
      />
    );
    await fillAndSubmit(user);

    expect(await screen.findByText('Pick a stronger password.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: 'Pick a stronger password.', code: 'WEAK_PASSWORD' });
    expect(onMessage).toHaveBeenCalledWith({ kind: 'error', key: 'WEAK_PASSWORD', message: 'Pick a stronger password.' });
  });

  it('uses the onSubmit override instead of the generated mutation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onSuccess = vi.fn();

    render(<ChangePasswordForm onSubmit={onSubmit} onSuccess={onSuccess} />);
    await fillAndSubmit(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ currentPassword: 'OldPass1!', newPassword: 'NewPass1!' });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith({ success: true });
  });

  it('skips step-up when requireStepUp=false', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({ setPassword: { result: true } });

    render(<ChangePasswordForm requireStepUp={false} />);
    await fillAndSubmit(user);

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(stepUpMock).not.toHaveBeenCalled();
  });

  it('blocks submit while new password field is empty', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await user.type(screen.getByTestId('current-password'), 'OldPass1!');
    // Skip new password — leave empty
    await user.type(screen.getByTestId('confirm-password'), 'something');
    await user.click(screen.getByTestId('change-password-submit'));

    expect(await screen.findByText('New password is required')).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('shows strength meter when showPasswordStrength=true and new password has text', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm showPasswordStrength={true} />);

    await act(async () => {
      await user.type(screen.getByTestId('new-password'), 'MySecurePassword1!');
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('hides strength meter when showPasswordStrength=false', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm showPasswordStrength={false} />);

    await act(async () => {
      await user.type(screen.getByTestId('new-password'), 'MySecurePassword1!');
    });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
