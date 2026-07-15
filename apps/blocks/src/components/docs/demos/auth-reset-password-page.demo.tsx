'use client';

import { Suspense, useState } from 'react';

import { ResetPasswordCard } from '@/blocks/auth/reset-password-card/reset-password-card';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

/**
 * Demo for auth-reset-password-page.
 *
 * NOTE: auth-reset-password-page is a thin Next.js 15 page wrapper whose only
 * public prop is `className`. It reads `?token=` and `?role_id=` from
 * useSearchParams, constructs an onSuccess handler that calls router.push(), and
 * renders ResetPasswordCard inside a Suspense boundary. Because the page exposes
 * no `onSubmit` seam, the live-preview renders ResetPasswordCard directly — the
 * same component the page composes — in the identical centering layout the page
 * provides. Props are hard-coded to the values the page would pass from the URL,
 * and onSubmit is wired to resolve offline. This is the documented strategy for
 * page-level wrapper blocks that delegate all logic to their inner card.
 */
export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      {/* Replicate the page's centering layout (data-slot matches the page's <main>) */}
      <main
        data-slot="reset-password-page"
        className="flex w-full items-center justify-center p-4"
      >
        <Suspense fallback={null}>
          <ResetPasswordCard
            roleId="role_demo"
            token="tok_demo_abc123"
            forgotPasswordPath="#"
            signInPath="#"
            onSubmit={async () => {
              // true → success state; false → expired/invalid-token state
              return outcome === 'success' ? true : false;
            }}
          />
        </Suspense>
      </main>
    </Demo>
  );
}
