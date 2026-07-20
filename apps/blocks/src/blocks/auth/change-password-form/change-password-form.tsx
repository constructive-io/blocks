'use client';

/**
 * change-password-form  (registry: auth-change-password-form)
 *
 * Inline form for authenticated users to update their password. Fields: current
 * password + new password + confirm new password. Before submitting, gates behind
 * `await stepUp({ tier: 'medium' })` (password re-verification). Provides inline
 * strength feedback for the new password via the `password-strength` foundation lib.
 *
 * Binding doctrine (sdk-binding-contract.md §3, MASTER-PROMPT §5):
 *   • Data path = `useSetPasswordMutation` from `@/generated/auth` with a
 *     `selection` field-picker. No fetch, no GraphQL document, no hardcoded URL.
 *   • NO client bootstrap: never calls `configure()`/`getClient()`, never mounts
 *     `<QueryClientProvider>`. The host's `@constructive/blocks-runtime` does that.
 *   • Override seam: `onSubmit` fully replaces the generated-hook call.
 *   • Error mapping via `parseGraphQLError` from the `auth-errors` foundation lib.
 */

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { cn } from '@/lib/utils';
import { useSetPasswordMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { estimatePasswordStrength } from '@/blocks/lib/password-strength';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';
import { useStepUp, StepUpError } from '@/blocks/auth/use-step-up/use-step-up';
import { Progress } from '@constructive-io/ui/progress';

import { defaultChangePasswordFormMessages, type ChangePasswordFormMessageOverrides, type ChangePasswordFormMessages } from './messages';

/** Input variables the change-password call receives. The override `onSubmit` gets these. */
export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type ChangePasswordResult = {
  success: boolean;
};

export type ChangePasswordFormProps = {
  /** Show new password strength meter (default: true). */
  showPasswordStrength?: boolean;
  /**
   * Whether to check step-up before submission.
   * Default: true. Set to false to skip when sign-in already verified recently.
   */
  requireStepUp?: boolean;
  messages?: ChangePasswordFormMessageOverrides;
  /** Replace the default `useSetPasswordMutation` call. Receives the same vars. */
  onSubmit?: (input: ChangePasswordInput) => Promise<boolean>;
  /** Fires after a successful password update. Always fires. */
  onSuccess?: (result: ChangePasswordResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success and mapped errors. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

type FormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function strengthLabel(merged: ChangePasswordFormMessages, label: 'weak' | 'fair' | 'good' | 'strong'): string {
  const map = {
    weak: merged.passwordStrengthWeak,
    fair: merged.passwordStrengthFair,
    good: merged.passwordStrengthGood,
    strong: merged.passwordStrengthStrong
  };
  return map[label];
}

function strengthColorClass(label: 'weak' | 'fair' | 'good' | 'strong'): string {
  const map = {
    weak: '[&_[data-slot=progress-indicator]]:bg-destructive',
    fair: '[&_[data-slot=progress-indicator]]:bg-yellow-500',
    good: '[&_[data-slot=progress-indicator]]:bg-blue-500',
    strong: '[&_[data-slot=progress-indicator]]:bg-green-500'
  };
  return map[label];
}

export function ChangePasswordForm({
  showPasswordStrength = true,
  requireStepUp: requireStepUpProp = true,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: ChangePasswordFormProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: ChangePasswordFormMessages = {
    ...defaultChangePasswordFormMessages,
    ...messageOverrides,
    errors: { ...defaultChangePasswordFormMessages.errors, ...messageOverrides?.errors }
  };

  // Generated hook from the host's `auth` SDK. The payload wraps the result
  // under `setPassword.result` (boolean). Verified against generated types.
  const defaultMutation = useSetPasswordMutation({
    selection: {
      fields: {
        result: true
      }
    }
  });

  // Step-up hook — imperative promise-based API (step-up-contract.md §3).
  const stepUp = useStepUp();

  // Hybrid pending: the generated hook tracks its own; the override path does not.
  const [overridePending, setOverridePending] = useState(false);
  const isPending = onSubmitOverride ? overridePending : defaultMutation.isPending;

  const [error, setError] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  async function handleChangePassword(values: FormData): Promise<void> {
    setError(null);

    // Confirm password mismatch guard.
    if (values.newPassword !== values.confirmPassword) {
      setError(merged.passwordMismatch);
      return;
    }

    // Step-up gate (tier: 'medium' → password re-verification per step-up-contract §6).
    if (requireStepUpProp) {
      try {
        await stepUp({ tier: 'medium' });
      } catch (err) {
        if (err instanceof StepUpError && err.reason === 'cancelled') {
          // User cancelled the dialog — surface as STEP_UP_CANCELLED.
          const message = merged.errors.STEP_UP_CANCELLED;
          setError(message);
          onMessage?.({ kind: 'error', key: 'STEP_UP_CANCELLED', message });
          onError?.({ message, code: 'STEP_UP_CANCELLED' });
          return;
        }
        // Other step-up failure.
        const { code, message } = parseGraphQLError(err, { customMessages: merged.errors, defaultMessage: merged.errors.UNKNOWN_ERROR });
        const key = code ?? 'UNKNOWN_ERROR';
        setError(message);
        onMessage?.({ kind: 'error', key, message });
        onError?.({ message, code: key });
        return;
      }
    }

    if (onSubmitOverride) setOverridePending(true);
    try {
      const input: ChangePasswordInput = {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      };

      let success: boolean;
      if (onSubmitOverride) {
        success = await onSubmitOverride(input);
      } else {
        const data = await defaultMutation.mutateAsync({ input: { currentPassword: values.currentPassword, newPassword: values.newPassword } });
        success = data.setPassword?.result ?? false;
      }

      if (!success) {
        // A resolved mutation returning false means current password was wrong.
        const message = merged.errors.INVALID_CREDENTIALS;
        setError(message);
        onMessage?.({ kind: 'error', key: 'INVALID_CREDENTIALS', message });
        onError?.({ message, code: 'INVALID_CREDENTIALS' });
        return;
      }

      onMessage?.({ kind: 'success', key: 'changePassword.success', message: merged.successMessage });
      onSuccess?.({ success: true });
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
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    } as FormData,
    onSubmit: async ({ value }) => {
      await handleChangePassword(value);
    }
  });

  const strength = showPasswordStrength && newPasswordValue ? estimatePasswordStrength(newPasswordValue) : null;
  const strengthPct = strength ? (strength.score / 4) * 100 : 0;

  return (
    <div
      data-slot="change-password-form"
      className={cn('w-full max-w-sm mx-auto', className)}
    >
      <h2 className="mb-4 text-balance text-lg font-semibold">{merged.title}</h2>

      <AuthErrorAlert error={error} />

      <form
        noValidate
        aria-busy={isPending}
        className="space-y-4 mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="currentPassword"
          validators={{
            onChange: ({ value }) => (!value ? 'Current password is required' : undefined)
          }}
        >
          {(field) => (
            <FormField
              field={field}
              label={merged.currentPasswordLabel}
              placeholder={merged.currentPasswordPlaceholder}
              type="password"
              testId="current-password"
            />
          )}
        </form.Field>

        <form.Field
          name="newPassword"
          validators={{
            onChange: ({ value }) => {
              setNewPasswordValue(value ?? '');
              if (!value) return 'New password is required';
              if (value.length < 8) return 'Password must be at least 8 characters';
              if (value.length > 63) return 'Password must be at most 63 characters';
              return undefined;
            }
          }}
        >
          {(field) => (
            <div className="space-y-1.5">
              <FormField
                field={field}
                label={merged.newPasswordLabel}
                placeholder={merged.newPasswordPlaceholder}
                type="password"
                testId="new-password"
              />
              {showPasswordStrength && newPasswordValue && strength && (
                <div className="space-y-1">
                  <Progress
                    role="progressbar"
                    aria-label="Password strength"
                    aria-valuenow={strengthPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    value={strengthPct}
                    className={cn('h-1.5', strengthColorClass(strength.label))}
                  />
                  <p className="text-pretty text-xs text-muted-foreground">{strengthLabel(merged, strength.label)}</p>
                </div>
              )}
            </div>
          )}
        </form.Field>

        <form.Field
          name="confirmPassword"
          validators={{
            onChange: ({ value }) => (!value ? 'Please confirm your new password' : undefined)
          }}
        >
          {(field) => (
            <FormField
              field={field}
              label={merged.confirmPasswordLabel}
              placeholder={merged.confirmPasswordPlaceholder}
              type="password"
              testId="confirm-password"
            />
          )}
        </form.Field>

        <div className="pt-2">
          <AuthLoadingButton
            type="submit"
            className="w-full"
            isLoading={isPending}
            loadingText={merged.submitButtonPending}
            data-testid="change-password-submit"
          >
            {merged.submitButton}
          </AuthLoadingButton>
        </div>
      </form>
    </div>
  );
}
