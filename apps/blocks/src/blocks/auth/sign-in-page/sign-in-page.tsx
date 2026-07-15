'use client';

/**
 * sign-in-page  (registry: auth-sign-in-page)
 *
 * Thin Next.js page wrapper that composes [[auth-sign-in-card]] into a centered
 * full-viewport layout and adds router glue:
 *
 *   • Reads `?redirect=` from `useSearchParams()` (client-side) and routes after
 *     a successful sign-in (open-redirect protection: only same-origin paths are
 *     honoured — external URLs fall back to `DEFAULT_REDIRECT`).
 *   • Handles the `mfaRequired` branch by routing to `MFA_PATH` with a
 *     challenge-token query param.
 *   • Delegates ALL data fetching and form logic to `SignInCard`.
 *
 * Pages MAY use `next/navigation`; Cards MUST NOT (block-contract.md §6).
 * This block ships no `requires.json` — it calls no generated hook directly;
 * that is the card's responsibility (sdk-binding-contract.md §7).
 *
 * Editable constants after install:
 *   const DEFAULT_REDIRECT       = '/dashboard';
 *   const MFA_PATH               = '/auth/mfa/totp';
 *   const SIGN_UP_PATH           = '/auth/sign-up';
 *   const FORGOT_PASSWORD_PATH   = '/auth/forgot-password';
 *   const BRAND_LOGO_SRC         = '';   // optional logo URL
 */

import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';

import { cn } from '@/lib/utils';
import { SignInCard } from '@/blocks/auth/sign-in-card/sign-in-card';
import type { SignInResult } from '@/blocks/auth/sign-in-card/sign-in-card';

// ---------------------------------------------------------------------------
// Editable constants (installed page — consumer modifies these in place)
// ---------------------------------------------------------------------------
const DEFAULT_REDIRECT = '/dashboard';
const MFA_PATH = '/auth/mfa/totp';
const SIGN_UP_PATH = '/auth/sign-up';
const FORGOT_PASSWORD_PATH = '/auth/forgot-password';
/** Optional brand logo URL. Renders above the card when non-empty. */
const BRAND_LOGO_SRC = '';

// ---------------------------------------------------------------------------
// Open-redirect guard
// ---------------------------------------------------------------------------

/**
 * Returns `redirect` only when it resolves to the same origin as the current
 * page. Uses `new URL()` to cover all URL-parsing edge cases (e.g. `/\/evil.com`
 * resolves to `https://evil.com/` in WHATWG-compliant parsers). External URLs —
 * including absolute URLs, protocol-relative URLs, and path-encoded bypasses —
 * are silently replaced with `fallback`.
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

export default function SignInPage({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawRedirect = searchParams.get('redirect');
  const redirectTo = safeRedirect(rawRedirect ? decodeURIComponent(rawRedirect) : null, DEFAULT_REDIRECT);

  function handleSuccess(result: SignInResult) {
    if (result.mfaRequired && result.mfaChallengeToken) {
      // Dynamically-built path (query params interpolated): cast to Route to
      // satisfy Next.js typedRoutes, which cannot infer a literal route here.
      const target = `${MFA_PATH}?token=${encodeURIComponent(result.mfaChallengeToken)}&redirect=${encodeURIComponent(redirectTo)}`;
      router.push(target as Route);
      return;
    }
    // redirectTo is a runtime-validated same-origin path (string); cast to Route.
    router.push(redirectTo as Route);
  }

  return (
    <main
      data-slot="sign-in-page"
      className={cn('flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12', className)}
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

      <SignInCard
        onSuccess={handleSuccess}
        forgotPasswordHref={FORGOT_PASSWORD_PATH}
        signUpHref={SIGN_UP_PATH}
      />
    </main>
  );
}
