/**
 * domain-verification-step tests
 *
 * v2 STUB — presentational only; no generated hook, no network calls.
 * There is no `@/generated/auth` mock needed because this block imports nothing
 * from the generated SDK (sdk-binding-contract.md: presentational blocks
 * carry no requires.json and no generated-hook import).
 *
 * Tests verify:
 *  1. Block renders with the required props.
 *  2. TXT record values are derived from the props.
 *  3. The deferred-backend notice is visible.
 *  4. The "Check now" button is present.
 *  5. The copy buttons are present.
 *  6. Custom message overrides apply.
 *  7. `data-slot` attribute is correct.
 *  8. Callback props (onVerified, onTimeout, onError, onMessage) are accepted
 *     and are NOT spuriously fired during a normal stub render (happy path).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuthDomainVerificationStep } from './domain-verification-step';
import { defaultAuthDomainVerificationStepMessages } from './messages';

const DEFAULT_PROPS = {
  ssoProviderId: 'sso-uuid-123',
  domain: 'acme.com'
};

// navigator.clipboard.writeText is not available in jsdom; stub it once so the
// component's handleCopy does not throw. The property is configurable in jsdom
// when defined with defineProperty.
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  configurable: true,
  writable: true
});

describe('AuthDomainVerificationStep', () => {
  it('renders title, description, and deferred notice', () => {
    render(<AuthDomainVerificationStep {...DEFAULT_PROPS} />);

    expect(screen.getByText(defaultAuthDomainVerificationStepMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultAuthDomainVerificationStepMessages.description)).toBeInTheDocument();
    expect(screen.getByText(defaultAuthDomainVerificationStepMessages.deferredNotice)).toBeInTheDocument();
  });

  it('derives TXT record name from the domain prop', () => {
    render(<AuthDomainVerificationStep {...DEFAULT_PROPS} />);

    expect(screen.getByText('_constructive-verify.acme.com')).toBeInTheDocument();
  });

  it('derives TXT record value from the ssoProviderId prop', () => {
    render(<AuthDomainVerificationStep {...DEFAULT_PROPS} />);

    expect(
      screen.getByText(`constructive-domain-verification=${DEFAULT_PROPS.ssoProviderId}`)
    ).toBeInTheDocument();
  });

  it('renders the "Check now" button', () => {
    render(<AuthDomainVerificationStep {...DEFAULT_PROPS} />);

    expect(screen.getByTestId('domain-verification-check-now')).toBeInTheDocument();
    expect(screen.getByTestId('domain-verification-check-now')).toHaveTextContent(
      defaultAuthDomainVerificationStepMessages.checkNowLabel
    );
  });

  it('renders copy buttons for both TXT fields', () => {
    render(<AuthDomainVerificationStep {...DEFAULT_PROPS} />);

    const copyButtons = screen.getAllByText(defaultAuthDomainVerificationStepMessages.copyLabel);
    expect(copyButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('shows "Copied!" feedback after clicking a copy button', async () => {
    const user = userEvent.setup();
    render(<AuthDomainVerificationStep {...DEFAULT_PROPS} />);

    const copyButtons = screen.getAllByText(defaultAuthDomainVerificationStepMessages.copyLabel);
    await user.click(copyButtons[0]);

    // The component transitions to "Copied!" on a successful clipboard write.
    await waitFor(() =>
      expect(screen.getAllByText(defaultAuthDomainVerificationStepMessages.copiedLabel).length).toBeGreaterThan(0)
    );
  });

  it('applies message overrides', () => {
    render(
      <AuthDomainVerificationStep
        {...DEFAULT_PROPS}
        messages={{ title: 'Custom title', deferredNotice: 'Custom deferred notice' }}
      />
    );

    expect(screen.getByText('Custom title')).toBeInTheDocument();
    expect(screen.getByText('Custom deferred notice')).toBeInTheDocument();
    // Non-overridden key falls back to default
    expect(screen.getByText(defaultAuthDomainVerificationStepMessages.description)).toBeInTheDocument();
  });

  it('sets data-slot="domain-verification-step" on the root element', () => {
    const { container } = render(<AuthDomainVerificationStep {...DEFAULT_PROPS} />);

    const root = container.querySelector('[data-slot="domain-verification-step"]');
    expect(root).not.toBeNull();
  });

  it('accepts and applies a custom className', () => {
    const { container } = render(
      <AuthDomainVerificationStep {...DEFAULT_PROPS} className="test-custom-class" />
    );

    const root = container.querySelector('[data-slot="domain-verification-step"]');
    expect(root).toHaveClass('test-custom-class');
  });

  it('renders waiting status badge by default', () => {
    render(<AuthDomainVerificationStep {...DEFAULT_PROPS} />);

    expect(
      screen.getByText(defaultAuthDomainVerificationStepMessages.statusWaiting)
    ).toBeInTheDocument();
  });

  it('accepts onVerified, onTimeout, onError, onMessage props without TS errors and does not fire them during a stub render (happy path)', () => {
    const onVerified = vi.fn();
    const onTimeout = vi.fn();
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(
      <AuthDomainVerificationStep
        {...DEFAULT_PROPS}
        onVerified={onVerified}
        onTimeout={onTimeout}
        onError={onError}
        onMessage={onMessage}
      />
    );

    // The stub never fires callbacks — all should remain at zero calls.
    expect(onVerified).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('each copy button independently shows "Copied!" without affecting the other', async () => {
    const user = userEvent.setup();
    render(<AuthDomainVerificationStep {...DEFAULT_PROPS} />);

    const copyButtons = screen.getAllByText(defaultAuthDomainVerificationStepMessages.copyLabel);
    expect(copyButtons).toHaveLength(2);

    // Click the first copy button (TXT record name).
    await user.click(copyButtons[0]);

    await waitFor(() => {
      const copiedButtons = screen.getAllByText(defaultAuthDomainVerificationStepMessages.copiedLabel);
      // Only one button should show "Copied!" — the other should still read "Copy".
      expect(copiedButtons).toHaveLength(1);
      expect(screen.getAllByText(defaultAuthDomainVerificationStepMessages.copyLabel)).toHaveLength(1);
    });
  });
});
