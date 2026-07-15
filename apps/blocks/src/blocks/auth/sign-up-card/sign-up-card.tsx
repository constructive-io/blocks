'use client';

/**
 * sign-up-card  (registry: auth-sign-up-card)
 *
 * Email + password registration form bound to the host's GENERATED
 * `useSignUpMutation` hook. Mirrors the sign-in-card reference block pattern:
 *
 *   • Data path = generated React-Query hook `useSignUpMutation` from
 *     `@/generated/auth`. No fetch, no GraphQL document string, no
 *     `@constructive-io/data`, no hardcoded URL.
 *   • NO client bootstrap: no `configure()`, no `QueryClientProvider`.
 *   • Override seam: `onSubmit` fully replaces the generated-hook call.
 *   • Inline password-strength meter via `estimatePasswordStrength` (UX only —
 *     never blocks submission).
 *   • Prop-conditional confirm-password field (`showPasswordConfirm`, default true).
 *     Confirm-match is validated INLINE; it is NOT part of signUpSchema.
 *   • HIBP seam: optional `onCheckPasswordBreach` prop. If provided and it
 *     returns false/0 the breach warning is surfaced inline; submission is
 *     blocked. No default HIBP implementation (v1 — FLAG below).
 *   • Error mapping via `parseGraphQLError`; inline `<AuthErrorAlert>`.
 *   • Notification seam: `onSuccess` / `onError` / `onMessage` always fire.
 */

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Checkbox } from '@constructive-io/ui/checkbox';
import { Progress } from '@constructive-io/ui/progress';

