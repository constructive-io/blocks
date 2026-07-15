import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the generated auth SDK — never hit a real client.
// (sdk-binding-contract.md: tests mock `@/generated/<ns>`)
const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
vi.mock('@/generated/auth', () => ({
  useCreateApiKeyMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
}));

// Mock use-step-up — the stepUp function resolves (success) by default.
const { stepUpMock } = vi.hoisted(() => ({ stepUpMock: vi.fn() }));
vi.mock('@/blocks/auth/use-step-up/use-step-up', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/blocks/auth/use-step-up/use-step-up')>();
  return {
    ...actual,
    useStepUp: () => stepUpMock
  };
});

import { ApiKeyCreateDialog } from './api-key-create-dialog';
import { StepUpError } from '@/blocks/auth/use-step-up/use-step-up';

beforeEach(() => {
  mutateAsyncMock.mockReset();
  stepUpMock.mockReset();
  // Default: step-up passes.
  stepUpMock.mockResolvedValue(undefined);
});

function makeResult(overrides: Record<string, unknown> = {}) {
  return {
    createApiKey: {
      result: {
        apiKey: 'cnc_live_sk_abc123',
        keyId: 'key-uuid-1',
        expiresAt: null,
        ...overrides
      }
    }
  };
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  { name = 'My CI key' } = {}
) {
  const nameInput = screen.getByTestId('api-key-name');
  await user.clear(nameInput);
  await user.type(nameInput, name);
  await user.click(screen.getByTestId('api-key-create-submit'));
}

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  onSuccess: vi.fn()
};

describe('ApiKeyCreateDialog', () => {
  it('renders the dialog with title, name field, and submit button', () => {
    render(<ApiKeyCreateDialog {...defaultProps} />);
    expect(screen.getByText('Create API key')).toBeInTheDocument();
    expect(screen.getByTestId('api-key-name')).toBeInTheDocument();
    expect(screen.getByTestId('api-key-create-submit')).toBeInTheDocument();
    expect(screen.getByTestId('api-key-cancel')).toBeInTheDocument();
  });

  it('happy path: step-up passes, mutation fires with correct input, onSuccess called', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockResolvedValue(makeResult());

    render(<ApiKeyCreateDialog {...defaultProps} onSuccess={onSuccess} onMessage={onMessage} />);
    await fillAndSubmit(user);

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledTimes(1));
    expect(stepUpMock).toHaveBeenCalledWith({ tier: 'high' });

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          keyName: 'My CI key',
          accessLevel: 'read_only',
          mfaLevel: 'none'
        })
      })
    );

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        keyId: 'key-uuid-1',
        rawKey: 'cnc_live_sk_abc123',
        name: 'My CI key',
        expiresAt: null
      })
    );
  });

  it('step-up cancel: mutation NOT called, no error fired, onMessage fires info', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();

    // Step-up cancelled by user.
    stepUpMock.mockRejectedValue(new StepUpError('cancelled'));

    render(
      <ApiKeyCreateDialog
        {...defaultProps}
        onSuccess={onSuccess}
        onError={onError}
        onMessage={onMessage}
      />
    );
    await fillAndSubmit(user);

    await waitFor(() => expect(stepUpMock).toHaveBeenCalledTimes(1));

    // Mutation must NOT have been called.
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    // onError must NOT fire for a cancelled step-up.
    expect(onError).not.toHaveBeenCalled();
    // onSuccess must NOT fire.
    expect(onSuccess).not.toHaveBeenCalled();
    // An info message fires.
    await waitFor(() =>
      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'info', key: 'stepUpCancelled' })
      )
    );
  });

  it('server error: inline error displayed, onError and onMessage fired', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('db error'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    render(<ApiKeyCreateDialog {...defaultProps} onError={onError} onMessage={onMessage} />);
    await fillAndSubmit(user);

    expect(await screen.findByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'UNKNOWN_ERROR' })
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'UNKNOWN_ERROR' })
    );
  });

  it('message override: custom error message is shown', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('db error'), { extensions: { code: 'UNKNOWN_ERROR' } })
    );

    render(
      <ApiKeyCreateDialog
        {...defaultProps}
        messages={{ errors: { UNKNOWN_ERROR: 'Custom error message.' } }}
      />
    );
    await fillAndSubmit(user);

    expect(await screen.findByText('Custom error message.')).toBeInTheDocument();
  });

  it('uses the onSubmit override instead of the generated hook', async () => {
    const user = userEvent.setup();
    const onSubmitOverride = vi.fn().mockResolvedValue({
      keyId: 'override-key-id',
      rawKey: 'cnc_live_sk_override',
      name: 'My CI key',
      expiresAt: null
    });
    const onSuccess = vi.fn();

    render(
      <ApiKeyCreateDialog
        {...defaultProps}
        onSubmit={onSubmitOverride}
        onSuccess={onSuccess}
      />
    );
    await fillAndSubmit(user);

    await waitFor(() => expect(onSubmitOverride).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ keyId: 'override-key-id', rawKey: 'cnc_live_sk_override' })
    );
  });

  it('blocks submit while name field is empty', async () => {
    const user = userEvent.setup();
    render(<ApiKeyCreateDialog {...defaultProps} />);

    // Clear the name field so it's empty and click submit.
    const nameInput = screen.getByTestId('api-key-name');
    await user.clear(nameInput);
    await user.click(screen.getByTestId('api-key-create-submit'));

    expect(await screen.findByText('Key name is required')).toBeInTheDocument();
    expect(stepUpMock).not.toHaveBeenCalled();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('cancel button calls onOpenChange(false) without mutation', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ApiKeyCreateDialog {...defaultProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByTestId('api-key-cancel'));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });
});
