'use client';

/**
 * reset-password-card  (registry: auth-reset-password-card)
 *
 * New-password + confirm-password form to complete the password reset flow.
 * Reads `roleId` + `reset_token` from URL searchParams by default; the legacy
 * `token` parameter remains a fallback and prop overrides win.
 * States: 'form' | 'success' | 'expired' | 'missing-token'.
 *
 * Data path: the generated `useResetPasswordMutation` hook from `@/generated/auth`.
 * No fetch, no GraphQL document string, no `configure()`/`getClient()`.
 * Override seam: `onSubmit` fully replaces the generated-hook call.
 * Error mapping: `parseGraphQLError` from `@/blocks/lib/auth-errors`.
 * Password strength: `estimatePasswordStrength` from `@/blocks/lib/password-strength`.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from '@tanstack/react-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Progress } from '@constructive-io/ui/progress';

import { cn } from '@/lib/utils';
import { useResetPasswordMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/blocks/lib/schemas';
import { estimatePasswordStrength } from '@/blocks/lib/password-strength';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';

import { defaultResetPasswordCardMessages, type ResetPasswordCardMessages } from './messages';

type CardState = 'form' | 'success' | 'expired' | 'missing-token';

/** Variables the reset-password call receives. The override `onSubmit` gets these verbatim. */
export type ResetPasswordVars = {
  roleId: string;
  resetToken: string;
  newPassword: string;
};

/**
 * Message overrides. Top-level copy is shallow-partial; `errors` is itself
 * partial so a host can localize a single error code without restating the map.
 */
export type ResetPasswordCardMessageOverrides = Partial<Omit<ResetPasswordCardMessages, 'errors'>> & {
  errors?: Partial<ResetPasswordCardMessages['errors']>;
};

