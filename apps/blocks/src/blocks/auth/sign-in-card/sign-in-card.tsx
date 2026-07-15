'use client';

/**
 * sign-in-card  (registry: auth-sign-in-card)
 *
 * THE reference data block — the gold standard every other data block clones.
 * Email + password sign-in, ported from the admin login-form stack and rebound
 * to the host's GENERATED hook. It demonstrates the whole binding doctrine
 * (sdk-binding-contract.md, MASTER-PROMPT §5):
 *
 *   • Data path = the generated React-Query hook `useSignInMutation`, imported
 *     from `@/generated/auth` and called with a `selection` field-picker. There
 *     is NO fetch, NO GraphQL document string, NO `@constructive-io/data`, and
 *     NO hardcoded URL in this file.
 *   • NO client bootstrap: it never calls `configure()`/`getClient()` and never
 *     mounts a `QueryClientProvider`. The host mounts `blocks-runtime` once at
 *     app root; that is the single wiring point.
 *   • Override seam: `onSubmit` fully replaces the generated-hook call, keeping
 *     the block portable to non-Constructive backends.
 *   • Error mapping via the `auth-errors` foundation lib; inline alert only (no
 *     toast/notifications/captcha — v1 mirrors admin).
 *   • Notification seam: `onSuccess` / `onError` / `onMessage` always fire.
 *
 * UI primitives come from `@constructive-io/ui` via direct subpath imports
 * (consumed, never vendored). Form primitives (`FormField`, `AuthErrorAlert`,
 * `AuthLoadingButton`) and libs (`auth-errors`, `schemas`) are foundation
 * registry items installed alongside this block.
 */

import { useEffect, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Checkbox } from '@constructive-io/ui/checkbox';

import { cn } from '@/lib/utils';
import { useSignInMutation } from '@/generated/auth';
import { createInvalidCredentialsError, parseGraphQLError } from '@/blocks/lib/auth-errors';
import { loginSchema, type LoginFormData } from '@/blocks/lib/schemas';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';

import { defaultSignInCardMessages, type SignInCardMessages } from './messages';

/** Variables the sign-in call receives. The override `onSubmit` gets these verbatim. */
export type SignInVars = {
  email: string;
  password: string;
  rememberMe: boolean;
  credentialKind: string;
};

/**
 * The sign-in record. Mirrors the `auth` SDK's `SignInRecord` (the fields this
 * block selects); declared here so the public surface — and the `onSubmit`
 * override — does not depend on a generated type name.
 */
export type SignInResult = {
  id: string | null;
  userId: string | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  isVerified: boolean | null;
  totpEnabled: boolean | null;
  mfaRequired: boolean | null;
  mfaChallengeToken: string | null;
};

/**
 * Message overrides. Top-level copy is shallow-partial; `errors` is itself
 * partial so a host can localize a single error code without restating the map.
 */
export type SignInCardMessageOverrides = Partial<Omit<SignInCardMessages, 'errors'>> & {
  errors?: Partial<SignInCardMessages['errors']>;
};

