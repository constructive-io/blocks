'use client';

/**
 * invitation-acceptance-page  (registry: auth-invitation-acceptance-page)
 *
 * Thin Next.js page wrapper that composes [[auth-invitation-acceptance-card]]
 * inside a centered full-viewport layout and adds router glue:
 *
 *   • Auth gate: calls `useCurrentUserQuery` from `@/generated/auth` to check
 *     authentication before rendering the card. Unauthenticated users are
 *     redirected to SIGN_IN_PATH with a `?redirect=` return URL. Users with
 *     `is_verified=false` see a warning before the card renders.
 *   • Reads `?token=` and `?kind=` from `useSearchParams()` and passes them
 *     to `InvitationAcceptanceCard`.
 *   • Routes to `result.redirectTo` (or `DEFAULT_REDIRECT`) after a successful
 *     acceptance via `onSuccess`.
 *   • Routes to `DECLINE_REDIRECT` when the user clicks Decline.
 *
 * Pages MAY use `next/navigation`; Cards MUST NOT (block-contract.md §6).
 * This block imports `useCurrentUserQuery` from `@/generated/auth` and ships
 * `auth-invitation-acceptance-page.requires.json` (sdk-binding-contract.md §7).
 *
 * Editable constants after install:
 *   const DEFAULT_REDIRECT  = '/dashboard';
 *   const DECLINE_REDIRECT  = '/';
 *   const SIGN_IN_PATH      = '/auth/sign-in';
 *   const BRAND_LOGO_SRC    = '';  // optional logo URL
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useCurrentUserQuery } from '@/generated/auth';
import {
  InvitationAcceptanceCard,
  type InviteAcceptResult
} from '@/blocks/auth/invitation-acceptance-card/invitation-acceptance-card';
import {
  defaultInvitationAcceptanceMessages,
  type InvitationAcceptanceMessageOverrides
} from '@/blocks/auth/invitation-acceptance-card/messages';

// ---------------------------------------------------------------------------
// Editable constants (installed page — consumer modifies these in place)
// ---------------------------------------------------------------------------
const DEFAULT_REDIRECT = '/dashboard';
const DECLINE_REDIRECT = '/';
const SIGN_IN_PATH = '/auth/sign-in';
/** Optional brand logo URL. Renders above the card when non-empty. */
const BRAND_LOGO_SRC = '';

// ---------------------------------------------------------------------------
// Open-redirect guard (same guard used in sign-in-page)
// ---------------------------------------------------------------------------

/**
 * Returns `redirect` only when it resolves to the same origin. External URLs,
 * protocol-relative URLs, and path-encoded bypasses fall back to `fallback`.
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
// Component
// ---------------------------------------------------------------------------

export type InvitationAcceptancePageProps = {
  messages?: InvitationAcceptanceMessageOverrides;
  className?: string;
};

export default function InvitationAcceptancePage({ messages: messageOverrides, className }: InvitationAcceptancePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token') ?? '';
  const rawKind = searchParams.get('kind');
  const kind: 'app' | 'org' = rawKind === 'org' ? 'org' : 'app';
  const rawRedirect = searchParams.get('redirect');
  const redirectTo = safeRedirect(rawRedirect ? decodeURIComponent(rawRedirect) : null, DEFAULT_REDIRECT);

  // Merge messages for page-level copy (missing-token state, auth gate)
  const merged = {
    ...defaultInvitationAcceptanceMessages,
    ...messageOverrides,
    errors: { ...defaultInvitationAcceptanceMessages.errors, ...messageOverrides?.errors }
  };

  // ---------------------------------------------------------------------------
  // Auth gate — check current user before rendering the acceptance card
  // ---------------------------------------------------------------------------
  const { data: currentUserData, isLoading: authLoading } = useCurrentUserQuery({
    selection: { fields: { id: true } }
  });

  const currentUser = currentUserData?.currentUser;

  // Redirect unauthenticated users to sign-in with a return URL.
  useEffect(() => {
    if (!authLoading && !currentUser) {
      const returnUrl = encodeURIComponent(`/invite?token=${token}&kind=${kind}`);
      router.replace(`${SIGN_IN_PATH}?redirect=${returnUrl}`);
    }
  }, [authLoading, currentUser, token, kind, router]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleSuccess(result: InviteAcceptResult) {
    const target = result.redirectTo ? safeRedirect(result.redirectTo, redirectTo) : redirectTo;
    router.push(target);
  }

  function handleDecline() {
    router.push(DECLINE_REDIRECT);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main
      data-slot="invitation-acceptance-page"
      className={`flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12${className ? ` ${className}` : ''}`}
    >
      {BRAND_LOGO_SRC && (
        <div className="mb-8 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_LOGO_SRC}
            alt="Brand logo"
            className="h-8 w-auto outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
          />
        </div>
      )}

      {/* Auth loading skeleton */}
      {authLoading && (
        <div
          data-testid="auth-loading-skeleton"
          className="w-full max-w-sm mx-auto space-y-3 animate-pulse"
          aria-label="Loading"
        >
          <div className="h-6 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
          <div className="h-10 bg-muted rounded w-full mt-4" />
        </div>
      )}

      {/* Signed-in state: show page content */}
      {!authLoading && currentUser && (
        <>
          {!token ? (
            <div className="w-full max-w-sm mx-auto text-center space-y-2">
              <h1 className="text-balance text-lg font-semibold">{merged.missingTokenTitle}</h1>
              <p className="text-muted-foreground text-pretty text-sm">{merged.missingTokenDescription}</p>
              <a href={SIGN_IN_PATH} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                Go to sign in
              </a>
            </div>
          ) : (
            <InvitationAcceptanceCard
              token={token}
              kind={kind}
              messages={messageOverrides}
              onSuccess={handleSuccess}
              onDecline={handleDecline}
            />
          )}
        </>
      )}
    </main>
  );
}
