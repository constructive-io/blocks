'use client';

/**
 * sso-sign-in-card  (registry: auth-sso-sign-in-card)
 *
 * v2 STUB — Phase 3.
 *
 * Presentational placeholder for SSO-initiated sign-in (email-domain lookup).
 * The backend procedures that power domain lookup and OAuth redirect do not yet
 * exist — see `backend-spec/v2-sso-scim.md`:
 *
 *   • `constructive_auth_public.get_sso_provider_for_domain(domain text)` — hypothetical
 *   • `constructive_auth_public.begin_sso_flow(sso_provider_id uuid, return_to text)` — hypothetical
 *
 * Because the backend is pending, this block:
 *   - Does NOT import from `@/generated/auth` (no op exists to bind to).
 *   - Does NOT ship a `requires.json` (no ops to declare).
 *   - Does NOT depend on `blocks-runtime` (no generated hook, no QueryClient needed).
 *   - Exposes `onDomainSubmit` as the host-wiring seam: the host supplies the
 *     domain-lookup + SSO-redirect logic when the backend ships.
 *   - Renders a "requires SSO backend" deferred-state notice so consumers know
 *     the block is intentionally incomplete.
 *
 * The block renders a minimal email-domain form. When the host provides
 * `onDomainSubmit`, clicking "Continue with SSO" calls it. Without it, the
 * deferred-state banner is shown instead.
 *
 * data-slot="sso-sign-in-card" (SHORT name, no category prefix).
 */

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Alert, AlertDescription } from '@constructive-io/ui/alert';

import { cn } from '@/lib/utils';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';

import {
  defaultAuthSsoSignInCardMessages,
  type AuthSsoSignInCardMessages
} from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SsoDomainResult = {
  /** SSO provider id returned by `get_sso_provider_for_domain`. */
  ssoProviderId: string;
  /** Human-readable organisation name for the provider. */
  orgName: string;
};

export type AuthSsoSignInCardMessageOverrides = Partial<Omit<AuthSsoSignInCardMessages, 'errors'>> & {
  errors?: Partial<AuthSsoSignInCardMessages['errors']>;
};

export type AuthSsoSignInCardProps = {
  /** Pre-fill the email field; domain check runs immediately when provided. */
  defaultEmail?: string;
  messages?: AuthSsoSignInCardMessageOverrides;
  /** Sign-in link target; rendered as a plain `<a>` when provided. */
  signInHref?: string;
  /**
   * Host-wiring seam for domain lookup + SSO redirect.
   * When provided, replaces the deferred-state banner. The host resolves the
   * domain against the backend and either triggers the OAuth redirect or
   * throws to surface an inline error.
   *
   * Receives the email and should return `SsoDomainResult` on success or
   * throw on failure (error is mapped via the messages catalog).
   */
  onDomainSubmit?: (email: string) => Promise<SsoDomainResult>;
  /** Fires when SSO domain lookup succeeds — caller may choose to hide password form. */
  onSsoDetected?: (result: SsoDomainResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors, and non-fatal branches. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Form types
// ---------------------------------------------------------------------------

type SsoFormData = {
  email: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuthSsoSignInCard({
  defaultEmail,
  messages: messageOverrides,
  signInHref,
  onDomainSubmit,
  onSsoDetected,
  onError,
  onMessage,
  className
}: AuthSsoSignInCardProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: AuthSsoSignInCardMessages = {
    ...defaultAuthSsoSignInCardMessages,
    ...messageOverrides,
    errors: {
      ...defaultAuthSsoSignInCardMessages.errors,
      ...messageOverrides?.errors
    }
  };

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedOrg, setDetectedOrg] = useState<SsoDomainResult | null>(null);

  async function handleDomainLookup(values: SsoFormData): Promise<void> {
    setError(null);
    setDetectedOrg(null);

    if (!onDomainSubmit) {
      // Backend not yet wired — surface the PROCEDURE_NOT_FOUND deferred state.
      const message = merged.errors.PROCEDURE_NOT_FOUND;
      setError(message);
      onMessage?.({ kind: 'error', key: 'PROCEDURE_NOT_FOUND', message });
      onError?.({ message, code: 'PROCEDURE_NOT_FOUND' });
      return;
    }

    setIsPending(true);
    try {
      const result = await onDomainSubmit(values.email);
      setDetectedOrg(result);
      onSsoDetected?.(result);
      onMessage?.({ kind: 'success', key: 'ssoDetected', message: merged.ssoDetectedLabel.replace('{{orgName}}', result.orgName) });
    } catch (err: unknown) {
      const rawCode = (err as { extensions?: { code?: string } })?.extensions?.code;
      const code = rawCode ?? 'UNKNOWN_ERROR';
      const message =
        (merged.errors as Record<string, string>)[code] ?? merged.errors.UNKNOWN_ERROR;
      setError(message);
      onMessage?.({ kind: 'error', key: code, message });
      onError?.({ message, code });
    } finally {
      setIsPending(false);
    }
  }

  const form = useForm({
    defaultValues: {
      email: defaultEmail ?? ''
    } as SsoFormData,
    onSubmit: async ({ value }) => {
      await handleDomainLookup(value);
    }
  });

  const ssoButtonLabel = detectedOrg
    ? merged.ssoDetectedLabel.replace('{{orgName}}', detectedOrg.orgName)
    : merged.submitLabel;

  return (
    <Card data-slot="sso-sign-in-card" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <CardTitle>{merged.title}</CardTitle>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Deferred-state notice when no host wiring is provided */}
        {!onDomainSubmit && !error && (
          <Alert>
            <AlertDescription className="text-muted-foreground text-sm">
              SSO domain lookup requires a backend update. See:{' '}
              <a
                href="https://constructive.io/docs/backend-spec/future-procedures"
                className="font-medium text-foreground hover:text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                future-procedures
              </a>
            </AlertDescription>
          </Alert>
        )}

        <AuthErrorAlert error={error} />

        <form
          noValidate
          aria-busy={isPending}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => {
                if (!value) return 'Email is required';
                if (!/\S+@\S+\.\S+/.test(value)) return 'Please enter a valid email';
                return undefined;
              }
            }}
          >
            {(field) => (
              <FormField
                field={field}
                label={merged.emailLabel}
                placeholder={merged.emailPlaceholder}
                type="email"
              />
            )}
          </form.Field>

          <AuthLoadingButton
            type="submit"
            className="w-full"
            isLoading={isPending}
            loadingText={merged.loadingLabel}
            data-testid="sso-submit"
          >
            {ssoButtonLabel}
          </AuthLoadingButton>
        </form>
      </CardContent>

      {signInHref && (
        <CardFooter className="border-border/40 justify-center border-t pt-5">
          <Button
            variant="link"
            asChild
            className="text-muted-foreground hover:text-foreground h-auto p-0 text-sm"
          >
            <a href={signInHref}>{merged.backLabel}</a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
