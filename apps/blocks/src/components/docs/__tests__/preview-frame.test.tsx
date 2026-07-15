import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PreviewFrame } from '@/components/docs/preview-frame';

const previewHarness = vi.hoisted(() => ({ nextProviderId: 0 }));

vi.mock('../preview-provider', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    PreviewProvider: ({ children }: { children: React.ReactNode }) => {
      const [providerId] = React.useState(() => ++previewHarness.nextProviderId);
      return React.createElement('div', { 'data-preview-provider': providerId }, children);
    },
  };
});

let shouldThrow = true;

function ThrowingDemo() {
  if (shouldThrow) {
    throw new Error('secret-token-from-demo');
  }
  return <p>Recovered live preview</p>;
}

beforeEach(() => {
  previewHarness.nextProviderId = 0;
  shouldThrow = true;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PreviewFrame render isolation', () => {
  it('contains one failing preview without exposing its error or affecting siblings', () => {
    render(
      <main>
        <h1>Blocks documentation</h1>
        <PreviewFrame>
          <ThrowingDemo />
        </PreviewFrame>
        <PreviewFrame>
          <p>Independent live preview</p>
        </PreviewFrame>
      </main>
    );

    const fallback = screen.getByRole('alert');
    expect(fallback).toHaveTextContent('Preview unavailable');
    expect(fallback).toHaveTextContent('Use Reset to try again');
    expect(fallback).not.toHaveTextContent('secret-token-from-demo');
    expect(fallback.closest('[data-preview-provider]')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Blocks documentation' })).toBeInTheDocument();
    expect(screen.getByText('Independent live preview')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('secret-token-from-demo');
    expect(document.querySelectorAll('[data-preview-provider]')).toHaveLength(2);
  });

  it('uses the registered reset to remount the provider, boundary, and recovered demo', () => {
    let reset: (() => void) | undefined;
    const registerReset = vi.fn((nextReset: () => void) => {
      reset = nextReset;
    });

    render(
      <PreviewFrame onReset={registerReset}>
        <ThrowingDemo />
      </PreviewFrame>
    );

    const failedProviderId = screen.getByRole('alert').closest('[data-preview-provider]')?.getAttribute(
      'data-preview-provider'
    );
    expect(registerReset).toHaveBeenCalledOnce();
    expect(reset).toBeTypeOf('function');

    shouldThrow = false;
    act(() => reset?.());

    const recovered = screen.getByText('Recovered live preview');
    const recoveredProviderId = recovered.closest('[data-preview-provider]')?.getAttribute('data-preview-provider');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(recoveredProviderId).not.toBe(failedProviderId);
    expect(registerReset).toHaveBeenCalledOnce();
  });
});