export type SignInCardProps = {
  /** Show the "remember me" checkbox (default true). */
  showRememberMe?: boolean;
  /** Prefill the email field (e.g. from an invite link). */
  defaultEmail?: string;
  /** Credential kind sent to the API (default `'bearer'`). */
  credentialKind?: string;
  messages?: SignInCardMessageOverrides;
  /** Forgot-password link target; rendered as a plain `<a>` when provided. */
  forgotPasswordHref?: string;
  /** Sign-up link target; rendered as a plain `<a>` when provided. */
  signUpHref?: string;
  /** Replace the default `useSignInMutation` call. Receives the same vars. */
  onSubmit?: (vars: SignInVars) => Promise<SignInResult | null>;
  /** Fires after a resolved sign-in (before any host navigation). Always fires. */
  onSuccess?: (result: SignInResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors, and non-fatal branches. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

export function SignInCard({
  showRememberMe = true,
  defaultEmail,
  credentialKind = 'bearer',
  messages: messageOverrides,
  forgotPasswordHref,
  signUpHref,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: SignInCardProps) {
  // Deep merge: top-level copy + the errors map merged separately.
  const merged: SignInCardMessages = {
    ...defaultSignInCardMessages,
    ...messageOverrides,
    errors: { ...defaultSignInCardMessages.errors, ...messageOverrides?.errors }
  };

  // Generated hook from the host's `auth` SDK. The payload nests the record
  // under `result`, so the selection mirrors that shape (verified against
  // SignInPayloadSelect in the generated `.d.ts`).
  const defaultMutation = useSignInMutation({
    selection: {
      fields: {
        result: {
          select: {
            id: true,
            userId: true,
            accessToken: true,
            accessTokenExpiresAt: true,
            isVerified: true,
            totpEnabled: true,
            mfaRequired: true,
            mfaChallengeToken: true
          }
        }
      }
    }
  });

  // Hybrid pending: the generated hook tracks its own; the override path does not.
  const [overridePending, setOverridePending] = useState(false);
  const isPending = onSubmitOverride ? overridePending : defaultMutation.isPending;

  const [error, setError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // When the email is prefilled, move focus to the password field (admin parity).
  useEffect(() => {
    if (defaultEmail && passwordInputRef.current) passwordInputRef.current.focus();
  }, [defaultEmail]);

  async function runSignIn(vars: SignInVars): Promise<SignInResult | null> {
    if (onSubmitOverride) return onSubmitOverride(vars);
    // The generated hook takes `{ input }` and returns `{ signIn: { result } | null }`.
    const data = await defaultMutation.mutateAsync({ input: vars });
    return (data.signIn?.result ?? null) as SignInResult | null;
  }

  async function handleSignIn(values: LoginFormData) {
    setError(null);
    if (onSubmitOverride) setOverridePending(true);
    try {
      loginSchema.parse(values);
      const result = await runSignIn({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe ?? false,
        credentialKind
      });

      // A resolved mutation with no record means the server rejected the
      // credentials without an error code — surface it as invalid credentials.
      if (!result) throw createInvalidCredentialsError();

      // onSuccess always fires after a resolved mutation; the branch below only
      // decides which notification the host sees. mfaRequired / unverified are
      // non-fatal "more to do" states, not failures.
      if (result.mfaRequired) {
        onMessage?.({ kind: 'warning', key: 'mfaRequired', message: merged.mfaRequiredMessage });
      } else if (result.isVerified === false) {
        onMessage?.({ kind: 'warning', key: 'emailNotVerified', message: merged.emailNotVerifiedMessage });
      } else {
        onMessage?.({ kind: 'success', key: 'signIn.success', message: merged.successMessage });
      }
      onSuccess?.(result);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitOverride) setOverridePending(false);
    }
  }

  const form = useForm({
    defaultValues: {
      email: defaultEmail ?? '',
      password: '',
      rememberMe: true
    } as LoginFormData,
    onSubmit: async ({ value }) => {
      await handleSignIn(value);
    }
  });

  return (
    <Card data-slot="sign-in-card" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <CardTitle>{merged.title}</CardTitle>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
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

          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => (!value ? 'Password is required' : undefined)
            }}
          >
            {(field) => (
              <FormField
                field={field}
                label={merged.passwordLabel}
                placeholder={merged.passwordPlaceholder}
                type="password"
                inputRef={passwordInputRef}
              />
            )}
          </form.Field>

          {showRememberMe && (
            <form.Field name="rememberMe">
              {(field) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sign-in-remember-me"
                    checked={field.state.value ?? false}
                    onCheckedChange={(checked) => field.handleChange(checked === true)}
                  />
                  <label htmlFor="sign-in-remember-me" className="text-sm leading-none font-medium">
                    {merged.rememberMeLabel}
                  </label>
                </div>
              )}
            </form.Field>
          )}

          <div className="space-y-3 pt-2">
            <AuthLoadingButton
              type="submit"
              className="w-full"
              isLoading={isPending}
              loadingText={merged.loadingLabel}
              data-testid="sign-in-submit"
            >
              {merged.submitLabel}
            </AuthLoadingButton>

            {forgotPasswordHref && (
              <div className="text-center">
                <Button
                  variant="link"
                  asChild
                  className="text-muted-foreground hover:text-foreground h-auto p-0 text-sm"
                >
                  <a href={forgotPasswordHref}>{merged.forgotPasswordLabel}</a>
                </Button>
              </div>
            )}
          </div>
        </form>
      </CardContent>

      {signUpHref && (
        <CardFooter className="border-border/40 justify-center border-t pt-5">
          <p className="text-muted-foreground text-center text-sm">
            {merged.signUpPrompt}{' '}
            <Button variant="link" asChild className="text-primary hover:text-primary/80 h-auto p-0 font-medium">
              <a href={signUpHref}>{merged.signUpLabel}</a>
            </Button>
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
