'use client';

import { Suspense, useState } from 'react';

import { SignUpCard, type SignUpResult } from '@/blocks/auth/sign-up-card/sign-up-card';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

/**
 * The sign-up-page block is pure page-glue: a centered <main> that passes
 * signInHref + onSuccess into SignUpCard, and wires router.push() inside
 * handleSuccess. The page calls useRouter() and useSearchParams() (Next.js
 * only) so we cannot render it directly in the docs harness — instead we
 * render the card it composes, wrapped in the same centering layout the page
 * provides, so the preview is visually equivalent. The onSubmit seam returns
 * a stub SignUpResult so no network call or navigation occurs.
 */
export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      {/* Replicate the page's centering layout */}
      <main
        data-slot="sign-up-page"
        className="flex w-full items-center justify-center px-4 py-8"
      >
        <Suspense fallback={null}>
          <SignUpCard
            signInHref="#"
            onSubmit={async () => {
              if (outcome === 'error') throw new Error('email-taken');
              return {
                id: 'demo-id',
                userId: 'demo-user-id',
                accessToken: 'demo-token',
                accessTokenExpiresAt: null,
                isVerified: true,
                totpEnabled: false,
              } satisfies SignUpResult;
            }}
          />
        </Suspense>
      </main>
    </Demo>
  );
}
