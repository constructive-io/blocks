'use client';

import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';

import { defaultVerifyEmailPageMessages } from '@/blocks/auth/verify-email-page/messages';
import { Demo, Segmented } from '@/components/docs/showcase-kit';

/**
 * Demo for auth-verify-email-page.
 *
 * The block reads `?email_id=` and `?token=` via useSearchParams() on mount —
 * a seam that cannot be fed in the docs preview (App Router useSearchParams()
 * does not pick up window.history.replaceState changes, as documented by the
 * sibling auth-magic-link-callback-page demo). Because of this, mounting the
 * full page component always starts in the 'missing-params' state regardless of
 * URL manipulation.
 *
 * Fix: render the inner card UI directly from defaultVerifyEmailPageMessages,
 * following the same pattern as auth-magic-link-callback-page.demo.tsx. The
 * toggle drives all five states instantly with no remounting needed.
 */

type State = 'loading' | 'success' | 'expired' | 'invalid' | 'missing';
const STATES: readonly State[] = ['success', 'expired', 'invalid', 'missing', 'loading'];

const msgs = defaultVerifyEmailPageMessages;

export function BlockDemo() {
  const [state, setState] = useState<State>('success');

  return (
    <Demo>
      <Segmented
        label="State"
        value={state}
        options={STATES}
        onChange={setState}
      />

      <div className="w-full max-w-sm mx-auto">
        {state === 'loading' && (
          <Card aria-busy={false}>
            <CardHeader>
              <CardTitle>{msgs.loadingTitle}</CardTitle>
              <CardDescription>{msgs.loadingDescription}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {state === 'success' && (
          <Card>
            <CardHeader>
              <CardTitle>{msgs.successTitle}</CardTitle>
              <CardDescription>{msgs.successDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href="#">{msgs.successCta}</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {state === 'expired' && (
          <Card>
            <CardHeader>
              <CardTitle>{msgs.expiredTitle}</CardTitle>
              <CardDescription>{msgs.expiredDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full">{msgs.expiredResendButton}</Button>
              <Button variant="outline" asChild className="w-full">
                <a href="#">{msgs.invalidSignInLink}</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {state === 'invalid' && (
          <Card>
            <CardHeader>
              <CardTitle role="alert">{msgs.invalidTitle}</CardTitle>
              <CardDescription>{msgs.invalidDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full">
                <a href="#">{msgs.invalidSignInLink}</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {state === 'missing' && (
          <Card>
            <CardHeader>
              <CardTitle role="alert">{msgs.missingParamsTitle}</CardTitle>
              <CardDescription>{msgs.missingParamsDescription}</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </Demo>
  );
}
