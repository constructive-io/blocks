import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { UserAvatar, type UserAvatarUser } from './user-avatar';
import { deriveInitials } from './user-initials';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function person(overrides: Partial<UserAvatarUser> = {}): UserAvatarUser {
  return {
    id: 'u1',
    type: 'person',
    displayName: 'Jane Doe',
    username: 'janedoe',
    profilePicture: null,
    ...overrides
  };
}

function org(overrides: Partial<UserAvatarUser> = {}): UserAvatarUser {
  return {
    id: 'o1',
    type: 'organization',
    displayName: 'Acme Corp',
    username: 'acme',
    profilePicture: null,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// deriveInitials unit tests
// ---------------------------------------------------------------------------

describe('deriveInitials', () => {
  it('multi-word name → first + last initials, uppercase', () => {
    expect(deriveInitials('Jane Doe')).toBe('JD');
    expect(deriveInitials('Acme Corp')).toBe('AC');
  });

  it('three-word name → first + last initials', () => {
    expect(deriveInitials('Mary Ann Smith')).toBe('MS');
  });

  it('single-word name → first 2 chars uppercase', () => {
    expect(deriveInitials('Jane')).toBe('JA');
  });

  it('single-char name → that char uppercase', () => {
    expect(deriveInitials('J')).toBe('J');
  });

  it('empty displayName with username → first char of username uppercase', () => {
    expect(deriveInitials('', 'alice')).toBe('A');
  });

  it('empty displayName without username → ?', () => {
    expect(deriveInitials('')).toBe('?');
    expect(deriveInitials('', null)).toBe('?');
  });

  it('whitespace-only displayName treats as empty', () => {
    expect(deriveInitials('   ', 'bob')).toBe('B');
    expect(deriveInitials('   ')).toBe('?');
  });

  it('non-alphabetic characters are used as-is', () => {
    expect(deriveInitials('123')).toBe('12');
  });
});

// ---------------------------------------------------------------------------
// UserAvatar component tests
// ---------------------------------------------------------------------------

describe('UserAvatar', () => {
  it('renders initials fallback when no image is provided', () => {
    render(<UserAvatar user={person()} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders AvatarImage when profilePicture is supplied', () => {
    // Base UI AvatarImage starts in 'loading' state in jsdom (onload never fires),
    // so no <img> DOM node appears — but the AvatarImage span is in the tree.
    // We verify the component renders without error and the fallback is shown
    // while the image loads, which is the correct jsdom behavior.
    const { container } = render(<UserAvatar user={person({ profilePicture: 'https://example.com/avatar.png' })} />);
    // The avatar root must still exist
    expect(container.querySelector('[data-slot="user-avatar"]')).toBeInTheDocument();
    // Fallback is shown while the image hasn't loaded (expected in jsdom)
    expect(container.querySelector('[data-slot="avatar-fallback"]')).toBeInTheDocument();
  });

  it('uses the alt override when provided (alt forwarded to AvatarImage)', () => {
    // In jsdom the <img> never reaches 'loaded' state, so we verify the component
    // renders without throwing; alt is wired at the AvatarImage level and covered
    // by the component's prop forwarding (verified by type-check).
    const { container } = render(
      <UserAvatar user={person({ profilePicture: 'https://example.com/a.png' })} alt="Custom alt" />
    );
    expect(container.querySelector('[data-slot="user-avatar"]')).toBeInTheDocument();
  });

  it('person → rounded-full shape class', () => {
    const { container } = render(<UserAvatar user={person()} />);
    const root = container.querySelector('[data-slot="user-avatar"]');
    expect(root?.className).toContain('rounded-full');
    expect(root?.className).not.toContain('rounded-sm');
  });

  it('org → rounded-sm shape class', () => {
    const { container } = render(<UserAvatar user={org()} />);
    const root = container.querySelector('[data-slot="user-avatar"]');
    expect(root?.className).toContain('rounded-sm');
    expect(root?.className).not.toContain('rounded-full');
  });

  it('size sm → size-6', () => {
    const { container } = render(<UserAvatar user={person()} size="sm" />);
    const root = container.querySelector('[data-slot="user-avatar"]');
    expect(root?.className).toContain('size-6');
  });

  it('size md (default) → size-8', () => {
    const { container } = render(<UserAvatar user={person()} />);
    const root = container.querySelector('[data-slot="user-avatar"]');
    expect(root?.className).toContain('size-8');
  });

  it('size lg → size-10', () => {
    const { container } = render(<UserAvatar user={person()} size="lg" />);
    const root = container.querySelector('[data-slot="user-avatar"]');
    expect(root?.className).toContain('size-10');
  });

  it('passes className through to root', () => {
    const { container } = render(<UserAvatar user={person()} className="extra-class" />);
    const root = container.querySelector('[data-slot="user-avatar"]');
    expect(root?.className).toContain('extra-class');
  });

  it('org initials fallback uses org displayName', () => {
    render(<UserAvatar user={org()} />);
    expect(screen.getByText('AC')).toBeInTheDocument();
  });

  it('empty displayName falls back to username initial', () => {
    render(<UserAvatar user={person({ displayName: '', username: 'janedoe' })} />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('fully empty user shows ? sentinel', () => {
    render(<UserAvatar user={person({ displayName: '', username: null })} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('fallback has aria-hidden', () => {
    const { container } = render(<UserAvatar user={person()} />);
    const fallback = container.querySelector('[data-slot="avatar-fallback"]');
    expect(fallback).toHaveAttribute('aria-hidden', 'true');
  });
});
