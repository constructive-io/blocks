'use client';

/**
 * PreviewProvider — docs-only host wiring for a single live block preview.
 *
 * Mirrors what `blocks-runtime` does for a real host (mounts a `QueryClient` and
 * calls the generated `configure()`), but points the SDK at `DocsMockAdapter` so
 * the preview runs fully offline. Every preview needs this even for mutation
 * blocks: blocks instantiate their generated hook at render time (e.g.
 * `useSignInMutation`), which requires a `QueryClient` in context — the
 * `onSubmit` override only replaces the network call inside `mutateAsync`.
 *
 * Never imported by block source — docs only.
 */

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PortalRoot } from '@constructive-io/ui';

import { configure as configureAuth } from '@/generated/auth';
import { configure as configureAdmin } from '@/generated/admin';

import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';

import { DocsMockAdapter } from './docs-mock-adapter';

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    // configure() is a global singleton on each generated module. Calling it in
    // this initializer runs once, during render, before any child query mounts —
    // so a mount-time query never hits an unconfigured client. Idempotent across
    // PreviewProvider instances. We configure BOTH namespaces (auth + admin) so
    // admin-namespace blocks (org-app-memberships, org-roles-editor,
    // user-context-switcher) resolve against the mock too — mirrors blocks-runtime.
    const adapter = new DocsMockAdapter();
    configureAuth({ adapter });
    configureAdmin({ adapter });
    return new QueryClient({
      defaultOptions: {
        // Previews are static: no retries, no refocus refetch, never stale.
        queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
  });

  // StepUpProvider mounts here (inside the QueryClient) so any showcased block that
  // calls useStepUp() resolves against the docs mock adapter — mirroring a real host's
  // app shell. Demos that wrap their own StepUpProvider just nest harmlessly.
  // PortalRoot mounts the #portal-root container that @constructive-io/ui Dialogs/
  // DropdownMenus/Command palettes portal into (via useRootPortalContainer →
  // getElementById). The docs app shell has no PortalRoot, so without this every
  // dialog/modal/menu block was inert on open. One per preview is enough.
  return (
    <QueryClientProvider client={queryClient}>
      <StepUpProvider>
        {children}
        <PortalRoot />
      </StepUpProvider>
    </QueryClientProvider>
  );
}
