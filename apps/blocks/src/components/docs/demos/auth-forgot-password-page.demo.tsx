'use client';

import { Suspense, useState } from 'react';

import { ForgotPasswordCard } from '@/blocks/auth/forgot-password-card/forgot-password-card';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

/**
 * The forgot-password-page block is pure page-glue: a centered <main> that
 * passes ?email= + signInHref into ForgotPasswordCard. The page calls
 * useSearchParams() (Next.js only) so we cannot render the default export
 * directly in the docs harness — instead we render the card it composes,
 * wrapped in the same centering layout the page provides, so the preview is
 * visually equivalent.
 */
export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      {/* Replicate the page's centering layout */}
      <main
        data-slot="forgot-password-page"
        className="flex w-full items-center justify-center px-4 py-8"
      >
        <Suspense fallback={null}>
          <ForgotPasswordCard
            defaultEmail="ada@example.com"
            signInHref="#"
            onSubmit={async () => {
              if (outcome === 'error') throw new Error('rate-limited');
            }}
          />
        </Suspense>
      </main>
    </Demo>
  );
}
