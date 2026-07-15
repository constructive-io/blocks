'use client';

/**
 * sign-up-page  (registry: auth-sign-up-page)
 *
 * Thin Next.js 15 page that composes [[auth-sign-up-card]] with a centered
 * layout and post-registration redirect logic. It reads `?redirect=` from
 * searchParams and routes the user after a successful sign-up.
 *
 * SPEC: planning/blocks/auth/auth-sign-up-page.md
 *
 *   • NO data logic: this page delegates ALL data fetching to the card.
 *   • NO requires.json: presentational glue only (block-contract.md §8).
 *   • Routes to VERIFY_EMAIL_PATH when `isVerified=false`.
 *   • Routes to `?redirect=` (same-origin validated) or DEFAULT_REDIRECT on success.
 *   • Pages are the ONLY blocks that import `next/navigation` (block-contract.md §6).
 */

import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';

import { cn } from '@/lib/utils';
import { SignUpCard, type SignUpResult } from '@/blocks/auth/sign-up-card/sign-up-card';

// ---------------------------------------------------------------------------
// Route constants — edit in the installed page to match your app's routes.
// ---------------------------------------------------------------------------
const DEFAULT_REDIRECT = '/dashboard';
const VERIFY_EMAIL_PATH = '/auth/verify-email-sent';
const SIGN_IN_PATH = '/auth/sign-in';

// ---------------------------------------------------------------------------
// Same-origin guard — prevents open-redirect attacks on the `?redirect=` param.
// Returns the redirect target only if it is relative (same-origin).
// ---------------------------------------------------------------------------
function safeRedirect(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  try {
    const decoded = decodeURIComponent(raw);
    // Accept only relative paths (start with /) and reject protocol-relative URLs.
    if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
  } catch {
    // malformed percent-sequence (e.g. lone %) — fall through to fallback
  }
  return fallback;
}

export type SignUpPageProps = {
  className?: string;
};

export function SignUpPage({ className }: SignUpPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSuccess(result: SignUpResult) {
    if (!result.isVerified) {
      router.push(VERIFY_EMAIL_PATH as Route);
    } else {
      // redirectTo is a runtime-validated same-origin path (string); cast to
      // Route to satisfy Next.js typedRoutes (no literal route to infer).
      const redirectTo = safeRedirect(searchParams.get('redirect'), DEFAULT_REDIRECT);
      router.push(redirectTo as Route);
    }
  }

  return (
    <main
      data-slot="sign-up-page"
      className={cn('flex min-h-svh flex-col items-center justify-center px-4 py-12', className)}
    >
      <SignUpCard
        signInHref={SIGN_IN_PATH}
        onSuccess={handleSuccess}
      />
    </main>
  );
}

export default SignUpPage;
