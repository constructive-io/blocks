/**
 * AuthErrorAlert
 *
 * Inline, animated error banner for auth forms. Collapses to zero height when
 * there is no error so layout never jumps. Ported verbatim from the admin app
 * (`components/auth/auth-error-alert.tsx`). `cn` resolves from the consumer's
 * shadcn `@/lib/utils` (the standard location every shadcn host provides).
 */

import { AlertCircleIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface AuthErrorAlertProps {
  error: string | null;
  className?: string;
}

export function AuthErrorAlert({ error, className }: AuthErrorAlertProps) {
  const hasError = Boolean(error);

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-hidden={!hasError}
      className={cn(
        !hasError && 'hidden',
        className
      )}
    >
      <div
        className={cn(
          'flex items-start gap-2.5 rounded-md px-3 py-2.5',
          'bg-destructive/8 border border-destructive/20',
          'text-destructive text-sm text-left',
          'text-pretty'
        )}
      >
        <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="text-pretty leading-snug">{error}</span>
      </div>
    </div>
  );
}
