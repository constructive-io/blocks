'use client';

/**
 * settings-form  (registry: org-settings-form)
 *
 * Form for editing an org's basic settings: display name, URL slug, and logo.
 * Since an org IS a `users` row (type=2), this block updates the
 * `constructive_users_public.users` row scoped to the target org. Includes a
 * Danger Zone section for org deletion (requires step-up + typed confirmation).
 *
 * Binding doctrine (sdk-binding-contract.md §5–§7):
 *   • `useUserQuery` and `useUpdateUserMutation` → imported from `@/generated/auth`
 *     (CASE a — these hooks exist in the generated SDK).
 *   • `useDeleteOrgMutation` → does NOT exist in the generated SDK (CASE b —
 *     backend-pending procedure `delete_org`). The `onDeleteSubmit` prop is the
 *     primary/required path for deletion; hosts wire the generated binding once
 *     the procedure ships and they regenerate the SDK. Until then, the block
 *     compiles and the deletion UI uses the override path.
 *   • NO fetch, NO GraphQL document string, NO configure()/getClient(),
 *     NO QueryClientProvider in this file.
 */

import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';
import { Separator } from '@constructive-io/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@constructive-io/ui/dialog';

import { cn } from '@/lib/utils';
import { useUserQuery, useUpdateUserMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';
import { useStepUp, StepUpError } from '@/blocks/auth/use-step-up/use-step-up';

import {
  defaultOrgSettingsFormMessages,
  type OrgSettingsFormMessages,
  type OrgSettingsFormMessageOverrides,
} from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type OrgSettingsInput = {
  displayName: string;
  username: string;
  /** Pass a File to upload; pass null to remove; omit / undefined to keep current. */
  profilePicture?: File | null;
};

export type OrgSettingsResult = {
  id: string;
  displayName: string;
  username: string;
  profilePicture: string | null;
};

export type OrgSettingsFormProps = {
  /** The org User id (type=2). Required. */
  orgId: string;
  messages?: OrgSettingsFormMessageOverrides;
  /** Adapter override for settings save. Replaces `useUpdateUserMutation`. */
  onSubmit?: (input: OrgSettingsInput) => Promise<OrgSettingsResult>;
  /** Fires after successful settings save. */
  onSaveSuccess?: (result: OrgSettingsResult) => void;
  /**
   * Primary path for org deletion (backend-pending: `delete_org` proc not yet
   * deployed → `useDeleteOrgMutation` absent from generated SDK). The host wires
   * the generated hook here once the procedure ships and they regenerate the SDK.
   *
   * Step-up (tier 'high') is called BEFORE this prop, inside the block.
   */
  onDeleteSubmit?: (orgId: string) => Promise<void>;
  /** Fires after successful org deletion. Caller should switch to personal account. */
  onDeleteSuccess?: () => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors, and non-fatal branches. */
  onMessage?: (event: {
    kind: 'success' | 'error' | 'info' | 'warning';
    key: string;
    message?: string;
  }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Form shape
// ---------------------------------------------------------------------------

type SettingsFormValues = {
  displayName: string;
  username: string;
};

// ---------------------------------------------------------------------------
// Slug validation
// ---------------------------------------------------------------------------

const SLUG_RE = /^[a-zA-Z0-9-]+$/;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrgSettingsForm({
  orgId,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSaveSuccess,
  onDeleteSubmit,
  onDeleteSuccess,
  onError,
  onMessage,
  className,
}: OrgSettingsFormProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: OrgSettingsFormMessages = {
    ...defaultOrgSettingsFormMessages,
    ...messageOverrides,
    errors: { ...defaultOrgSettingsFormMessages.errors, ...messageOverrides?.errors },
  };

  // -----------------------------------------------------------------------
  // Generated hooks — CASE a (these exist in the auth SDK)
  //
  // Hook arg shape is VERIFIED against the real generated auth SDK
  // (`@constructive-io/graphql-codegen` output): the singular `useUserQuery`
  // takes `id` at the TOP LEVEL of params (`{ id, selection }`) — NOT
  // `where: { id }`. The `where: { id }` form (SDK-001) is the raw GraphQL/ORM
  // layer; the generated React hook wraps `client.user.findOne({ id, select })`
  // and exposes `id` directly. Result shape is `{ user: ... | null }`.
  // Do NOT rewrite this to `where: { id }` — that breaks the generated hook.
  // -----------------------------------------------------------------------
  const orgData = useUserQuery({
    id: orgId,
    selection: {
      fields: {
        id: true,
        displayName: true,
        username: true,
        profilePicture: true,
      },
    },
  });

  const updateUser = useUpdateUserMutation({
    selection: {
      fields: {
        id: true,
        displayName: true,
        username: true,
        profilePicture: true,
      },
    },
  });

  // -----------------------------------------------------------------------
  // Step-up hook
  // -----------------------------------------------------------------------
  const stepUp = useStepUp();

  // -----------------------------------------------------------------------
  // Local state
  // -----------------------------------------------------------------------
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Hybrid isPending for save: override path tracks its own pending state.
  const [overridePending, setOverridePending] = useState(false);
  const isSavePending = onSubmitOverride ? overridePending : updateUser.isPending;

  // Track whether slug has been changed from the loaded value (warn on change).
  const [originalSlugState, setOriginalSlugState] = useState<{
    orgId: string;
    slug: string;
  } | null>(null);

  // -----------------------------------------------------------------------
  // Current org values (from query)
  // -----------------------------------------------------------------------
  const orgUser = orgData.data?.user;
  const currentDisplayName = orgUser?.displayName ?? '';
  const currentSlug = orgUser?.username ?? '';
  const originalSlug = originalSlugState?.orgId === orgId ? originalSlugState.slug : null;

  useEffect(() => {
    if (originalSlug === null && currentSlug && orgUser?.id === orgId) {
      setOriginalSlugState({ orgId, slug: currentSlug });
    }
  }, [currentSlug, orgId, orgUser?.id, originalSlug]);

  // -----------------------------------------------------------------------
  // Save settings (mutation)
  // -----------------------------------------------------------------------
  async function runSave(input: OrgSettingsInput): Promise<OrgSettingsResult> {
    if (onSubmitOverride) return onSubmitOverride(input);
    const data = await updateUser.mutateAsync({
      id: orgId,
      userPatch: {
        displayName: input.displayName,
        username: input.username,
        // profilePicture upload is out of scope for v1 (objects namespace is separate);
        // the field is accepted in OrgSettingsInput for forward-compat.
      },
    });
    // Result: { updateUser: { user: { id, displayName, username, profilePicture } } }
    const u = (data as { updateUser?: { user?: Record<string, unknown> } }).updateUser?.user;
    return {
      id: (u?.id as string) ?? orgId,
      displayName: (u?.displayName as string) ?? input.displayName,
      username: (u?.username as string) ?? input.username,
      profilePicture: (u?.profilePicture as string | null) ?? null,
    };
  }

  async function handleSave(values: SettingsFormValues) {
    setSaveError(null);
    if (onSubmitOverride) setOverridePending(true);
    try {
      const result = await runSave({
        displayName: values.displayName.trim(),
        username: values.username.trim(),
      });
      onMessage?.({ kind: 'success', key: 'orgSettings.saved', message: merged.saveSuccessToast });
      onSaveSuccess?.(result);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR,
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setSaveError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitOverride) setOverridePending(false);
    }
  }

  // -----------------------------------------------------------------------
  // TanStack Form
  // -----------------------------------------------------------------------
  const form = useForm({
    defaultValues: {
      displayName: currentDisplayName,
      username: currentSlug,
    } as SettingsFormValues,
    onSubmit: async ({ value }) => {
      await handleSave(value);
    },
  });

  // -----------------------------------------------------------------------
  // Delete org (CASE b — backend-pending, onDeleteSubmit is primary path)
  // -----------------------------------------------------------------------
  async function handleDeleteConfirm() {
    if (!onDeleteSubmit) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      // Step-up: tier 'high' gates the delete (step-up-contract.md §6).
      await stepUp({ tier: 'high' });
    } catch (err) {
      setIsDeleting(false);
      // StepUpError with reason 'cancelled' → silent return (user dismissed dialog).
      if (err instanceof StepUpError && err.reason === 'cancelled') {
        setIsDeleteDialogOpen(false);
        setDeleteConfirmText('');
        return;
      }
      // Other step-up failure → show error.
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR,
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setDeleteError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
      return;
    }

    try {
      await onDeleteSubmit(orgId);
      setIsDeleteDialogOpen(false);
      setDeleteConfirmText('');
      onMessage?.({ kind: 'success', key: 'orgSettings.deleted', message: merged.deleteSuccessToast.replace('{{orgName}}', currentDisplayName) });
      onDeleteSuccess?.();
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR,
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setDeleteError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      setIsDeleting(false);
    }
  }

  // -----------------------------------------------------------------------
  // Derived state for delete confirmation
  // -----------------------------------------------------------------------
  const isDeleteConfirmDisabled = deleteConfirmText !== currentDisplayName || !onDeleteSubmit;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div data-slot="settings-form" className={cn('w-full max-w-sm mx-auto', className)}>
      <Card>
        <CardHeader>
          <CardTitle>{merged.title}</CardTitle>
          <CardDescription>{merged.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <AuthErrorAlert error={saveError} />

          <form
            noValidate
            aria-busy={isSavePending}
            aria-label="Organization settings"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            {/* Display name */}
            <form.Field
              name="displayName"
              validators={{
                onChange: ({ value }) => {
                  if (!value || !value.trim()) return merged.nameRequired;
                  if (value.trim().length < 2) return merged.nameTooShort;
                  return undefined;
                },
              }}
            >
              {(field) => (
                <FormField
                  field={field}
                  label={merged.nameLabel}
                  placeholder={merged.namePlaceholder}
                  type="text"
                />
              )}
            </form.Field>

            {/* URL slug */}
            <form.Field
              name="username"
              validators={{
                onChange: ({ value }) => {
                  if (!value || !value.trim()) return merged.slugInvalid;
                  if (!SLUG_RE.test(value.trim())) return merged.slugInvalid;
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-1">
                  <FormField
                    field={field}
                    label={merged.slugLabel}
                    placeholder={merged.slugPlaceholder}
                    type="text"
                  />
                  <p className="text-muted-foreground text-xs">{merged.slugHint}</p>
                  {/* Warn when slug has been changed from its original value */}
                  {originalSlug &&
                    field.state.value &&
                    field.state.value !== originalSlug && (
                      <p
                        aria-live="polite"
                        className="text-yellow-600 text-xs"
                      >
                        {merged.slugChangeWarning}
                      </p>
                    )}
                </div>
              )}
            </form.Field>

            <div className="pt-2">
              <AuthLoadingButton
                type="submit"
                className="w-full"
                isLoading={isSavePending}
                loadingText={merged.saveButtonPending}
                data-testid="save-settings-submit"
              >
                {merged.saveButton}
              </AuthLoadingButton>
            </div>
          </form>

          {/* Danger Zone */}
          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-destructive">{merged.dangerZoneTitle}</h3>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={!onDeleteSubmit}
              data-testid="delete-org-button"
            >
              {merged.deleteOrgButton}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{merged.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>
              {merged.deleteConfirmDescription.replace('{{orgName}}', currentDisplayName)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <AuthErrorAlert error={deleteError} />
            <div className="space-y-1">
              <Label htmlFor="delete-confirm-input">{currentDisplayName}</Label>
              <Input
                id="delete-confirm-input"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={currentDisplayName}
                data-testid="delete-confirm-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteConfirmText('');
                setDeleteError(null);
              }}
              data-testid="delete-cancel-button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleteConfirmDisabled || isDeleting}
              data-testid="delete-confirm-button"
            >
              {isDeleting ? 'Deleting…' : merged.deleteConfirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
