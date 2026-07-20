import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { RegistryHero } from './registry-hero';

afterEach(cleanup);

describe('RegistryHero', () => {
  it('explains source ownership without a multi-step stack diagram', () => {
    const { container } = render(<RegistryHero />);

    expect(screen.getByRole('heading', { level: 1, name: 'Build the product on Constructive.' })).toBeVisible();
    expect(screen.getByText('Every block becomes your code.')).toBeVisible();
    expect(screen.getByText('Copy only what you need, then shape it into your product.')).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Constructive application stack' })).not.toBeInTheDocument();
    expect(container.querySelectorAll('.hero-source-mark path')).toHaveLength(2);
    expect(container.querySelectorAll('.hero-source-mark circle')).toHaveLength(1);
    expect(container.querySelector('.hero-source-mark rect, .hero-source-mark image')).not.toBeInTheDocument();
    expect(screen.queryByText(/PostgreSQL/i)).not.toBeInTheDocument();
  });

  it('describes source-installed registry distribution without vanity metrics', () => {
    render(<RegistryHero />);

    expect(screen.getByText('Source copied')).toBeInTheDocument();
    expect(screen.getByLabelText('Theme included')).toBeInTheDocument();
    expect(screen.queryByText('color space')).not.toBeInTheDocument();
    expect(screen.queryByText('focus rings')).not.toBeInTheDocument();
  });
});
