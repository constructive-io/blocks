'use client';

/**
 * auth-mfa-totp-challenge-page demo — docs-only live preview.
 *
 * MfaTotpChallengePage is a thin Next.js page wrapper: it reads ?token= from
 * useSearchParams() and composes <MfaTotpChallenge> inside a centered layout.
 * Rather than manipulating the URL, we render the inner card it composes
 * directly (mirror of auth-forgot-password-page.demo pattern) so the 6-digit
 * code form is always visible and the outcome toggle works fully offline.
 *
 * States:
 *   ready         — MfaTotpChallenge card with a mock onSubmit seam
 *   expired       — error card (EXPIRED_TOKEN) the page shows after the card
 *                   fires onError; rendered directly so it isn't width-constrained
 *   missing-token — error card the page shows when ?token= is absent
 */

import { useState } from 'react';

import { Card, CardContent, CardHeader, CardDescription } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';

import { MfaTotpChallenge } from '@/blocks/auth/mfa-totp-challenge/mfa-totp-challenge';
import type { MfaChallengeResult, MfaTotpChallengeVars } from '@/blocks/auth/mfa-totp-challenge/mfa-totp-challenge';
import { Demo, Segmented } from '@/components/docs/showcase-kit';

type State = 'ready' | 'expired' | 'missing-token';
const STATES: readonly State[] = ['ready', 'expired', 'missing-token'];

const MOCK_RESULT: MfaChallengeResult = {
  session: {
    id: 'sess_demo_00000000',
    accessToken: 'demo.jwt.token',
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  },
  user: { id: 'usr_demo_00000000' },
};

export function BlockDemo() {
  const [state, setState] = useState<State>('ready');

  async function onSubmit(_vars: MfaTotpChallengeVars): Promise<MfaChallengeResult> {
    return MOCK_RESULT;
  }

  return (
    <Demo>
      <Segmented label="State" value={state} options={STATES} onChange={setState} />

      {/* Replicate the page's centering layout */}
      <main
        data-slot="mfa-totp-challenge-page"
        className="flex w-full items-center justify-center px-4 py-8"
      >
        {state === 'ready' && (
          <MfaTotpChallenge
            challengeToken="tok_mfa_preview_abc123"
            onSubmit={onSubmit}
          />
        )}

        {state === 'expired' && (
          <Card className="w-full max-w-sm mx-auto" role="alert">
            <CardHeader>
              <h1 className="leading-none font-semibold tracking-tight">Session expired</h1>
              <CardDescription>
                Your sign-in session has expired. Please sign in again to get a new verification link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="default" className="w-full" asChild>
                <a href="#">Sign in again</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {state === 'missing-token' && (
          <Card className="w-full max-w-sm mx-auto" role="alert">
            <CardHeader>
              <h1 className="leading-none font-semibold tracking-tight">Invalid link</h1>
              <CardDescription>
                This sign-in link is missing required parameters. Please sign in again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="default" className="w-full" asChild>
                <a href="#">Back to sign in</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </Demo>
  );
}
