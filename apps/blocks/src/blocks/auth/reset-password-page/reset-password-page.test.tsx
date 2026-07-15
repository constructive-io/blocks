import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The page uses `next/navigation` — mock router + searchParams.
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams('reset_token=tok123&token=legacy&role_id=rid456')
}));

// Mock the ResetPasswordCard entirely: the page's responsibility is routing glue,
// not re-testing the card's form logic. Capture the props passed to the card.
let capturedProps: Record<string, unknown> = {};
vi.mock('@/blocks/auth/reset-password-card/reset-password-card', () => ({
  ResetPasswordCard: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid="reset-password-card-mock">Card</div>;
  }
}));

import ResetPasswordPage from './reset-password-page';

beforeEach(() => {
  pushMock.mockReset();
  capturedProps = {};
});

describe('ResetPasswordPage', () => {
  it('renders with the page layout data-slot', () => {
    render(<ResetPasswordPage />);
    expect(document.querySelector('[data-slot="reset-password-page"]')).not.toBeNull();
    expect(screen.getByTestId('reset-password-card-mock')).toBeInTheDocument();
  });

  it('passes token and roleId from searchParams to the card', () => {
    render(<ResetPasswordPage />);
    expect(capturedProps.token).toBe('tok123');
    expect(capturedProps.roleId).toBe('rid456');
  });

  it('passes the correct forgotPasswordPath and signInPath to the card', () => {
    render(<ResetPasswordPage />);
    expect(capturedProps.forgotPasswordPath).toBe('/forgot-password');
    expect(capturedProps.signInPath).toBe('/sign-in');
  });

  it('navigates to the sign-in path when the card fires onSuccess', async () => {
    render(<ResetPasswordPage />);
    // Simulate the card calling onSuccess (the page's routing seam).
    const onSuccess = capturedProps.onSuccess as () => void;
    expect(typeof onSuccess).toBe('function');
    onSuccess();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/sign-in'));
  });

  it('accepts a custom className on the page root', () => {
    render(<ResetPasswordPage className="test-class" />);
    const root = document.querySelector('[data-slot="reset-password-page"]');
    expect(root?.classList.contains('test-class')).toBe(true);
  });
});
