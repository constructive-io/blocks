'use client';

import { Suspense, useEffect, useState } from 'react';

import MagicLinkSentPage from '@/blocks/auth/magic-link-sent-page/magic-link-sent-page';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

/**
 * MagicLinkSentPage reads ?email= from useSearchParams() (Next.js only),
 * then falls back to sessionStorage. The docs harness has no URL params, so
 * we seed sessionStorage before the component mounts. Suspense is required
 * because the block calls useSearchParams() internally.
 */
const DEMO_EMAIL = 'demo@example.com';

function Inner({ outcome }: { outcome: Outcome }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('magic-link-email', DEMO_EMAIL);
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <MagicLinkSentPage
      className="min-h-0 py-0 px-0"
      onSubmit={async () => {
        if (outcome === 'error') throw new Error('RATE_LIMITED');
        return null;
      }}
    />
  );
}

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <Suspense fallback={null}>
        <Inner outcome={outcome} />
      </Suspense>
    </Demo>
  );
}
