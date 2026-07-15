'use client';

/**
 * api-key-create-dialog  (registry: auth-api-key-create-dialog)
 *
 * Modal dialog form for creating a new user-scoped API key.
 * Enforces high-severity step-up (`tier: 'high'`) before calling
 * `createApiKey`. On success, delivers the raw key + metadata to
 * `onSuccess`; the parent (auth-account-api-keys-list) is responsible
 * for opening auth-api-key-created-modal to show the one-time key value.
 *
 * Data path — GENERATED hook only:
 *   `useCreateApiKeyMutation` imported from `@/generated/auth`.
 *   No fetch, no GraphQL document string, no @constructive-io/data.
 *   No client bootstrap — blocks-runtime does all wiring.
 *
 * Hook signature (verified against reference SDK):
 *   variables: { input: { keyName?, accessLevel?, mfaLevel?, expiresIn?: IntervalInput } }
 *   payload wrapper: data.createApiKey → CreateApiKeyRecord { apiKey, keyId, expiresAt }
 *   i.e. result is nested under `result` field → data.createApiKey.result
 *
 * Step-up: `await stepUp({ tier: 'high' })` gates the mutation. If step-up is
 * cancelled (`StepUpError.reason === 'cancelled'`) the dialog stays open without
 * firing error callbacks (silent return per step-up-contract.md §3).
 *
 * (sdk-binding-contract.md §5–§7, block-contract.md §10)
 */

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@constructive-io/ui/dialog';
import { Button } from '@constructive-io/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@constructive-io/ui/select';