export type ResetPasswordCardProps = {
  /**
   * Role ID from URL. If not provided, read from `?role_id=` searchParam.
   * Prop wins over URL when provided.
   */
  roleId?: string;
  /**
   * Reset token from URL. If not provided, read from `?reset_token=` and then
   * the legacy `?token=` searchParam.
   * Prop wins over URL when provided.
   */
  token?: string;
  /** Show inline password-strength meter (default true). */
  showPasswordStrength?: boolean;
  /** App route path to restart forgot-password flow. Default: '/forgot-password'. */
  forgotPasswordPath?: string;
  /** App route path to sign in; rendered on success state. */
  signInPath?: string;
  messages?: ResetPasswordCardMessageOverrides;
  /** Replace the default `useResetPasswordMutation` call. Receives the same vars. */
  onSubmit?: (vars: ResetPasswordVars) => Promise<boolean | null>;
  /** Fires after a successful reset (before any host navigation). Always fires. */
  onSuccess?: (result: { success: boolean }) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors, and non-fatal branches. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

/** Error codes that indicate expired/invalid token — both map to 'expired' state. */
const EXPIRED_CODES = new Set(['EXPIRED_TOKEN', 'INVALID_TOKEN']);

function strengthLabelKey(label: string): keyof Pick<
  ResetPasswordCardMessages,
  'passwordStrengthWeak' | 'passwordStrengthFair' | 'passwordStrengthGood' | 'passwordStrengthStrong'
> {
  switch (label) {
    case 'fair': return 'passwordStrengthFair';
    case 'good': return 'passwordStrengthGood';
    case 'strong': return 'passwordStrengthStrong';
    default: return 'passwordStrengthWeak';
  }
}


export function ResetPasswordCard({
  roleId: roleIdProp,
  token: tokenProp,
  showPasswordStrength = true,
  forgotPasswordPath = '/forgot-password',
  signInPath,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: ResetPasswordCardProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: ResetPasswordCardMessages = {
    ...defaultResetPasswordCardMessages,
    ...messageOverrides,
    errors: { ...defaultResetPasswordCardMessages.errors, ...messageOverrides?.errors }
  };

  const searchParams = useSearchParams();

  // Resolve token + roleId: prop wins, fallback to URL params.
  const roleId = roleIdProp ?? searchParams.get('role_id') ?? undefined;
  const resetToken = tokenProp ?? searchParams.get('reset_token') ?? searchParams.get('token') ?? undefined;

  const [cardState, setCardState] = useState<CardState>('form');
  const [error, setError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');

  // Guard: if either param is missing after mount, show missing-token state.
  useEffect(() => {
    if (!roleId || !resetToken) {
      setCardState('missing-token');
    }
  }, [roleId, resetToken]);

  // Generated mutation hook.
  const defaultMutation = useResetPasswordMutation({
    selection: {
      fields: {
        result: true
      }
    }
  });

  // Hybrid pending: the generated hook tracks its own; the override path does not.
  const [overridePending, setOverridePending] = useState(false);
  const isPending = onSubmitOverride ? overridePending : defaultMutation.isPending;

  async function runResetPassword(vars: ResetPasswordVars): Promise<boolean | null> {
    if (onSubmitOverride) return onSubmitOverride(vars);
    const data = await defaultMutation.mutateAsync({ input: { roleId: vars.roleId, resetToken: vars.resetToken, newPassword: vars.newPassword } });
    return data.resetPassword?.result ?? null;
  }

  async function handleReset(values: ResetPasswordFormData) {
    if (!roleId || !resetToken) {
      setCardState('missing-token');
      return;
    }

    setError(null);
    if (onSubmitOverride) setOverridePending(true);
    try {
      resetPasswordSchema.parse(values);

      const result = await runResetPassword({
        roleId,
        resetToken,
        newPassword: values.newPassword
      });

      // result === false means server rejected the token (invalid/expired).
      if (result === false) {
        setCardState('expired');
        onMessage?.({ kind: 'error', key: 'INVALID_TOKEN', message: merged.errors.INVALID_TOKEN });
        onError?.({ message: merged.errors.INVALID_TOKEN, code: 'INVALID_TOKEN' });
        return;
      }

      // Successful reset.
      setCardState('success');
      onMessage?.({ kind: 'success', key: 'resetPassword.success', message: merged.successDescription });
      onSuccess?.({ success: true });
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';

      // Expired/invalid token → expired state (not inline error).
      if (code && EXPIRED_CODES.has(code)) {
        setCardState('expired');
        onMessage?.({ kind: 'error', key, message });
        onError?.({ message, code: key });
        return;
      }

      setError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitOverride) setOverridePending(false);
    }
  }

  const form = useForm({
    defaultValues: {
      newPassword: '',
      confirmPassword: ''
    } as { newPassword: string; confirmPassword: string },
    onSubmit: async ({ value }) => {
      await handleReset({ newPassword: value.newPassword });
    }
  });

  // ── Missing-token state ─────────────────────────────────────────────────────
  if (cardState === 'missing-token') {
    return (
      <Card data-slot="reset-password-card" className={cn('w-full max-w-sm mx-auto', className)}>
        <CardHeader>
          <CardTitle>{merged.missingTokenTitle}</CardTitle>
          <CardDescription>{merged.missingTokenMessage}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="link" asChild className="text-primary hover:text-primary/80 hover:no-underline min-h-11 px-2 py-0 font-medium sm:min-h-10">
            <a href={forgotPasswordPath}>{merged.expiredTokenRestartLabel}</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Expired-token state ─────────────────────────────────────────────────────
  if (cardState === 'expired') {
    return (
      <Card data-slot="reset-password-card" className={cn('w-full max-w-sm mx-auto', className)}>
        <CardHeader>
          <CardTitle>{merged.expiredTokenTitle}</CardTitle>
          <CardDescription>{merged.expiredTokenDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="link" asChild className="text-primary hover:text-primary/80 hover:no-underline min-h-11 px-2 py-0 font-medium sm:min-h-10">
            <a href={forgotPasswordPath}>{merged.expiredTokenRestartLabel}</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (cardState === 'success') {
    return (
      <Card data-slot="reset-password-card" className={cn('w-full max-w-sm mx-auto', className)}>
        <CardHeader>
          <CardTitle>{merged.successTitle}</CardTitle>
          <CardDescription>{merged.successDescription}</CardDescription>
        </CardHeader>
        {signInPath && (
          <CardContent>
            <Button variant="link" asChild className="text-primary hover:text-primary/80 hover:no-underline min-h-11 px-2 py-0 font-medium sm:min-h-10">
              <a href={signInPath}>{merged.successSignInLabel}</a>
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  // ── Form state ──────────────────────────────────────────────────────────────
  const strength = showPasswordStrength ? estimatePasswordStrength(passwordValue) : null;
  const strengthLabelText = strength ? merged[strengthLabelKey(strength.label)] : null;
  const strengthProgressValue = strength ? (strength.score / 4) * 100 : 0;

  return (
    <Card data-slot="reset-password-card" className={cn('w-full max-w-sm mx-auto', className)}>
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
            name="newPassword"
            validators={{
              onChange: ({ value }) => {
                setPasswordValue(value ?? '');
                if (!value) return 'New password is required';
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
                  label={merged.newPasswordLabel}
                  placeholder={merged.newPasswordPlaceholder}
                  type="password"
                  testId="newPassword"
                />
                {showPasswordStrength && passwordValue && strength && (
                  <div className="space-y-1">
                    <Progress
                      value={strengthProgressValue}
                      className="h-1.5"
                      data-testid="password-strength-bar"
                    />
                    <p className="text-pretty text-muted-foreground text-xs" data-testid="password-strength-label">
                      {strengthLabelText}
                    </p>
                  </div>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="confirmPassword"
            validators={{
              onChangeListenTo: ['newPassword'],
              onChange: ({ value, fieldApi }) => {
                const newPassword = fieldApi.form.getFieldValue('newPassword');
                if (!value) return 'Please confirm your password';
                if (value !== newPassword) return merged.passwordMismatch;
                return undefined;
              }
            }}
          >
            {(field) => (
              <FormField
                field={field}
                label={merged.confirmPasswordLabel}
                placeholder={merged.confirmPasswordPlaceholder}
                type="password"
                testId="confirmPassword"
              />
            )}
          </form.Field>

          <div className="pt-2">
            <AuthLoadingButton
              type="submit"
              className="w-full"
              isLoading={isPending}
              loadingText={merged.loadingLabel}
              data-testid="reset-password-submit"
            >
              {merged.submitLabel}
            </AuthLoadingButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
