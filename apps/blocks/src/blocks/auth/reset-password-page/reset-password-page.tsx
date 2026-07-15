'use client';

/**
 * reset-password-page  (registry: auth-reset-password-page)
 *
 * Thin Next.js 15 page wrapper for [[auth-reset-password-card]]. Reads
 * `?reset_token=` (legacy `?token=` fallback) and `?role_id=` from the URL via `useSearchParams`, passes them
 * as props to the card (so the card never reads the URL directly), and routes
 * to the sign-in page on success.
 *
 * This is NOT a data block. All data logic is in the card. No generated hook
 * is imported here; no `requires.json` ships.
 *
 * Configurable constants at the top of the installed file — update for your
 * app's routing convention.
 */

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { cn } from '@/lib/utils';
import { ResetPasswordCard } from '@/blocks/auth/reset-password-card/reset-password-card';

// ─── Configurable constants ───────────────────────────────────────────────────
const SIGN_IN_PATH = '/sign-in';
const FORGOT_PASSWORD_PATH = '/forgot-password';

// ─── Inner content (uses useSearchParams — must be inside Suspense) ───────────

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('reset_token') ?? searchParams.get('token') ?? undefined;
  const roleId = searchParams.get('role_id') ?? undefined;

  return (
    <ResetPasswordCard
      token={token}
      roleId={roleId}
      forgotPasswordPath={FORGOT_PASSWORD_PATH}
      signInPath={SIGN_IN_PATH}
      onSuccess={() => {
        router.push(SIGN_IN_PATH);
      }}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export type ResetPasswordPageProps = {
  className?: string;
};

/**
 * Default export — drop this file at `app/auth/reset-password/page.tsx`.
 * The `Suspense` boundary is required by Next.js 15 when `useSearchParams` is
 * used anywhere in the component tree below a Client Component boundary.
 */
export default function ResetPasswordPage({ className }: ResetPasswordPageProps) {
  return (
    <main
      data-slot="reset-password-page"
      className={cn('flex min-h-screen items-center justify-center p-4', className)}
    >
      <Suspense>
        <ResetPasswordPageContent />
      </Suspense>
    </main>
  );
}
