'use client';

/**
 * forgot-password-page  (registry: auth-forgot-password-page)
 *
 * Thin Next.js 15 page that composes [[auth-forgot-password-card]] inside a
 * centered layout. This is the page-glue layer (block-contract.md §2):
 *
 *   • Reads `?email=` from searchParams and passes it to the card as
 *     `defaultEmail` (reduces friction when navigated from a sign-in form
 *     that already knows the typed email).
 *   • Provides a centered `<main>` layout (fulfilling the layout-kit
 *     accessibility requirement — landmark <main>).
 *   • No navigation on success — the card transitions to its own confirmed
 *     state internally; this page does not redirect.
 *   • Imports `next/navigation` — this is CORRECT for a page block.
 *     Card blocks NEVER import it; page blocks always do (block-contract §2).
 *
 * The block calls NO data hooks directly. All data logic lives in the card.
 * This block ships NO requires.json (presentational page glue, no generated hook).
 *
 * Configurable constants at the top of the installed file:
 *   SIGN_IN_PATH — href rendered inside the card's "Back to sign in" link.
 */

import { useSearchParams } from 'next/navigation';

import { ForgotPasswordCard } from '@/blocks/auth/forgot-password-card/forgot-password-card';

// Editable constants in the installed page:
const SIGN_IN_PATH = '/auth/sign-in';

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? undefined;

  return (
    <main data-slot="forgot-password-page" className="flex min-h-screen items-center justify-center px-4 py-12">
      <ForgotPasswordCard
        defaultEmail={email}
        signInHref={SIGN_IN_PATH}
      />
    </main>
  );
}
