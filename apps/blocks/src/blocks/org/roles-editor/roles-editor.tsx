'use client';

/**
 * roles-editor  (registry: org-roles-editor)
 *
 * Admin interface for managing named org role profiles. Each profile is a
 * named permission bundle drawn from the SPRT system. Org admins create,
 * update, and delete profiles — these feed into member-list and invite-dialog.
 *
 * DATA PATH (sdk-binding-contract.md §3):
 *   • useOrgProfilesQuery    — list profiles filtered by entityId (orgId)
 *   • useCreateOrgProfileMutation  — create a new profile
 *   • useUpdateOrgProfileMutation  — rename / edit an existing profile
 *   • useDeleteOrgProfileMutation  — delete a profile
 *   All hooks imported from @/generated/admin (the host's generated admin SDK).
 *
 * CASE (a): all four hooks ARE present in the reference SDK
 *   (useOrgProfilesQuery, useCreateOrgProfileMutation, useUpdateOrgProfileMutation,
 *    useDeleteOrgProfileMutation). Bound normally. PROCEDURE_NOT_FOUND is in
 *   messages.errors because the underlying DB procedures may not be deployed
 *   on every host — it surfaces at runtime until the pgpm module ships.
 *
 * OVERRIDE SEAM:
 *   • onSubmit?: (vars: OrgProfileSaveVars) => Promise<OrgProfileResult | null>
 *     replaces create + update mutations when provided.
 *   • onDelete?: (id: string) => Promise<void>
 *     replaces the delete mutation when provided.
 *
 * NO client bootstrap, NO QueryClientProvider, NO fetch, NO GraphQL strings.
 * blocks-runtime (host) mounts the single provider + configure().
 */

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Badge } from '@constructive-io/ui/badge';

import { cn } from '@/lib/utils';
import {
  useOrgProfilesQuery,
  useCreateOrgProfileMutation,
  useUpdateOrgProfileMutation,
  useDeleteOrgProfileMutation
} from '@/generated/admin';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';

import {
  defaultOrgRolesEditorMessages,
  type OrgRolesEditorMessageOverrides,
  type OrgRolesEditorMessages
} from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Variables the save call receives. The override onSubmit gets these verbatim. */
export type OrgProfileSaveVars = {
  /** Present when updating an existing profile; absent when creating. */
  id?: string;
  name: string;
  slug: string;
  description?: string;
  entityId: string;
};

/**
 * The profile record returned by the default mutations. Mirrors the fields
 * this block selects — declared here so the public surface does not depend on
 * generated type names.
 */
export type OrgProfileResult = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  entityId: string | null;
  isSystem: boolean | null;
  isDefault: boolean | null;
};

export type OrgRolesEditorProps = {
  /** The org's user id (User.type === 'organization'). Required. */
  orgId: string;
  messages?: OrgRolesEditorMessageOverrides;
  /**
   * Replace the default create/update mutation.
   * Receives OrgProfileSaveVars (id present = update, absent = create).
   */
  onSubmit?: (vars: OrgProfileSaveVars) => Promise<OrgProfileResult | null>;
  /** Replace the default delete mutation. */
  onDelete?: (id: string) => Promise<void>;
  /** Fires after a profile is saved. Always fires. */
  onProfileSaved?: (profileId: string) => void;
  /** Fires after a profile is deleted. Always fires. */
  onProfileDeleted?: (profileId: string) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for every event. Always fires. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional()
});

type ProfileFormData = z.infer<typeof profileSchema>;

