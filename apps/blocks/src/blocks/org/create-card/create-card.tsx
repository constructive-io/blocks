'use client';

/**
 * org-create-card  (registry: org-create-card)
 *
 * Multi-step wizard to create a new organization. Under the Constructive unified
 * User model, an "org" is a `users` row with `type=2`. This block inserts that
 * row; the `org_mbr_trg` DB trigger auto-creates the owner membership row.
 *
 * Binding: CASE (a) — both hooks (`useCreateUserMutation`, `useUsersQuery`) exist
 * in the host's generated `auth` SDK. Imported from `@/generated/auth`; called
 * with `selection` field-pickers. No fetch, no GraphQL document string, no client
 * bootstrap in this file (sdk-binding-contract.md §3, §5).
 *
 * Steps:
 *   1. Display name + slug (with debounced availability check)
 *   2. Logo upload (optional — failure is non-fatal; skip to proceed without logo)
 *   3. Confirm summary → submit
 *
 * Override seam: `onSubmit` replaces the generated-hook call entirely. The block
 * still owns multi-step state, validation, error display, and callback firing.
 */

import { useEffect, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@constructive-io/ui/avatar';

import { cn } from '@/lib/utils';
import { useCreateUserMutation, useUsersQuery } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';

import { defaultOrgCreateCardMessages, type OrgCreateCardMessageOverrides } from './messages';

// ============================================================================
// Public types
// ============================================================================

/** Normalized user type — never leaks the raw integer. */
function normalizeUserType(raw: number | null | undefined): 'person' | 'organization' {
  if (raw === 2) return 'organization';
  return 'person';
}

export type User = {
  id: string;
  type: 'person' | 'organization';
  displayName: string | null;
  username: string | null;
  profilePicture: string | null;
};

export type OrgCreateInput = {
  displayName: string;
  username: string;
  profilePicture?: File | null;
};

export type OrgCreateResult = {
  org: User;
};

export type OrgCreateCardProps = {
  /** Initial value for the display name field. */
  defaultName?: string;
  /** Show the logo upload step. Default: true */
  showLogoStep?: boolean;
  messages?: OrgCreateCardMessageOverrides;
  /** Replace the default `useCreateUserMutation` call. Receives the same vars. */
  onSubmit?: (input: OrgCreateInput) => Promise<OrgCreateResult>;
  /** Fires after successful org creation. Receives the new org User. */
  onSuccess?: (result: OrgCreateResult) => void;
  onError?: (err: { message: string; code: string }) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ============================================================================
// Step 1 form values
// ============================================================================

type Step1Values = {
  displayName: string;
  username: string;
};

// ============================================================================
// Component
// ============================================================================

export function OrgCreateCard({
  defaultName,
  showLogoStep = true,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: OrgCreateCardProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged = {
    ...defaultOrgCreateCardMessages,
    ...messageOverrides,
    errors: { ...defaultOrgCreateCardMessages.errors, ...messageOverrides?.errors }
  };

  // ── Step state ──────────────────────────────────────────────────────────
  const totalSteps = showLogoStep ? 3 : 2;
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Step 1 values (carry across steps) ──────────────────────────────────
  const [step1Values, setStep1Values] = useState<Step1Values>({
    displayName: defaultName ?? '',
    username: ''
  });
  // Track manual slug edit so we stop auto-deriving after the user touches it.
  const slugManuallyEdited = useRef(false);

  // ── Step 2 logo state ───────────────────────────────────────────────────
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // ── Global error / pending ──────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);
  const [overridePending, setOverridePending] = useState(false);

  // ── Generated hooks ──────────────────────────────────────────────────────
  const defaultMutation = useCreateUserMutation({
    selection: {
      fields: {
        id: true,
        type: true,
        displayName: true,
        username: true,
        profilePicture: true
      }
    }
  });

  const isPending = onSubmitOverride ? overridePending : defaultMutation.isPending;

  // ── Slug availability check (debounced) ──────────────────────────────────
  const [debouncedSlug, setDebouncedSlug] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSlug(step1Values.username), 300);
    return () => clearTimeout(t);
  }, [step1Values.username]);

  const slugCheckEnabled = debouncedSlug.length >= 2 && /^[a-z0-9-]+$/.test(debouncedSlug);
  const slugCheck = useUsersQuery({
    selection: {
      fields: { id: true },
      where: { username: { equalTo: debouncedSlug } }
    },
    enabled: slugCheckEnabled
  });
  const slugAvailable =
    slugCheckEnabled && !slugCheck.isLoading && (slugCheck.data?.users?.nodes?.length ?? 0) === 0;
  const slugTaken =
    slugCheckEnabled && !slugCheck.isLoading && (slugCheck.data?.users?.nodes?.length ?? 0) > 0;

  // ── Auto-derive slug from display name ──────────────────────────────────
  function deriveSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ── Step 1 TanStack form ────────────────────────────────────────────────
  const step1Form = useForm({
    defaultValues: {
      displayName: step1Values.displayName,
      username: step1Values.username
    } as Step1Values,
    onSubmit: async ({ value }) => {
      if (slugTaken) return;
      setStep1Values(value);
      if (showLogoStep) {
        setStep(2);
      } else {
        setStep(3);
      }
    }
  });

  // ── Logo handling ────────────────────────────────────────────────────────
  function handleLogoChange(file: File | null) {
    setLogoError(null);
    if (!file) {
      setLogoFile(null);
      setLogoPreviewUrl(null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('File must be under 2 MB.');
      return;
    }
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setLogoError('Only PNG or JPG files are supported.');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleCreate() {
    setError(null);
    const input: OrgCreateInput = {
      displayName: step1Values.displayName,
      username: step1Values.username,
      profilePicture: logoFile ?? null
    };

    if (onSubmitOverride) setOverridePending(true);
    try {
      let result: OrgCreateResult;
      if (onSubmitOverride) {
        result = await onSubmitOverride(input);
      } else {
        const data = await defaultMutation.mutateAsync({
          displayName: input.displayName,
          username: input.username,
          type: 2
          // profilePicture upload is handled by the host via the objects namespace;
          // the block passes null here unless the host wires a pre-upload adapter.
        });
        const rawUser = data.createUser?.user;
        if (!rawUser) throw new Error(merged.errors.UNKNOWN_ERROR);
        const org: User = {
          id: rawUser.id,
          type: normalizeUserType(rawUser.type ?? null),
          displayName: rawUser.displayName ?? null,
          username: rawUser.username ?? null,
          profilePicture: rawUser.profilePicture ? String(rawUser.profilePicture) : null
        };
        result = { org };
      }
      const successMessage = merged.successToast.replace('{{name}}', step1Values.displayName);
      onMessage?.({ kind: 'success', key: 'orgCreate.success', message: successMessage });
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

  // ── Step indicators ──────────────────────────────────────────
  // stepStates maps visual position index → actual step state value.
  // When showLogoStep=false, step 2 is skipped so positions map to states [1, 3].
  const stepStates: (1 | 2 | 3)[] = showLogoStep ? [1, 2, 3] : [1, 3];
  const stepLabels = showLogoStep
    ? [merged.step1Title, merged.step2Title, merged.step3Title]
    : [merged.step1Title, merged.step3Title];
  // Display index for footer: which position (1-based) is the current step state.
  const displayStep = stepStates.indexOf(step) + 1;

  function renderStepIndicators() {
    return (
      <div className="flex items-center gap-2 mb-4" role="list">
        {stepLabels.map((label, i) => {
          const stateForPosition = stepStates[i];
          const isCurrent = stateForPosition === step;
          const isDone = stateForPosition < step;
          return (
            <div
              key={stateForPosition}
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}
              className="flex items-center gap-1"
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-medium',
                  isCurrent && 'bg-primary text-primary-foreground',
                  isDone && 'bg-primary/30 text-primary',
                  !isCurrent && !isDone && 'bg-muted text-muted-foreground'
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  'text-xs hidden sm:block',
                  isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
              {i < stepLabels.length - 1 && (
                <div className={cn('h-px w-4 mx-1', isDone ? 'bg-primary/40' : 'bg-border')} />
              )}
            </div>
          );
        })}
      </div>
    );
  }
  // ── Step 1: Name + Slug ───────────────────────────────────────────────────
  function renderStep1() {
    return (
      <form
        noValidate
        aria-busy={false}
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          step1Form.handleSubmit();
        }}
      >
        <h2 className="text-sm font-semibold text-foreground">{merged.step1Title}</h2>

        <step1Form.Field
          name="displayName"
          validators={{
            onChange: ({ value }) => {
              if (!value) return merged.nameRequired;
              if (value.length < 2) return merged.nameTooShort;
              return undefined;
            }
          }}
        >
          {(field) => (
            <FormField
              field={{
                ...field,
                handleChange: (v: string) => {
                  field.handleChange(v);
                  if (!slugManuallyEdited.current) {
                    const derived = deriveSlug(v);
                    step1Form.setFieldValue('username', derived);
                    setStep1Values((prev) => ({ ...prev, username: derived }));
                  }
                  setStep1Values((prev) => ({ ...prev, displayName: v }));
                }
              }}
              label={merged.nameLabel}
              placeholder={merged.namePlaceholder}
              testId="org-displayName"
            />
          )}
        </step1Form.Field>

        <step1Form.Field
          name="username"
          validators={{
            onChange: ({ value }) => {
              if (!value) return merged.nameRequired;
              if (!/^[a-z0-9-]+$/.test(value)) return merged.slugInvalid;
              if (value.length < 2) return merged.nameTooShort;
              return undefined;
            }
          }}
        >
          {(field) => (
            <div className="space-y-1">
              <FormField
                field={{
                  ...field,
                  handleChange: (v: string) => {
                    slugManuallyEdited.current = true;
                    field.handleChange(v);
                    setStep1Values((prev) => ({ ...prev, username: v }));
                  }
                }}
                label={merged.slugLabel}
                placeholder={merged.slugPlaceholder}
                testId="org-username"
              />
              <p className="text-xs text-muted-foreground">{merged.slugHint}</p>
              {step1Values.username.length >= 2 && (
                <div aria-live="polite" className="text-xs font-medium">
                  {slugCheck.isLoading && (
                    <span className="text-muted-foreground">Checking…</span>
                  )}
                  {!slugCheck.isLoading && slugAvailable && (
                    <span className="text-green-600" data-testid="slug-available">
                      {merged.slugAvailable}
                    </span>
                  )}
                  {!slugCheck.isLoading && slugTaken && (
                    <span className="text-destructive" data-testid="slug-taken">
                      {merged.slugTaken}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </step1Form.Field>

        <div className="flex justify-end pt-2">
          <Button type="submit" data-testid="step1-next">
            {merged.nextButton}
          </Button>
        </div>
      </form>
    );
  }

  // ── Step 2: Logo (optional) ───────────────────────────────────────────────
  function renderStep2() {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">{merged.step2Title}</h2>

        <div className="flex items-start gap-4">
          <Avatar className="size-16 rounded-lg">
            {logoPreviewUrl ? (
              <AvatarImage src={logoPreviewUrl} alt={step1Values.displayName} />
            ) : null}
            <AvatarFallback className="rounded-lg text-lg">
              {step1Values.displayName.slice(0, 2).toUpperCase() || 'ORG'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-foreground">
              {merged.logoLabel}
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              aria-label={merged.logoLabel}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-primary/15"
              onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
              data-testid="org-logo-input"
            />
            <p className="text-xs text-muted-foreground">{merged.logoHint}</p>
            {logoError && (
              <p className="text-xs text-destructive" aria-live="polite">
                {logoError}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="ghost" type="button" onClick={() => setStep(1)} data-testid="step2-back">
            {merged.backButton}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setLogoFile(null);
                setLogoPreviewUrl(null);
                setStep(3);
              }}
              data-testid="step2-skip"
            >
              {merged.logoSkip}
            </Button>
            <Button
              type="button"
              onClick={() => setStep(3)}
              data-testid="step2-next"
            >
              {merged.nextButton}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Confirm + submit ──────────────────────────────────────────────
  function renderStep3() {
    const prevStep = showLogoStep ? (2 as 1 | 2 | 3) : (1 as 1 | 2 | 3);
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">{merged.step3Title}</h2>

        <div className="rounded-md border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 rounded-md">
              {logoPreviewUrl ? (
                <AvatarImage src={logoPreviewUrl} alt={step1Values.displayName} />
              ) : null}
              <AvatarFallback className="rounded-md text-sm">
                {step1Values.displayName.slice(0, 2).toUpperCase() || 'ORG'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{step1Values.displayName}</p>
              <p className="text-xs text-muted-foreground">@{step1Values.username}</p>
            </div>
          </div>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="text-muted-foreground min-w-16">{merged.confirmName}</dt>
              <dd className="font-medium">{step1Values.displayName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground min-w-16">{merged.confirmSlug}</dt>
              <dd className="font-mono text-xs font-medium">{step1Values.username}</dd>
            </div>
          </dl>
        </div>

        <AuthErrorAlert error={error} />

        <div className="flex justify-between pt-2">
          <Button variant="ghost" type="button" onClick={() => setStep(prevStep)} data-testid="step3-back">
            {merged.backButton}
          </Button>
          <AuthLoadingButton
            type="button"
            isLoading={isPending}
            loadingText={merged.submitButtonPending}
            onClick={handleCreate}
            data-testid="org-submit"
          >
            {merged.submitButton}
          </AuthLoadingButton>
        </div>
      </div>
    );
  }

  return (
    <Card data-slot="create-card" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <CardTitle>{merged.title}</CardTitle>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {renderStepIndicators()}
        {step === 1 && renderStep1()}
        {step === 2 && showLogoStep && renderStep2()}
        {step === 3 && renderStep3()}
      </CardContent>

      <CardFooter className="border-border/40 border-t pt-4">
        <p className="text-muted-foreground text-xs">
          Step {displayStep} of {totalSteps}
        </p>
      </CardFooter>
    </Card>
  );
}
