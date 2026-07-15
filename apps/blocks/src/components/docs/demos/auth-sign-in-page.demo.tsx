'use client';

/**
 * auth-sign-in-page demo — docs-only live preview.
 *
 * SignInPage is a thin Next.js page wrapper: it composes SignInCard into a
 * centered full-viewport layout and wires the router on success. This demo
 * renders the full layout composition so the docs preview shows the realistic
 * page experience without triggering navigation.
 *
 * The block exposes no override seam (it owns the router wiring), so the
 * preview renders the block as-is. The form is fully interactive; submitting
 * shows the block's own invalid-credentials error path (the mock adapter
 * resolves signIn to an empty payload, which the card surfaces as an error).
 */

import { Suspense } from 'react';

import SignInPage from '@/blocks/auth/sign-in-page/sign-in-page';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      {/* Suspense is required: SignInPage calls useSearchParams() internally. */}
      <Suspense fallback={null}>
        <SignInPage className="min-h-0 py-0 px-0" />
      </Suspense>
    </Demo>
  );
}