/** Convert a display name to a URL-safe slug. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrgRolesEditor({
  orgId,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onDelete: onDeleteOverride,
  onProfileSaved,
  onProfileDeleted,
  onError,
  onMessage,
  className
}: OrgRolesEditorProps) {
  // Deep merge: top-level + errors map merged separately.
  const merged: OrgRolesEditorMessages = {
    ...defaultOrgRolesEditorMessages,
    ...messageOverrides,
    errors: {
      ...defaultOrgRolesEditorMessages.errors,
      ...messageOverrides?.errors
    }
  };

  // -------------------------------------------------------------------------
  // Generated hooks from the host's admin SDK
  // -------------------------------------------------------------------------

  const profilesQuery = useOrgProfilesQuery({
    selection: {
      fields: {
        id: true,
        name: true,
        slug: true,
        description: true,
        entityId: true,
        isSystem: true,
        isDefault: true
      },
      where: { entityId: { equalTo: orgId } }
    }
  });

  const createMutation = useCreateOrgProfileMutation({
    selection: { fields: { id: true, name: true, slug: true, description: true, entityId: true, isSystem: true, isDefault: true } }
  });

  const updateMutation = useUpdateOrgProfileMutation({
    selection: { fields: { id: true, name: true, slug: true, description: true, entityId: true, isSystem: true, isDefault: true } }
  });

  const deleteMutation = useDeleteOrgProfileMutation({
    selection: { fields: { id: true } }
  });

  // -------------------------------------------------------------------------
  // Local state
  // -------------------------------------------------------------------------

  /** null = list view; 'new' = create form; <uuid> = edit form */
  const [editing, setEditing] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Hybrid pending states
  const [overrideSavePending, setOverrideSavePending] = useState(false);
  const [overrideDeletePending, setOverrideDeletePending] = useState(false);

  const defaultSavePending = createMutation.isPending || updateMutation.isPending;
  const isSavePending = onSubmitOverride ? overrideSavePending : defaultSavePending;
  const isDeletePending = onDeleteOverride ? overrideDeletePending : deleteMutation.isPending;

  // -------------------------------------------------------------------------
  // Profiles list from query
  // -------------------------------------------------------------------------

  const profiles = (profilesQuery.data?.orgProfiles?.nodes ?? []) as OrgProfileResult[];

  // -------------------------------------------------------------------------
  // Save handler
  // -------------------------------------------------------------------------

  async function runSave(vars: OrgProfileSaveVars): Promise<OrgProfileResult | null> {
    if (onSubmitOverride) return onSubmitOverride(vars);
    if (vars.id) {
      const data = await updateMutation.mutateAsync({
        id: vars.id,
        orgProfilePatch: {
          name: vars.name,
          slug: vars.slug,
          description: vars.description ?? null
        }
      });
      return (data.updateOrgProfile?.orgProfile ?? null) as OrgProfileResult | null;
    } else {
      const data = await createMutation.mutateAsync({
        name: vars.name,
        slug: vars.slug,
        description: vars.description,
        entityId: vars.entityId
      });
      return (data.createOrgProfile?.orgProfile ?? null) as OrgProfileResult | null;
    }
  }

  async function handleSave(values: ProfileFormData, profileId?: string) {
    setFormError(null);
    if (onSubmitOverride) setOverrideSavePending(true);
    try {
      profileSchema.parse(values);
      const result = await runSave({
        ...(profileId ? { id: profileId } : {}),
        name: values.name,
        slug: values.slug,
        description: values.description,
        entityId: orgId
      });

      const savedId = result?.id ?? profileId ?? '';
      onMessage?.({ kind: 'success', key: 'orgRolesEditor.save.success', message: merged.saveSuccessMessage });
      onProfileSaved?.(savedId);
      setEditing(null);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setFormError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitOverride) setOverrideSavePending(false);
    }
  }

  // -------------------------------------------------------------------------
  // Delete handler
  // -------------------------------------------------------------------------

  async function handleDelete(id: string) {
    setDeleteError(null);
    if (onDeleteOverride) setOverrideDeletePending(true);
    try {
      if (onDeleteOverride) {
        await onDeleteOverride(id);
      } else {
        await deleteMutation.mutateAsync({ id });
      }
      onMessage?.({ kind: 'success', key: 'orgRolesEditor.delete.success', message: merged.deleteSuccessMessage });
      onProfileDeleted?.(id);
      setDeleteTarget(null);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setDeleteError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onDeleteOverride) setOverrideDeletePending(false);
    }
  }

  // -------------------------------------------------------------------------
  // TanStack Form
  // -------------------------------------------------------------------------

  const editingProfile = editing && editing !== 'new'
    ? profiles.find((p) => p.id === editing)
    : null;

  const form = useForm({
    defaultValues: {
      name: editingProfile?.name ?? '',
      slug: editingProfile?.slug ?? '',
      description: editingProfile?.description ?? ''
    } as ProfileFormData,
    onSubmit: async ({ value }) => {
      await handleSave(value as ProfileFormData, editing !== 'new' ? editing ?? undefined : undefined);
    }
  });

  function openEdit(profile: OrgProfileResult) {
    setFormError(null);
    setEditing(profile.id);
    form.reset({
      name: profile.name ?? '',
      slug: profile.slug ?? '',
      description: profile.description ?? ''
    });
  }

  function openNew() {
    setFormError(null);
    setEditing('new');
    form.reset({ name: '', slug: '', description: '' });
  }

  function cancelEdit() {
    setFormError(null);
    setEditing(null);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Card data-slot="roles-editor" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{merged.title}</CardTitle>
            <CardDescription>{merged.description}</CardDescription>
          </div>
          {editing === null && (
            <Button size="sm" onClick={openNew} data-testid="add-role-button">
              {merged.addProfileButton}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ---------------------------------------------------------------- */}
        {/* Profile list                                                       */}
        {/* ---------------------------------------------------------------- */}
        {editing === null && (
          <>
            {profiles.length === 0 ? (
              <p className="text-pretty text-muted-foreground text-sm" data-testid="empty-state">
                {merged.emptyState}
              </p>
            ) : (
              <ul role="list" className="space-y-2 list-none">
                {profiles.map((profile) => (
                  <li
                    key={profile.id}
                    role="listitem"
                    className="flex items-center justify-between rounded-md border p-3"
                    data-testid={`profile-row-${profile.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{profile.name}</span>
                        {profile.isSystem && (
                          <Badge variant="secondary" className="text-xs">
                            System
                          </Badge>
                        )}
                        {profile.isDefault && (
                          <Badge variant="outline" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      {profile.description && (
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">{profile.description}</p>
                      )}
                    </div>
                    <div className="ml-2 flex shrink-0 gap-1">
                      {!profile.isSystem && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(profile)}
                            data-testid={`edit-button-${profile.id}`}
                          >
                            {merged.editButton}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive-outline"
                            onClick={() => setDeleteTarget({ id: profile.id, name: profile.name ?? '' })}
                            data-testid={`delete-button-${profile.id}`}
                          >
                            {merged.deleteButton}
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Create / Edit form                                                 */}
        {/* ---------------------------------------------------------------- */}
        {editing !== null && (
          <form
            noValidate
            aria-busy={isSavePending}
            className="space-y-4"
            data-testid="profile-form"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <AuthErrorAlert error={formError} />

            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => (!value?.trim() ? 'Role name is required' : undefined)
              }}
            >
              {(field) => (
                <FormField
                  field={field}
                  label={merged.profileNameLabel}
                  placeholder={merged.profileNamePlaceholder}
                  type="text"
                  testId="profile-name"
                />
              )}
            </form.Field>

            <form.Field
              name="slug"
              validators={{
                onChange: ({ value }) => (!value?.trim() ? 'Slug is required' : undefined)
              }}
            >
              {(field) => (
                <FormField
                  field={field}
                  label="Slug"
                  placeholder="url-safe-identifier"
                  type="text"
                  testId="profile-slug"
                />
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <FormField
                  field={field}
                  label={merged.profileDescriptionLabel}
                  placeholder={merged.profileDescriptionPlaceholder}
                  type="text"
                  testId="profile-description"
                />
              )}
            </form.Field>

            <div className="flex gap-2 pt-2">
              <AuthLoadingButton
                type="submit"
                className="flex-1"
                isLoading={isSavePending}
                loadingText={merged.saveButtonPending}
                data-testid="save-role-button"
              >
                {merged.saveButton}
              </AuthLoadingButton>
              <Button type="button" variant="outline" onClick={cancelEdit} data-testid="cancel-button">
                {merged.cancelButton}
              </Button>
            </div>
          </form>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Delete confirmation                                                */}
        {/* ---------------------------------------------------------------- */}
        {deleteTarget !== null && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            className="rounded-md border bg-background p-4 shadow-sm space-y-3"
            data-testid="delete-confirm-dialog"
          >
            <p id="delete-confirm-title" className="text-pretty text-sm font-medium">
              {merged.deleteConfirmTitle}
            </p>
            <p className="text-pretty text-muted-foreground text-sm">{merged.deleteConfirmDescription}</p>

            <AuthErrorAlert error={deleteError} />

            <div className="flex gap-2">
              <AuthLoadingButton
                className="flex-1 bg-destructive hover:bg-destructive/90"
                isLoading={isDeletePending}
                loadingText={merged.saveButtonPending}
                onClick={() => handleDelete(deleteTarget.id)}
                data-testid="confirm-delete-button"
              >
                {merged.deleteConfirmButton}
              </AuthLoadingButton>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                data-testid="cancel-delete-button"
              >
                {merged.cancelButton}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
