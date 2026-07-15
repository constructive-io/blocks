import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the card dependency — the page is thin glue; we verify it passes props
// correctly without re-testing the card's own data logic.
vi.mock('@/blocks/auth/forgot-password-card/forgot-password-card', () => ({
  ForgotPasswordCard: (props: {
    defaultEmail?: string;
    signInHref?: string;
    className?: string;
  }) => (
    <div
      data-testid="forgot-password-card"
      data-default-email={props.defaultEmail ?? ''}
      data-sign-in-href={props.signInHref ?? ''}
    />
  )
}));

// Mock next/navigation's useSearchParams — the page reads `?email=` from it.
const searchParamsMock = new Map<string, string>();
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => searchParamsMock.get(key) ?? null
  })
}));

import ForgotPasswordPage from './forgot-password-page';

describe('ForgotPasswordPage', () => {
  it('renders the centered layout with a <main> landmark and the forgot-password-card', () => {
    render(<ForgotPasswordPage />);

    const main = document.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('data-slot', 'forgot-password-page');
    expect(screen.getByTestId('forgot-password-card')).toBeInTheDocument();
  });

  it('passes the SIGN_IN_PATH constant as signInHref to the card', () => {
    render(<ForgotPasswordPage />);

    const card = screen.getByTestId('forgot-password-card');
    // SIGN_IN_PATH defaults to '/auth/sign-in' in the shipped page
    expect(card).toHaveAttribute('data-sign-in-href', '/auth/sign-in');
  });

  it('passes no defaultEmail when the ?email= searchParam is absent', () => {
    searchParamsMock.clear();
    render(<ForgotPasswordPage />);

    const card = screen.getByTestId('forgot-password-card');
    expect(card).toHaveAttribute('data-default-email', '');
  });

  it('pre-fills defaultEmail from the ?email= searchParam', () => {
    searchParamsMock.set('email', 'user@example.com');
    render(<ForgotPasswordPage />);

    const card = screen.getByTestId('forgot-password-card');
    expect(card).toHaveAttribute('data-default-email', 'user@example.com');

    searchParamsMock.clear();
  });
});
