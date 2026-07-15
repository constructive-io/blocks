'use client';

import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';

import { defaultMagicLinkCallbackPageMessages } from '@/blocks/auth/magic-link-callback-page/messages';
import { Demo, Segmented } from '@/components/docs/showcase-kit';

/**
 * Demo for auth-magic-link-callback-page.
 *
 * The block reads `?token=` via useSearchParams() on mount — a seam that cannot
 * be fed in the docs preview (App Router useSearchParams() does not pick up
 * window.history.replaceState changes). Rather than rendering the full page
 * component (which always starts in the missing-token state), we render the
 * inner card UI directly, following the same pattern as auth-forgot-password-page
 * (which renders ForgotPasswordCard rather than the page wrapper).
 *
 * Each toggle state renders its corresponding card with real message copy from
 * defaultMagicLinkCallbackPageMessages, so the preview is visually accurate
 * and the toggle is fully interactive.
 */

type State = 'loading' | 'success' | 'expired' | 'invalid' | 'missing-token';
const STATES: readonly State[] = ['loading', 'success', 'expired', 'invalid', 'missing-token'];

const msgs = defaultMagicLinkCallbackPageMessages;

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
          </Card>
        )}

        {state === 'expired' && (
          <Card>
            <CardHeader>
              <CardTitle>{msgs.expiredTitle}</CardTitle>
              <CardDescription>{msgs.expiredDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href="#">{msgs.expiredRequestNewLink}</a>
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

        {state === 'missing-token' && (
          <Card>
            <CardHeader>
              <CardTitle role="alert">{msgs.missingTokenTitle}</CardTitle>
              <CardDescription>{msgs.missingTokenDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full">
                <a href="#">{msgs.missingTokenSignInLink}</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Demo>
  );
}
