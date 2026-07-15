import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// This is a v2 STUB (presentational only). No generated hook is imported, so
// there is no `@/generated/*` mock — sdk-binding-contract.md §7.
import { OrgScimSetupGuide } from './scim-setup-guide';
import { defaultOrgScimSetupGuideMessages } from './messages';

const BASE_PROPS = {
  orgId: 'org-abc-123',
  scimBaseUrl: 'https://scim.example.com'
};

describe('OrgScimSetupGuide', () => {
  it('renders the card title and description', () => {
    render(<OrgScimSetupGuide {...BASE_PROPS} />);
    expect(screen.getByText(defaultOrgScimSetupGuideMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultOrgScimSetupGuideMessages.description)).toBeInTheDocument();
  });

  it('shows the deferred backend banner', () => {
    render(<OrgScimSetupGuide {...BASE_PROPS} />);
    expect(screen.getByText(defaultOrgScimSetupGuideMessages.deferredBannerTitle)).toBeInTheDocument();
    expect(screen.getByText(defaultOrgScimSetupGuideMessages.deferredBannerBody)).toBeInTheDocument();
  });

  it('renders the preview badge', () => {
    render(<OrgScimSetupGuide {...BASE_PROPS} />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('builds the SCIM endpoint URL from scimBaseUrl + orgId', () => {
    render(<OrgScimSetupGuide {...BASE_PROPS} />);
    expect(screen.getByText('https://scim.example.com/scim/v2/org-abc-123')).toBeInTheDocument();
  });

  it('renders a placeholder when scimBaseUrl is omitted', () => {
    render(<OrgScimSetupGuide orgId="org-xyz" />);
    expect(screen.getByText('<your-scim-endpoint>/scim/v2/org-xyz')).toBeInTheDocument();
  });

  it('renders all five provider selector buttons', () => {
    render(<OrgScimSetupGuide {...BASE_PROPS} />);
    expect(screen.getByTestId('provider-okta')).toBeInTheDocument();
    expect(screen.getByTestId('provider-azure-ad')).toBeInTheDocument();
    expect(screen.getByTestId('provider-jumpcloud')).toBeInTheDocument();
    expect(screen.getByTestId('provider-google-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('provider-generic')).toBeInTheDocument();
  });

  it('defaults to the okta provider', () => {
    render(<OrgScimSetupGuide {...BASE_PROPS} />);
    // The active provider button uses "default" variant — test by link text in docs section
    expect(screen.getByText(/Okta SCIM docs/i)).toBeInTheDocument();
  });

  it('switches provider on button click', async () => {
    const user = userEvent.setup();
    render(<OrgScimSetupGuide {...BASE_PROPS} />);

    await user.click(screen.getByTestId('provider-azure-ad'));
    await waitFor(() => expect(screen.getByText(/Entra ID SCIM docs/i)).toBeInTheDocument());
  });

  it('renders the attribute mappings table', () => {
    render(<OrgScimSetupGuide {...BASE_PROPS} />);
    expect(screen.getByTestId('attribute-mappings-table')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByText('userName / emails[0].value')).toBeInTheDocument();
  });

  it('respects the provider prop to set the initial active provider', () => {
    render(<OrgScimSetupGuide {...BASE_PROPS} provider="jumpcloud" />);
    expect(screen.getByText(/JumpCloud SCIM docs/i)).toBeInTheDocument();
  });

  it('applies message overrides', () => {
    render(
      <OrgScimSetupGuide
        {...BASE_PROPS}
        messages={{ title: 'Custom SCIM Guide', deferredBannerTitle: 'Coming soon' }}
      />
    );
    expect(screen.getByText('Custom SCIM Guide')).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });

  it('sets data-slot="scim-setup-guide" on the root element', () => {
    const { container } = render(<OrgScimSetupGuide {...BASE_PROPS} />);
    expect(container.querySelector('[data-slot="scim-setup-guide"]')).toBeInTheDocument();
  });

  it('applies the className prop to the root card', () => {
    const { container } = render(<OrgScimSetupGuide {...BASE_PROPS} className="custom-class" />);
    const root = container.querySelector('[data-slot="scim-setup-guide"]');
    expect(root).toHaveClass('custom-class');
  });

  it('calls onError when clipboard write fails', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    // jsdom exposes clipboard as a getter — use defineProperty to override it
    // so we can simulate a rejection without the "only a getter" TypeError.
    const writeSpy = vi.fn().mockRejectedValue(new Error('ClipboardError'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeSpy },
      writable: true,
      configurable: true
    });

    render(<OrgScimSetupGuide {...BASE_PROPS} onError={onError} />);
    await user.click(screen.getByTestId('copy-button'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
