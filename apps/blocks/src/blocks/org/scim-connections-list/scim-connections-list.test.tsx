import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Presentational stub: no generated hook is imported, so no module mock is needed.
// Tests verify the empty-state UI and the prop surface.

import { OrgScimConnectionsList } from './scim-connections-list';
import { defaultScimConnectionsListMessages } from './messages';

describe('OrgScimConnectionsList', () => {
  it('renders the card title and description', () => {
    render(<OrgScimConnectionsList orgId="org-1" />);
    expect(screen.getByText(defaultScimConnectionsListMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultScimConnectionsListMessages.description)).toBeInTheDocument();
  });

  it('renders the backend-pending empty state', () => {
    render(<OrgScimConnectionsList orgId="org-1" />);
    expect(screen.getByTestId('scim-connections-empty-state')).toBeInTheDocument();
    expect(screen.getByText(defaultScimConnectionsListMessages.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(defaultScimConnectionsListMessages.emptyDescription)).toBeInTheDocument();
  });

  it('renders the Backend Pending badge via messages catalog', () => {
    render(<OrgScimConnectionsList orgId="org-1" />);
    expect(screen.getByText(defaultScimConnectionsListMessages.backendPendingLabel)).toBeInTheDocument();
  });

  it('applies message overrides', () => {
    render(
      <OrgScimConnectionsList
        orgId="org-1"
        messages={{ title: 'My SCIM Title', emptyTitle: 'Coming soon' }}
      />
    );
    expect(screen.getByText('My SCIM Title')).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    // Description is unchanged
    expect(screen.getByText(defaultScimConnectionsListMessages.description)).toBeInTheDocument();
  });

  it('applies the data-slot attribute', () => {
    const { container } = render(<OrgScimConnectionsList orgId="org-1" />);
    expect(container.querySelector('[data-slot="scim-connections-list"]')).toBeInTheDocument();
  });

  it('merges className onto the root Card element', () => {
    const { container } = render(
      <OrgScimConnectionsList orgId="org-1" className="custom-class" />
    );
    const card = container.querySelector('[data-slot="scim-connections-list"]');
    expect(card).toHaveClass('custom-class');
  });

  it('accepts typed onError callback without TypeScript errors', () => {
    const onError = vi.fn<(err: { message: string; code: string }) => void>();
    // Smoke test: component renders without error when onError is provided
    render(<OrgScimConnectionsList orgId="org-1" onError={onError} />);
    expect(screen.getByTestId('scim-connections-empty-state')).toBeInTheDocument();
    // onError is a no-op stub — it is not called during render
    expect(onError).not.toHaveBeenCalled();
  });

  it('merges error message overrides via errors sub-object', () => {
    render(
      <OrgScimConnectionsList
        orgId="org-1"
        messages={{
          errors: { PROCEDURE_NOT_FOUND: 'Custom not found message' }
        }}
      />
    );
    // Component renders successfully with partial error override
    expect(screen.getByTestId('scim-connections-empty-state')).toBeInTheDocument();
  });
});
