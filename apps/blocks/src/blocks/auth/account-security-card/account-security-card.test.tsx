import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// The data path is the GENERATED hook — mock the module so no real client is
// touched (sdk-binding-contract.md: tests mock `@/generated/<ns>`).
const { credentialsQueryMock } = vi.hoisted(() => ({
  credentialsQueryMock: vi.fn()
}));

vi.mock('@/generated/auth', () => ({
  useWebauthnCredentialsQuery: (params: unknown) => credentialsQueryMock(params)
}));

import { AccountSecurityCard } from './account-security-card';
import { defaultAccountSecurityCardMessages } from './messages';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function successResult(totalCount = 0) {
  return {
    data: {
      webauthnCredentials: { totalCount, nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } }
    },
    isLoading: false,
    error: null
  };
}

function loadingResult() {
  return { data: undefined, isLoading: true, error: null };
}

function errorResult(err: Error) {
  return { data: undefined, isLoading: false, isError: true, error: err };
}

beforeEach(() => {
  credentialsQueryMock.mockReset();
  credentialsQueryMock.mockImplementation(() => successResult(0));
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AccountSecurityCard', () => {
  it('renders the card with default messages', () => {
    render(<AccountSecurityCard />);
    expect(screen.getByText(defaultAccountSecurityCardMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSecurityCardMessages.description)).toBeInTheDocument();
  });

  it('shows all three security rows', () => {
    render(<AccountSecurityCard />);
    expect(screen.getByText(defaultAccountSecurityCardMessages.passwordLabel)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSecurityCardMessages.mfaLabel)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSecurityCardMessages.passkeysLabel)).toBeInTheDocument();
  });

  it('shows "No passkeys registered" when count is 0', () => {
    credentialsQueryMock.mockImplementation(() => successResult(0));
    render(<AccountSecurityCard />);
    expect(screen.getByText(defaultAccountSecurityCardMessages.passkeysNoneStatus)).toBeInTheDocument();
  });

  it('shows interpolated passkey count when passkeys are registered', () => {
    credentialsQueryMock.mockImplementation(() => successResult(3));
    render(<AccountSecurityCard />);
    expect(screen.getByText('3 passkey(s) registered')).toBeInTheDocument();
  });

  it('renders a skeleton while loading', () => {
    credentialsQueryMock.mockImplementation(() => loadingResult());
    const { container } = render(<AccountSecurityCard />);
    // Skeletons render in loading state — no security row text visible
    expect(screen.queryByText(defaultAccountSecurityCardMessages.passwordLabel)).not.toBeInTheDocument();
    // The skeleton elements should be present
    expect(container.querySelectorAll('[data-slot="account-security-card"]').length).toBeGreaterThan(0);
  });

  it('calls onError and onMessage and renders inline error on query failure', async () => {
    const err = Object.assign(new Error('network error'), { extensions: { code: 'UNKNOWN_ERROR' } });
    const onError = vi.fn();
    const onMessage = vi.fn();

    // Return isError:true + the error object so useEffect fires the callbacks.
    credentialsQueryMock.mockImplementation(() => errorResult(err));

    render(<AccountSecurityCard onError={onError} onMessage={onMessage} />);

    // useEffect fires after render — use waitFor to catch async dispatch.
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith({ message: expect.any(String), code: 'UNKNOWN_ERROR' })
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error' })
    );
    // Inline AuthErrorAlert should render in the DOM.
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('renders CTA buttons when callbacks are provided', () => {
    const onChangePassword = vi.fn();
    const onManageMfa = vi.fn();
    const onManagePasskeys = vi.fn();

    render(
      <AccountSecurityCard
        onChangePassword={onChangePassword}
        onManageMfa={onManageMfa}
        onManagePasskeys={onManagePasskeys}
      />
    );

    expect(screen.getByText(defaultAccountSecurityCardMessages.changePasswordButton)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSecurityCardMessages.enableMfaButton)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountSecurityCardMessages.managePasskeysButton)).toBeInTheDocument();
  });

  it('hides CTA buttons when callbacks are not provided', () => {
    render(<AccountSecurityCard />);
    expect(screen.queryByText(defaultAccountSecurityCardMessages.changePasswordButton)).not.toBeInTheDocument();
    expect(screen.queryByText(defaultAccountSecurityCardMessages.enableMfaButton)).not.toBeInTheDocument();
    expect(screen.queryByText(defaultAccountSecurityCardMessages.managePasskeysButton)).not.toBeInTheDocument();
  });

  it('hides MFA CTA when onManageMfa is not provided', () => {
    render(<AccountSecurityCard onChangePassword={vi.fn()} />);
    expect(screen.queryByText(defaultAccountSecurityCardMessages.enableMfaButton)).not.toBeInTheDocument();
    expect(screen.queryByText(defaultAccountSecurityCardMessages.manageMfaButton)).not.toBeInTheDocument();
  });

  it('applies message overrides', () => {
    render(
      <AccountSecurityCard
        messages={{
          title: 'Account Safety',
          errors: { UNKNOWN_ERROR: 'Custom error.' }
        }}
      />
    );
    expect(screen.getByText('Account Safety')).toBeInTheDocument();
    // Default description still rendered (partial override)
    expect(screen.getByText(defaultAccountSecurityCardMessages.description)).toBeInTheDocument();
  });

  it('calls the generated hook with correct selection (first: 0)', () => {
    render(<AccountSecurityCard />);
    expect(credentialsQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        selection: expect.objectContaining({
          fields: { id: true },
          first: 0
        })
      })
    );
  });

  it('applies the data-slot and className', () => {
    const { container } = render(<AccountSecurityCard className="extra-class" />);
    const card = container.querySelector('[data-slot="account-security-card"]');
    expect(card).not.toBeNull();
    expect(card?.className).toContain('extra-class');
  });

  it('adapter (static object) resolves passkey count and disables the generated hook', async () => {
    const adapter = { webauthnCredentials: { totalCount: 5 } };
    render(<AccountSecurityCard adapter={adapter} />);
    // Generated hook must be called with enabled:false so no network request fires.
    expect(credentialsQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
    // Passkey count from adapter is rendered.
    await waitFor(() => expect(screen.getByText('5 passkey(s) registered')).toBeInTheDocument());
  });

  it('adapter (async function) resolves passkey count and disables the generated hook', async () => {
    const adapter = vi.fn().mockResolvedValue({ webauthnCredentials: { totalCount: 2 } });
    render(<AccountSecurityCard adapter={adapter} />);
    expect(credentialsQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
    await waitFor(() => expect(screen.getByText('2 passkey(s) registered')).toBeInTheDocument());
  });
});
