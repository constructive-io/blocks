import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The data path is the GENERATED hook — mock the module so no real client is
// touched (sdk-binding-contract.md: tests mock `@/generated/<ns>`). The hook is
// replaced with a stub returning our controllable mutateAsync.
const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }));
vi.mock('@/generated/auth', () => ({
  useRequestCrossOriginTokenMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false })
}));

import { CrossOriginLink } from './cross-origin-link';

const DEFAULT_PROPS = {
  email: 'user@example.com',
  password: 'hunter2!',
  destinationOrigin: 'https://app.example.com'
};

beforeEach(() => {
  mutateAsyncMock.mockReset();
  // Reset location.href stub between tests
  delete (window as any).location;
  (window as any).location = { href: '' };
});

async function clickTrigger(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('cross-origin-link-trigger'));
}

describe('CrossOriginLink', () => {
  it('renders the button with default label', () => {
    render(<CrossOriginLink {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('cross-origin-link-trigger')).toHaveTextContent('Continue to app');
  });

  it('renders custom children as the button label', () => {
    render(<CrossOriginLink {...DEFAULT_PROPS}>Open App</CrossOriginLink>);
    expect(screen.getByTestId('cross-origin-link-trigger')).toHaveTextContent('Open App');
  });

  it('calls the generated mutation with { input } shape and navigates on success', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onMessage = vi.fn();
    const token = 'cnc_live_ot_abc123';
    mutateAsyncMock.mockResolvedValue({ requestCrossOriginToken: { result: token } });

    render(<CrossOriginLink {...DEFAULT_PROPS} onSuccess={onSuccess} onMessage={onMessage} />);
    await clickTrigger(user);

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      input: {
        email: 'user@example.com',
        password: 'hunter2!',
        origin: 'https://app.example.com',
        rememberMe: false
      }
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    const expectedUrl = `https://app.example.com/auth/cross-origin?token=${encodeURIComponent(token)}`;
    expect(onSuccess).toHaveBeenCalledWith(token, expectedUrl);
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'crossOriginLink.success',
      message: 'Redirecting to app…'
    });
    expect(window.location.href).toBe(expectedUrl);
  });

  it('respects a custom destinationPath and rememberMe flag', async () => {
    const user = userEvent.setup();
    const token = 'cnc_live_ot_xyz';
    mutateAsyncMock.mockResolvedValue({ requestCrossOriginToken: { result: token } });

    render(
      <CrossOriginLink
        {...DEFAULT_PROPS}
        destinationPath="/signin/callback"
        rememberMe={true}
      />
    );
    await clickTrigger(user);

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      input: expect.objectContaining({ rememberMe: true, origin: 'https://app.example.com' })
    });

    await waitFor(() => expect(window.location.href).toContain('/signin/callback'));
    expect(window.location.href).toBe(
      `https://app.example.com/signin/callback?token=${encodeURIComponent(token)}`
    );
  });

  it('treats a null token result as INVALID_CREDENTIALS', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    mutateAsyncMock.mockResolvedValue({ requestCrossOriginToken: { result: null } });

    render(<CrossOriginLink {...DEFAULT_PROPS} onError={onError} />);
    await clickTrigger(user);

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
  });

  it('maps a coded server error (CROSS_ORIGIN_DISABLED) and fires callbacks', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('Cross-origin disabled'), {
        extensions: { code: 'CROSS_ORIGIN_DISABLED' }
      })
    );

    render(<CrossOriginLink {...DEFAULT_PROPS} onError={onError} onMessage={onMessage} />);
    await clickTrigger(user);

    expect(await screen.findByText('Cross-origin authentication is not enabled.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({
      message: 'Cross-origin authentication is not enabled.',
      code: 'CROSS_ORIGIN_DISABLED'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'CROSS_ORIGIN_DISABLED',
      message: 'Cross-origin authentication is not enabled.'
    });
  });

  it('applies a messages override for a single error code', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValue(
      Object.assign(new Error('Rate limited'), { extensions: { code: 'RATE_LIMITED' } })
    );

    render(
      <CrossOriginLink
        {...DEFAULT_PROPS}
        messages={{ errors: { RATE_LIMITED: 'Slow down, too many tries.' } }}
      />
    );
    await clickTrigger(user);

    expect(await screen.findByText('Slow down, too many tries.')).toBeInTheDocument();
  });

  it('uses the onSubmit override instead of the generated hook', async () => {
    const user = userEvent.setup();
    const token = 'override_token';
    const onSubmit = vi.fn().mockResolvedValue(token);
    const onSuccess = vi.fn();

    render(<CrossOriginLink {...DEFAULT_PROPS} onSubmit={onSubmit} onSuccess={onSuccess} />);
    await clickTrigger(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'hunter2!',
      origin: 'https://app.example.com',
      rememberMe: false
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(
      token,
      `https://app.example.com/auth/cross-origin?token=${encodeURIComponent(token)}`
    );
  });

  it('renders with renderAs="link" variant and still handles click', async () => {
    const user = userEvent.setup();
    const token = 'cnc_live_ot_link';
    mutateAsyncMock.mockResolvedValue({ requestCrossOriginToken: { result: token } });

    render(<CrossOriginLink {...DEFAULT_PROPS} renderAs="link" />);
    const trigger = screen.getByTestId('cross-origin-link-trigger');
    expect(trigger).toHaveAttribute('role', 'button');

    await user.click(trigger);
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.location.href).toContain(encodeURIComponent(token)));
  });
});
