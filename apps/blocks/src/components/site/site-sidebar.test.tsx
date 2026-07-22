import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

import { usePathname } from 'next/navigation';

import { SiteSidebar } from './site-sidebar';

const mockUsePathname = vi.mocked(usePathname);

beforeEach(() => {
  mockUsePathname.mockReturnValue('/');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SiteSidebar application routes', () => {
  it('expands the application section and marks the current feature pack', () => {
    mockUsePathname.mockReturnValue('/blocks/features/organizations/');
    render(<SiteSidebar />);

    expect(screen.getByRole('button', { name: /Application/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Organizations' })).toHaveAttribute('aria-current', 'page');
  });

  it('does not treat a sibling path with the same prefix as a feature route', () => {
    mockUsePathname.mockReturnValue('/blocks/featureship');
    render(<SiteSidebar />);

    expect(screen.getByRole('button', { name: /Application/i })).toHaveAttribute('aria-expanded', 'false');
  });
});