import { cn } from '@/lib/utils';
import { useSignUpMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { signUpSchema, type SignUpFormData } from '@/blocks/lib/schemas';
import { estimatePasswordStrength } from '@/blocks/lib/password-strength';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';

import { defaultSignUpCardMessages, type SignUpCardMessages } from './messages';

/** Variables the sign-up call receives. The override `onSubmit` gets these verbatim. */
export type SignUpVars = {
  email: string;
  password: string;
  rememberMe: boolean;
  credentialKind: string;
};

/**
 * The sign-up record. Mirrors the `auth` SDK's `SignUpRecord`; declared here so
 * the public surface — and the `onSubmit` override — does not depend on a
 * generated type name.
 */
export type SignUpResult = {
  id: string | null;
  userId: string | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  isVerified: boolean | null;
  totpEnabled: boolean | null;
};

/**
 * Message overrides. Top-level copy is shallow-partial; `errors` is itself
 * partial so a host can localize a single error code without restating the map.
 */
export type SignUpCardMessageOverrides = Partial<Omit<SignUpCardMessages, 'errors'>> & {
  errors?: Partial<SignUpCardMessages['errors']>;
};

export type SignUpCardProps = {
  /** Show the "remember me" checkbox (default true). */
  showRememberMe?: boolean;
  /** Show password strength meter (default true). */
  showPasswordStrength?: boolean;
  /** Show password confirm field (default true). Confirm-match validated inline. */
  showPasswordConfirm?: boolean;
  /** Credential kind sent to the API (default `'bearer'`). */
  credentialKind?: string;
  /**
   * HIBP breach-check hook (v1 interface; v1.1 default implementation).
   * If provided, called with the raw password before submission.
   * Return `false` or `0` to block submit and surface `messages.passwordBreached`.
   * The block does NOT ship a default HIBP fetcher (v1 — see FLAGS).
   */
  onCheckPasswordBreach?: (password: string) => Promise<boolean | number>;
  messages?: SignUpCardMessageOverrides;
  /** Sign-in link target; rendered as a plain `<a>` when provided. */
  signInHref?: string;
  /** Replace the default `useSignUpMutation` call. Receives the same vars. */
  onSubmit?: (vars: SignUpVars) => Promise<SignUpResult | null>;
  /** Fires after a resolved sign-up. Always fires. */
  onSuccess?: (result: SignUpResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success and errors. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

/** Internal form shape — confirmPassword is not part of signUpSchema. */
type SignUpFormValues = SignUpFormData & { confirmPassword?: string };

const STRENGTH_LABELS = {
  weak: 'passwordStrengthWeak',
  fair: 'passwordStrengthFair',
  good: 'passwordStrengthGood',
  strong: 'passwordStrengthStrong'
} as const satisfies Record<string, keyof SignUpCardMessages>;

export function SignUpCard({
  showRememberMe = true,
  showPasswordStrength = true,
  showPasswordConfirm = true,
  credentialKind = 'bearer',
  onCheckPasswordBreach,
  messages: messageOverrides,
  signInHref,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: SignUpCardProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: SignUpCardMessages = {
    ...defaultSignUpCardMessages,
    ...messageOverrides,
    errors: { ...defaultSignUpCardMessages.errors, ...messageOverrides?.errors }
  };

  // Generated hook from the host's `auth` SDK. Payload nests the record under
  // `result`, so selection mirrors SignUpPayloadSelect → result.select.
  const defaultMutation = useSignUpMutation({
    selection: {
      fields: {
        result: {
          select: {
            id: true,
            userId: true,
            accessToken: true,
            accessTokenExpiresAt: true,
            isVerified: true,
            totpEnabled: true
          }
        }
      }
    }
  });

  // Hybrid pending: generated hook tracks its own; override path does not.
  const [overridePending, setOverridePending] = useState(false);
  const isPending = onSubmitOverride ? overridePending : defaultMutation.isPending;

  const [error, setError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');

  async function runSignUp(vars: SignUpVars): Promise<SignUpResult | null> {
    if (onSubmitOverride) return onSubmitOverride(vars);
    const data = await defaultMutation.mutateAsync({ input: vars });
    return (data.signUp?.result ?? null) as SignUpResult | null;
  }

  async function handleSignUp(values: SignUpFormValues) {
    setError(null);
    if (onSubmitOverride) setOverridePending(true);
    try {
      signUpSchema.parse(values);

      // HIBP seam: block submission if the breach check returns falsy.
      if (onCheckPasswordBreach) {
        const safe = await onCheckPasswordBreach(values.password);
        if (!safe) {
          setError(merged.passwordBreached);
          onMessage?.({ kind: 'warning', key: 'passwordBreached', message: merged.passwordBreached });
          return;
        }
      }

      const result = await runSignUp({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe ?? false,
        credentialKind
      });

      onMessage?.({ kind: 'success', key: 'signUp.success', message: merged.successMessage });
      onSuccess?.(result as SignUpResult);
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
      email: '',
      password: '',
      confirmPassword: '',
      rememberMe: true
    } as SignUpFormValues,
    onSubmit: async ({ value }) => {
      await handleSignUp(value);
    }
  });

  const strength = showPasswordStrength ? estimatePasswordStrength(passwordValue) : null;
  const strengthLabel = strength ? merged[STRENGTH_LABELS[strength.label]] : '';
  const strengthValue = strength ? (strength.score / 4) * 100 : 0;

  return (
    <Card data-slot="sign-up-card" className={cn('w-full max-w-sm mx-auto', className)}>
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
              onChange: ({ value }) => {
                setPasswordValue(value ?? '');
                if (!value) return 'Password is required';
                if (value.length < 8) return 'Password must be at least 8 characters';
                if (value.length > 63) return 'Password must be at most 63 characters';
                return undefined;
              }
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <FormField
                  field={field}
                  label={merged.passwordLabel}
                  placeholder={merged.passwordPlaceholder}
                  type="password"
                  testId="password"
                />
                {showPasswordStrength && passwordValue && (
                  <div className="space-y-1">
                    <Progress
                      value={strengthValue}
                      aria-label="Password strength"
                      data-testid="password-strength-bar"
                    />
                    <p className="text-muted-foreground text-xs" data-testid="password-strength-label">
                      {strengthLabel}
                    </p>
                  </div>
                )}
              </div>
            )}
          </form.Field>

          {showPasswordConfirm && (
            <form.Field
              name="confirmPassword"
              validators={{
                onChange: ({ value, fieldApi }) => {
                  const pw = fieldApi.form.getFieldValue('password');
                  if (!value) return 'Please confirm your password';
                  if (value !== pw) return merged.passwordMismatch;
                  return undefined;
                }
              }}
            >
              {(field) => (
                <FormField
                  field={field}
                  label={merged.passwordConfirmLabel}
                  placeholder={merged.passwordConfirmPlaceholder}
                  type="password"
                  testId="confirmPassword"
                />
              )}
            </form.Field>
          )}

          {showRememberMe && (
            <form.Field name="rememberMe">
              {(field) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sign-up-remember-me"
                    checked={field.state.value ?? false}
                    onCheckedChange={(checked) => field.handleChange(checked === true)}
                  />
                  <label htmlFor="sign-up-remember-me" className="text-sm leading-none font-medium">
                    {merged.rememberMeLabel}
                  </label>
                </div>
              )}
            </form.Field>
          )}

          <div className="pt-2">
            <AuthLoadingButton
              type="submit"
              className="w-full"
              isLoading={isPending}
              loadingText={merged.loadingLabel}
              data-testid="sign-up-submit"
            >
              {merged.submitLabel}
            </AuthLoadingButton>
          </div>
        </form>
      </CardContent>

      {signInHref && (
        <CardFooter className="border-border/40 justify-center border-t pt-5">
          <p className="text-muted-foreground text-center text-sm">
            {merged.signInPrompt}{' '}
            <Button variant="link" asChild className="text-primary hover:text-primary/80 h-auto p-0 font-medium">
              <a href={signInHref}>{merged.signInLabel}</a>
            </Button>
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