import { cn } from '@/lib/utils';
import { useCreateApiKeyMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';
import { useStepUp, StepUpError } from '@/blocks/auth/use-step-up/use-step-up';

import {
  defaultApiKeyCreateDialogMessages,
  type ApiKeyCreateDialogMessages,
  type ApiKeyCreateDialogMessageOverrides
} from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Variables the create-api-key call receives. The override `onSubmit` gets these verbatim. */
export type ApiKeyCreateInput = {
  /** Key name. Non-empty, trimmed, max 100 chars. */
  name: string;
  accessLevel: string;
  mfaLevel: string;
  /**
   * Postgres interval string (e.g. "30 days") or null for no expiry.
   * NOTE: The backend expects an `IntervalInput` object. This block converts
   * the preset string values to the correct { days: N } shape internally.
   * When onSubmit override is provided it receives the raw preset value.
   */
  expiresIn: string | null;
};

export type ApiKeyCreatedResult = {
  keyId: string;
  rawKey: string;
  name: string;
  expiresAt: string | null;
};

export type AccessLevelOption = { value: string; label: string };
export type MfaLevelOption = { value: string; label: string };

export type ApiKeyCreateDialogProps = {
  /** Controlled open state. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Available access levels. Default: ['read_only', 'full_access'].
   * The deployed `create_api_key` proc ONLY accepts `read_only` | `full_access`.
   */
  accessLevelOptions?: AccessLevelOption[];
  /**
   * Available MFA levels. Default: ['none', 'verified'].
   * The deployed `create_api_key` proc ONLY accepts `none` | `verified`.
   */
  mfaLevelOptions?: MfaLevelOption[];
  messages?: ApiKeyCreateDialogMessageOverrides;
  /**
   * Replace the default `useCreateApiKeyMutation` call.
   * Receives the raw form values after step-up succeeds.
   */
  onSubmit?: (input: ApiKeyCreateInput) => Promise<ApiKeyCreatedResult>;
  /**
   * Fires on successful creation with the raw key and metadata.
   * Parent should use this to open auth-api-key-created-modal.
   * Always fires.
   */
  onSuccess: (result: ApiKeyCreatedResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for step-up events and errors. Always fires. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Interval conversion
// ---------------------------------------------------------------------------

/** Convert preset expiry strings to IntervalInput for the backend. */
function expiresInToInterval(value: string | null): { days: number } | undefined {
  if (!value) return undefined;
  const map: Record<string, number> = {
    '30 days': 30,
    '90 days': 90,
    '180 days': 180,
    '365 days': 365
  };
  const days = map[value];
  if (days) return { days };
  return undefined;
}

// ---------------------------------------------------------------------------
// Default option sets
// ---------------------------------------------------------------------------

// The deployed `create_api_key` proc only accepts these enum values:
//   accessLevel ∈ { read_only, full_access }   mfaLevel ∈ { none, verified }
// Any other value (e.g. read/write/admin, required) -> INVALID_ACCESS_LEVEL.
const DEFAULT_ACCESS_LEVEL_OPTIONS: AccessLevelOption[] = [
  { value: 'read_only', label: 'Read only' },
  { value: 'full_access', label: 'Full access' }
];

const DEFAULT_MFA_LEVEL_OPTIONS: MfaLevelOption[] = [
  { value: 'none', label: 'None' },
  { value: 'verified', label: 'Verified' }
];

// ---------------------------------------------------------------------------
// Form data
// ---------------------------------------------------------------------------

interface ApiKeyFormData {
  name: string;
  accessLevel: string;
  mfaLevel: string;
  expiresIn: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApiKeyCreateDialog({
  open,
  onOpenChange,
  accessLevelOptions = DEFAULT_ACCESS_LEVEL_OPTIONS,
  mfaLevelOptions = DEFAULT_MFA_LEVEL_OPTIONS,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: ApiKeyCreateDialogProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: ApiKeyCreateDialogMessages = {
    ...defaultApiKeyCreateDialogMessages,
    ...messageOverrides,
    expiresInOptions: {
      ...defaultApiKeyCreateDialogMessages.expiresInOptions,
      ...messageOverrides?.expiresInOptions
    },
    errors: {
      ...defaultApiKeyCreateDialogMessages.errors,
      ...messageOverrides?.errors
    }
  };

  // Generated hook from the host's `auth` SDK (sdk-binding-contract.md §5).
  // Payload: data.createApiKey.result -> { apiKey, keyId, expiresAt }
  const defaultMutation = useCreateApiKeyMutation({
    selection: {
      fields: {
        result: {
          select: {
            apiKey: true,
            keyId: true,
            expiresAt: true
          }
        }
      }
    }
  });

  const stepUp = useStepUp();

  // Hybrid pending: generated hook tracks its own; override path uses local state.
  const [overridePending, setOverridePending] = useState(false);
  const isPending = onSubmitOverride ? overridePending : defaultMutation.isPending;

  const [error, setError] = useState<string | null>(null);

  async function runCreate(input: ApiKeyCreateInput): Promise<ApiKeyCreatedResult> {
    if (onSubmitOverride) return onSubmitOverride(input);
    // Build the interval input from the preset string.
    const interval = expiresInToInterval(input.expiresIn);
    const data = await defaultMutation.mutateAsync({
      input: {
        keyName: input.name,
        accessLevel: input.accessLevel,
        mfaLevel: input.mfaLevel,
        ...(interval ? { expiresIn: interval } : {})
      }
    });
    const rec = data.createApiKey?.result;
    if (!rec?.keyId || !rec?.apiKey) {
      throw Object.assign(new Error('No key returned'), { extensions: { code: 'UNKNOWN_ERROR' } });
    }
    return {
      keyId: rec.keyId,
      rawKey: rec.apiKey,
      name: input.name,
      expiresAt: rec.expiresAt ?? null
    };
  }

  async function handleSubmit(values: ApiKeyFormData) {
    setError(null);

    // Step 1: step-up BEFORE mutation (step-up-contract.md §5, tier: 'high').
    try {
      await stepUp({ tier: 'high' });
    } catch (err) {
      if (err instanceof StepUpError && err.reason === 'cancelled') {
        // Silent return — dialog stays open, no error fired (step-up-contract.md §3).
        onMessage?.({ kind: 'info', key: 'stepUpCancelled', message: merged.stepUpCancelled });
        return;
      }
      // Step-up failed (non-cancel) — treat as error.
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
      return;
    }

    // Step 2: create the API key.
    if (onSubmitOverride) setOverridePending(true);
    try {
      const input: ApiKeyCreateInput = {
        name: values.name.trim(),
        accessLevel: values.accessLevel,
        mfaLevel: values.mfaLevel,
        expiresIn: values.expiresIn === '__none__' ? null : values.expiresIn
      };
      const result = await runCreate(input);

      // Do NOT auto-close here — parent closes and opens created-modal.
      // Prevents a flash where both dialog and modal try to render simultaneously
      // (spec §Notes).
      onSuccess(result);
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
      name: '',
      accessLevel: accessLevelOptions[0]?.value ?? 'read_only',
      mfaLevel: mfaLevelOptions[0]?.value ?? 'none',
      expiresIn: '__none__'
    } as ApiKeyFormData,
    onSubmit: async ({ value }) => {
      await handleSubmit(value);
    }
  });

  function handleCancel() {
    form.reset();
    setError(null);
    onOpenChange(false);
  }

  // Build expiry options from messages catalog.
  const expiryOptions = [
    { value: '__none__', label: merged.expiresInOptions.noExpiry },
    { value: '30 days', label: merged.expiresInOptions.days30 },
    { value: '90 days', label: merged.expiresInOptions.days90 },
    { value: '180 days', label: merged.expiresInOptions.days180 },
    { value: '365 days', label: merged.expiresInOptions.days365 }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-slot="api-key-create-dialog"
        className={cn('w-full max-w-sm mx-auto', className)}
        aria-labelledby="api-key-create-title"
        aria-describedby="api-key-create-description"
      >
        <DialogHeader>
          <DialogTitle id="api-key-create-title">{merged.title}</DialogTitle>
          <DialogDescription id="api-key-create-description">{merged.description}</DialogDescription>
        </DialogHeader>

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
          {/* Key name */}
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => {
                if (!value || !value.trim()) return 'Key name is required';
                if (value.trim().length > 100) return 'Key name must be 100 characters or fewer';
                return undefined;
              }
            }}
          >
            {(field) => (
              <FormField
                field={field}
                label={merged.nameLabel}
                placeholder={merged.namePlaceholder}
                type="text"
                testId="api-key-name"
              />
            )}
          </form.Field>

          {/* Access level */}
          <form.Field
            name="accessLevel"
            validators={{
              onChange: ({ value }) => (!value ? 'Access level is required' : undefined)
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <label
                  htmlFor="api-key-access-level"
                  className="text-sm font-medium leading-none"
                >
                  {merged.accessLevelLabel}
                </label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <SelectTrigger
                    id="api-key-access-level"
                    data-testid="api-key-access-level"
                    aria-invalid={field.state.meta.errors.length > 0}
                  >
                    <SelectValue placeholder={merged.accessLevelLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    {accessLevelOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.state.meta.errors.length > 0 && (
                  <p className="text-pretty text-destructive text-sm">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          {/* MFA level */}
          <form.Field
            name="mfaLevel"
            validators={{
              onChange: ({ value }) => (!value ? 'MFA level is required' : undefined)
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <label
                  htmlFor="api-key-mfa-level"
                  className="text-sm font-medium leading-none"
                >
                  {merged.mfaLevelLabel}
                </label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <SelectTrigger
                    id="api-key-mfa-level"
                    data-testid="api-key-mfa-level"
                    aria-invalid={field.state.meta.errors.length > 0}
                  >
                    <SelectValue placeholder={merged.mfaLevelLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    {mfaLevelOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.state.meta.errors.length > 0 && (
                  <p className="text-pretty text-destructive text-sm">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          {/* Expiry */}
          <form.Field name="expiresIn">
            {(field) => (
              <div className="space-y-1.5">
                <label
                  htmlFor="api-key-expires-in"
                  className="text-sm font-medium leading-none"
                >
                  {merged.expiresInLabel}
                </label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <SelectTrigger
                    id="api-key-expires-in"
                    data-testid="api-key-expires-in"
                  >
                    <SelectValue placeholder={merged.expiresInLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    {expiryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={isPending}
              data-testid="api-key-cancel"
            >
              {merged.cancelButton}
            </Button>
            <AuthLoadingButton
              type="submit"
              isLoading={isPending}
              loadingText={merged.creatingButton}
              disabled={isPending}
              data-testid="api-key-create-submit"
            >
              {merged.createButton}
            </AuthLoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
