import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// No @/generated import — this is a presentational stub block with no data binding.
// There is no hook to mock (sdk-binding-contract.md §7: presentational blocks ship no requires.json).

import { SsoSetupCard } from './sso-setup-card';
import { defaultSsoSetupCardMessages } from './messages';

describe('SsoSetupCard', () => {
  it('renders the card title and description', () => {
    render(<SsoSetupCard orgId="org-1" />);
    expect(screen.getByText(defaultSsoSetupCardMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultSsoSetupCardMessages.description)).toBeInTheDocument();
  });

  it('renders the coming-soon notice with the correct text', () => {
    render(<SsoSetupCard orgId="org-1" />);
    const notice = screen.getByTestId('coming-soon-notice');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(defaultSsoSetupCardMessages.comingSoonBody);
  });

  it('renders the coming-soon badge', () => {
    render(<SsoSetupCard orgId="org-1" />);
    expect(screen.getByTestId('coming-soon-badge')).toHaveTextContent(
      defaultSsoSetupCardMessages.comingSoonHeading
    );
  });

  it('lists the planned SSO protocols', () => {
    render(<SsoSetupCard orgId="org-1" />);
    expect(screen.getByText(defaultSsoSetupCardMessages.oidcLabel)).toBeInTheDocument();
    expect(screen.getByText(defaultSsoSetupCardMessages.samlLabel)).toBeInTheDocument();
  });

  it('renders the protocols section label and aria-label from the message catalog', () => {
    render(<SsoSetupCard orgId="org-1" />);
    expect(screen.getByText(defaultSsoSetupCardMessages.protocolsSectionLabel)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: defaultSsoSetupCardMessages.protocolsAriaLabel })).toBeInTheDocument();
  });

  it('merges message overrides while preserving un-overridden defaults', () => {
    render(
      <SsoSetupCard
        orgId="org-1"
        messages={{ title: 'Enterprise SSO', comingSoonHeading: 'Soon' }}
      />
    );
    expect(screen.getByText('Enterprise SSO')).toBeInTheDocument();
    // Un-overridden default still present
    expect(screen.getByText(defaultSsoSetupCardMessages.description)).toBeInTheDocument();
  });

  it('accepts a className and applies it to the card root', () => {
    const { container } = render(<SsoSetupCard orgId="org-1" className="custom-class" />);
    const card = container.querySelector('[data-slot="sso-setup-card"]');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('custom-class');
  });

  it('sets data-slot="sso-setup-card" on the root element', () => {
    const { container } = render(<SsoSetupCard orgId="org-1" />);
    expect(container.querySelector('[data-slot="sso-setup-card"]')).toBeInTheDocument();
  });
});
