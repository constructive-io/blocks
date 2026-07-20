'use client';

/**
 * mfa-totp-challenge-page  (registry: auth-mfa-totp-challenge-page)
 *
 * Thin Next.js page mounted at `/auth/mfa/totp`. Reads `?token=` and
 * `?redirect=` from `useSearchParams()`, validates both, and mounts
 * `<MfaTotpChallenge>`. Routes to `redirectTo` on success.
 *
 * Page states:
 *   ready         — ?token= present; shows the MfaTotpChallenge card
 *   missing-token — ?token= absent; shows error card
 *   expired       — card fires onError with code EXPIRED_TOKEN; shows error card
 *
 * This block calls NO generated hook directly. All mutation logic is delegated
 * to auth-mfa-totp-challenge. No requires.json is shipped (sdk-binding-contract §7).
 *
 * Pages MAY use `next/navigation`; Cards MUST NOT (block-contract.md §6).
 *
 * Editable constants after install:
 *   const DEFAULT_REDIRECT = '/dashboard';
 *   const SIGN_IN_PATH     = '/auth/sign-in';
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Card, CardContent, CardHeader, CardDescription } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { MfaTotpChallenge } from '@/blocks/auth/mfa-totp-challenge/mfa-totp-challenge';
import type { MfaChallengeResult, MfaTotpChallengeVars } from '@/blocks/auth/mfa-totp-challenge/mfa-totp-challenge';

import {
  defaultMfaTotpChallengePageMessages,
  type MfaTotpChallengePageMessages
} from './messages';

// ---------------------------------------------------------------------------
// Editable constants (installed page — consumer modifies these in place)
// ---------------------------------------------------------------------------
const DEFAULT_REDIRECT = '/dashboard';
const SIGN_IN_PATH = '/auth/sign-in';

// ---------------------------------------------------------------------------
// Open-redirect guard (same pattern as auth-sign-in-page)
// ---------------------------------------------------------------------------

/**
 * Returns `redirect` only when it resolves to the same origin as the current
 * page. External URLs — including absolute URLs, protocol-relative, and path-
 * encoded bypasses — are silently replaced with `fallback`.
 */
function safeRedirect(redirect: string | null | undefined, fallback: string): string {
  if (!redirect) return fallback;
  try {
    const url = new URL(redirect, window.location.origin);
    return url.origin === window.location.origin ? redirect : fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Internal page state
// ---------------------------------------------------------------------------

type PageState = 'ready' | 'missing-token' | 'expired';

// ---------------------------------------------------------------------------
// Message override type (deep-partial)
// ---------------------------------------------------------------------------

export type MfaTotpChallengePageMessageOverrides = Partial<MfaTotpChallengePageMessages>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MfaTotpChallengePage({
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  className
}: {
  messages?: MfaTotpChallengePageMessageOverrides;
  /**
   * Override seam — passed through to <MfaTotpChallenge> so tests (and consumers
   * who want an early integration before the generated hook ships) can inject a
   * custom submit handler. Mirrors the card's own onSubmit prop.
   */
  onSubmit?: (vars: MfaTotpChallengeVars) => Promise<MfaChallengeResult>;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Merge messages
  const merged: MfaTotpChallengePageMessages = {
    ...defaultMfaTotpChallengePageMessages,
    ...messageOverrides
  };

  // Read ?token= and ?redirect= from URL
  const rawToken = searchParams.get('token');
  const rawRedirect = searchParams.get('redirect');
  const redirectTo = safeRedirect(rawRedirect ? decodeURIComponent(rawRedirect) : null, DEFAULT_REDIRECT);

  // Page state — starts in 'missing-token' if no token, otherwise 'ready'
  const [pageState, setPageState] = useState<PageState>(rawToken ? 'ready' : 'missing-token');

  function handleSuccess(_result: MfaChallengeResult) {
    // _result is unused today; when the backend ships, extract result.redirectTo
    // as a server-provided redirect hint (takes precedence over ?redirect= param).
    router.push(redirectTo);
  }

  function handleError(err: { message: string; code: string }) {
    if (err.code === 'EXPIRED_TOKEN') {
      setPageState('expired');
    }
  }

  // ---------------------------------------------------------------------------
  // Error state rendering (missing-token or expired)
  // ---------------------------------------------------------------------------

  if (pageState === 'missing-token') {
    return (
      <main
        data-slot="mfa-totp-challenge-page"
        className={cn('flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12', className)}
      >
        <Card className="w-full max-w-sm mx-auto" role="alert">
          <CardHeader>
            <h1 className="text-balance leading-none font-semibold tracking-tight">{merged.missingTokenTitle}</h1>
            <CardDescription>{merged.missingTokenDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="default" className="w-full" asChild>
              <a href={SIGN_IN_PATH}>{merged.missingTokenCta}</a>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (pageState === 'expired') {
    return (
      <main
        data-slot="mfa-totp-challenge-page"
        className={cn('flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12', className)}
      >
        <Card className="w-full max-w-sm mx-auto" role="alert">
          <CardHeader>
            <h1 className="text-balance leading-none font-semibold tracking-tight">{merged.expiredTokenTitle}</h1>
            <CardDescription>{merged.expiredTokenDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="default" className="w-full" asChild>
              <a href={SIGN_IN_PATH}>{merged.expiredTokenCta}</a>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // Ready state — mount the MFA challenge card
  // ---------------------------------------------------------------------------

  return (
    <main
      data-slot="mfa-totp-challenge-page"
      className={cn('flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12', className)}
    >
      <MfaTotpChallenge
        challengeToken={rawToken!}
        onSubmit={onSubmitOverride}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </main>
  );
}
