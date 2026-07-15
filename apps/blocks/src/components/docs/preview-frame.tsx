'use client';

/**
 * PreviewFrame — the live-block mount boundary (DESIGN.md §7.1).
 *
 * Reduced to its load-bearing job: mount the children inside `PreviewProvider`
 * (so the block's generated hooks resolve against the docs mock adapter), keep
 * them `not-prose` (the doc `.prose` flow must not bleed into a live block), and
 * own the reset-by-key-bump — bumping the wrapper key remounts the subtree, the
 * simplest state-free reset.
 *
 * The visible chrome now lives in <ComponentPreview> (the card, tabs, preview
 * well). This frame no longer draws a stage bar, a dotted backdrop, or a
 * per-preview light/dark toggle — the site theme lives in the right panel. The
 * reset CONTROL is re-homed into the ComponentPreview header: this frame just
 * exposes its reset fn upward via `onReset`, so the header ghost button can fire
 * it across the client-only `next/dynamic` boundary.
 *
 * Docs harness only — never imported by block source.
 */

import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { PreviewProvider } from './preview-provider';

export type PreviewFrameProps = {
  children: ReactNode;
  /** Classes for the mount wrapper (rarely needed — the well supplies layout). */
  className?: string;
  /** Classes for the keyed content wrapper around `children`. */
  contentClassName?: string;
  /** Registers this frame's reset fn with a parent (e.g. the ComponentPreview header). */
  onReset?: (reset: () => void) => void;
};

type PreviewErrorBoundaryState = {
  error: Error | null;
};

function PreviewErrorFallback() {
  return (
    <div
      role="alert"
      className="flex min-h-40 w-full flex-col items-center justify-center rounded-lg border border-border/60 bg-card p-6 text-center"
    >
      <p className="text-sm font-medium text-foreground">Preview unavailable</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        This live preview could not be displayed. Use Reset to try again.
      </p>
    </div>
  );
}

class PreviewErrorBoundary extends Component<{ children: ReactNode }, PreviewErrorBoundaryState> {
  state: PreviewErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PreviewErrorBoundaryState {
    return { error };
  }

  componentDidCatch(_error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[PreviewFrame] Live preview failed to render.', {
        componentStack: errorInfo.componentStack,
      });
    }
  }

  render() {
    if (this.state.error) return <PreviewErrorFallback />;
    return this.props.children;
  }
}

export function PreviewFrame({ children, className, contentClassName, onReset }: PreviewFrameProps) {
  // Bumping the key remounts the subtree — the simplest, state-free reset.
  const [nonce, setNonce] = useState(0);

  // Publish the reset fn upward once. `setNonce` is stable and `onReset` is
  // memoised by the caller, so this registers a single time.
  useEffect(() => {
    onReset?.(() => setNonce((n) => n + 1));
  }, [onReset]);

  return (
    <div className={cn('not-prose w-full', className)}>
      <div key={nonce} className={cn('w-full', contentClassName)}>
        <PreviewProvider>
          <PreviewErrorBoundary>{children}</PreviewErrorBoundary>
        </PreviewProvider>
      </div>
    </div>
  );
}
