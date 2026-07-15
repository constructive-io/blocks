'use client';

/**
 * account-profile-card  (registry: auth-account-profile-card)
 *
 * Allows the signed-in user to update their display_name and profile_picture.
 * Renders first/last or display name fields for 'person' users and an
 * organization name field for 'organization' users. Profile picture changes
 * use an optimistic preview before the presigned-URL upload completes.
 *
 * DATA PATH:
 *   • Read  — `useCurrentUserQuery` from `@/generated/auth` (when `user` prop
 *             is not supplied by the consumer).
 *   • Write — `useUpdateUserMutation` from `@/generated/auth`.
 *     Hook takes flat args `{ id, userPatch }` and returns
 *     `{ updateUser: { user } }`.
 *
 * There is NO fetch, NO GraphQL document string, NO configure()/getClient(),
 * NO QueryClientProvider in this file. The host mounts blocks-runtime once.
 */

import { useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { useCurrentUserQuery, useUpdateUserMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';
import { UserAvatar } from '@/blocks/user/user-avatar/user-avatar';

import {
  defaultAccountProfileCardMessages,
  type AccountProfileCardMessageOverrides,
  type AccountProfileCardMessages
} from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Opaque image descriptor stored as jsonb in `users.profile_picture`.
 * When the field is a URL string, consumers may read `profilePicture.url`
 * or cast to string depending on their upload implementation.
 */
export type ImageJsonb = Record<string, unknown>;

export type UpdateProfileInput = {
  /** The user's id — required so the mutation knows which row to update. */
  id: string;
  displayName?: string;
  /** Set to `null` to remove the current picture. When a new file was selected,
   * `profilePictureUpload` carries the raw File; `profilePicture` is omitted. */
  profilePicture?: ImageJsonb | null;
  /** Raw File object when the user selected a new picture but no presigned-PUT
   * has been performed yet. Present only when `onSubmit` override is used and
   * the consumer is responsible for the upload step. */
  profilePictureUpload?: File | null;
};

export type UpdateProfileResult = {
  user: {
    id: string;
    type: 'person' | 'organization';
    displayName: string | null;
    profilePicture: ImageJsonb | null;
  };
};

/** The user shape expected / returned by this block. */
export type AccountProfileUser = {
  id: string;
  /** Normalised from the wire Int! (1 → 'person', 2 → 'organization'). */
  type: 'person' | 'organization';
  displayName?: string | null;
  /** Raw value from `users.profile_picture` (jsonb image domain or null). */
  profilePicture?: ImageJsonb | null;
};

export type AccountProfileCardProps = {
  /** Current user. When omitted the block calls `useCurrentUserQuery`. */
  user?: AccountProfileUser;
  /** Pre-populate form fields. Falls back to `user` when not set. */
  defaultValues?: {
    displayName?: string;
    profilePicture?: ImageJsonb | null;
  };
  /** Max file size in bytes for profile picture upload. Default: 5_000_000. */
  maxFileSize?: number;
  /** Accepted MIME types for profile picture. Default: image/jpeg, image/png, image/webp. */
  acceptedImageTypes?: string[];
  messages?: AccountProfileCardMessageOverrides;
  /** Replace the default `useUpdateUserMutation` call. */
  onSubmit?: (input: UpdateProfileInput) => Promise<UpdateProfileResult>;
  /** Fires after a successful save. Always fires. */
  onSuccess?: (result: UpdateProfileResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for all events. Always fires. */
  onMessage?: (event: {
    kind: 'success' | 'error' | 'info' | 'warning';
    key: string;
    message?: string;
  }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize the wire Int! type value to the block's discriminator. */
function normalizeUserType(raw: number | null | undefined): 'person' | 'organization' {
  if (raw === 2) return 'organization';
  return 'person';
}

/**
 * Best-effort extraction of a display URL from the opaque image jsonb.
 * The domain stores objects like `{ url, key, width, height, mimeType }`.
 * Falls back to `null` when it cannot resolve a string URL.
 */
function resolveAvatarUrl(pic: ImageJsonb | null | undefined): string | null {
  if (!pic) return null;
  if (typeof pic === 'string') return pic;
  if (typeof (pic as { url?: unknown }).url === 'string') return (pic as { url: string }).url;
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountProfileCard({
  user: userProp,
  defaultValues,
  maxFileSize = 5_000_000,
  acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp'],
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: AccountProfileCardProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: AccountProfileCardMessages = {
    ...defaultAccountProfileCardMessages,
    ...messageOverrides,
    errors: {
      ...defaultAccountProfileCardMessages.errors,
      ...messageOverrides?.errors
    }
  };

  // ---------------------------------------------------------------------------
  // Data — read current user when the consumer has not supplied a user prop.
  // The query is skipped (`enabled: false`) when the consumer supplies `user`.
  // ---------------------------------------------------------------------------
  const { data: currentUserData } = useCurrentUserQuery({
    selection: {
      fields: {
        id: true,
        type: true,
        displayName: true,
        profilePicture: true
      }
    },
    enabled: !userProp
  });

  const rawUser = userProp ?? currentUserData?.currentUser ?? null;

  const resolvedUser: AccountProfileUser | null = rawUser
    ? {
        id: rawUser.id,
        type: userProp
          ? userProp.type
          : normalizeUserType((rawUser as { type?: number | null }).type as number | null),
        displayName: (rawUser as { displayName?: string | null }).displayName,
        profilePicture: (rawUser as { profilePicture?: ImageJsonb | null }).profilePicture
      }
    : null;

  // ---------------------------------------------------------------------------
  // Data — update mutation
  // ---------------------------------------------------------------------------
  const defaultMutation = useUpdateUserMutation({
    selection: {
      fields: {
        id: true,
        type: true,
        displayName: true,
        profilePicture: true
      }
    }
  });

  // Hybrid pending: generated hook tracks its own; override path does not.
  const [overridePending, setOverridePending] = useState(false);
  const isPending = onSubmitOverride ? overridePending : defaultMutation.isPending;

  // ---------------------------------------------------------------------------
  // File / upload state
  // ---------------------------------------------------------------------------
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  /**
   * Holds the optimistic preview + the raw File so `handleSave` can pass it
   * via `userPatch.profilePictureUpload` — the ORM-generated field for
   * multipart/binary uploads. `null` means no pending change; `'remove'` means
   * clear the current picture.
   *
   * We intentionally do NOT store `File` inside an `ImageJsonb` (that would be
   * non-serializable). The `profilePictureUpload` field on `UserPatch` is the
   * correct contract point for raw File uploads.
   */
  const [pendingPicture, setPendingPicture] = useState<
    { preview: string; file: File } | null | 'remove'
  >(null);

  const [formError, setFormError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------
  const isOrg = resolvedUser?.type === 'organization';
  const initialDisplayName =
    defaultValues?.displayName ??
    resolvedUser?.displayName ??
    '';

  const form = useForm({
    defaultValues: { displayName: initialDisplayName as string },
    onSubmit: async ({ value }) => {
      await handleSave(value.displayName);
    }
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxFileSize) {
      setUploadError(merged.fileTooLarge);
      return;
    }
    if (!acceptedImageTypes.includes(file.type)) {
      setUploadError(merged.fileTypeNotAccepted);
      return;
    }

    // Optimistic preview — the File is stored on pendingPicture.file so
    // handleSave can pass it via `userPatch.profilePictureUpload`, the
    // ORM-generated field that accepts a raw File for binary uploads.
    // This avoids placing a non-serializable File inside an ImageJsonb, which
    // would break GraphQL transport (see B1 fix).
    // `isUploading` is set true during the actual mutation in handleSave; here
    // we just stage the file and surface an info event for the consumer.
    const previewUrl = URL.createObjectURL(file);
    onMessage?.({ kind: 'info', key: 'uploading', message: merged.uploadingMessage });
    setPendingPicture({ preview: previewUrl, file });
  }

  function handleRemovePhoto() {
    setPendingPicture('remove');
    setUploadError(null);
  }

  async function handleSave(displayName: string) {
    if (!resolvedUser) return;
    setFormError(null);
    // Show the avatar upload overlay while the mutation is in-flight with a file.
    if (pendingPicture !== null && pendingPicture !== 'remove') {
      setIsUploading(true);
    }

    // Build the input shape for the onSubmit override (consumer-facing API).
    // When the user removed the photo: profilePicture = null.
    // When the user selected a new file: profilePictureUpload = File (the
    // consumer is responsible for the upload step in the override path).
    const input: UpdateProfileInput = {
      id: resolvedUser.id,
      displayName: displayName || undefined,
      ...(pendingPicture === 'remove'
        ? { profilePicture: null }
        : pendingPicture !== null
          ? { profilePictureUpload: pendingPicture.file }
          : {})
    };

    if (onSubmitOverride) setOverridePending(true);
    try {
      let result: UpdateProfileResult;

      if (onSubmitOverride) {
        result = await onSubmitOverride(input);
      } else {
        // Build the userPatch for the ORM-generated mutation.
        // `profilePictureUpload` is the correct field for a raw File object —
        // the ORM/transport layer handles serialization. `profilePicture: null`
        // clears the existing image. We never put a File inside `profilePicture`
        // (which expects `ConstructiveInternalTypeImage = unknown` — a resolved
        // jsonb object, not a DOM File).
        const userPatch: {
          displayName: string | null;
          profilePicture?: null;
          profilePictureUpload?: File;
        } = { displayName: input.displayName ?? null };

        if (pendingPicture === 'remove') {
          userPatch.profilePicture = null;
        } else if (pendingPicture !== null) {
          userPatch.profilePictureUpload = pendingPicture.file;
        }

        const data = await defaultMutation.mutateAsync({
          id: input.id,
          userPatch
        });
        const updatedUser = data.updateUser?.user;
        result = {
          user: {
            id: updatedUser?.id ?? resolvedUser.id,
            type: normalizeUserType((updatedUser as { type?: number | null } | undefined)?.type ?? null),
            displayName: (updatedUser as { displayName?: string | null } | undefined)?.displayName ?? null,
            profilePicture:
              (updatedUser as { profilePicture?: ImageJsonb | null } | undefined)?.profilePicture ?? null
          }
        };
      }

      setPendingPicture(null);
      setIsUploading(false);
      onMessage?.({ kind: 'success', key: 'profileUpdated', message: merged.successToast });
      onSuccess?.(result);
    } catch (err) {
      setIsUploading(false);
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setFormError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitOverride) setOverridePending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Derived avatar state
  // ---------------------------------------------------------------------------
  const avatarUser = {
    id: resolvedUser?.id ?? 'anon',
    type: resolvedUser?.type ?? 'person',
    displayName: (form.state.values.displayName || resolvedUser?.displayName || '') as string,
    username: null,
    profilePicture:
      pendingPicture === 'remove'
        ? null
        : pendingPicture !== null
          ? pendingPicture.preview
          : resolveAvatarUrl(resolvedUser?.profilePicture)
  };

  const isAnyPending = isPending || isUploading;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Card data-slot="account-profile-card" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <CardTitle>{merged.title}</CardTitle>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Profile picture */}
        {/* `relative` makes this row the containing block for the sr-only file
            input below; otherwise the absolutely-positioned (but visually
            hidden) input keeps its in-flow static position at the row's right
            edge and is measured against the page body, widening the document
            and causing horizontal scroll at narrow viewports. */}
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <UserAvatar user={avatarUser} size="lg" />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <span className="sr-only">{merged.uploadingMessage}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-muted-foreground text-xs">{merged.profilePictureHint}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnyPending}
                data-testid="change-photo-btn"
              >
                {merged.changePhotoButton}
              </Button>
              {(resolvedUser?.profilePicture || pendingPicture) && pendingPicture !== 'remove' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePhoto}
                  disabled={isAnyPending}
                  data-testid="remove-photo-btn"
                >
                  {merged.removePhotoButton}
                </Button>
              )}
            </div>
          </div>

          {/* Visually-hidden file input.
              `sr-only` makes the input `position: absolute` but does NOT set
              `left`/`top`, so it would otherwise retain its static-position X
              (far right, after the avatar + buttons). Pinning it to `left-0
              top-0` inside the `relative` row keeps its box at the card corner
              so it can never extend the page's horizontal scroll bounds. */}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedImageTypes.join(',')}
            className="sr-only left-0 top-0"
            aria-label={merged.profilePictureLabel}
            data-testid="profile-picture-input"
            onChange={handleFileSelect}
          />
        </div>

        {/* Upload / form errors */}
        <AuthErrorAlert error={uploadError ?? formError} />

        {/* Display-name / org-name form */}
        <form
          noValidate
          aria-busy={isAnyPending}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="displayName"
            validators={{
              onChange: ({ value }) => {
                if (!value?.trim()) {
                  return isOrg ? 'Organization name is required' : 'Display name is required';
                }
                return undefined;
              }
            }}
          >
            {(field) => (
              <FormField
                field={field}
                label={isOrg ? merged.orgNameLabel : merged.displayNameLabel}
                placeholder={isOrg ? merged.orgNamePlaceholder : merged.displayNamePlaceholder}
                type="text"
                testId="display-name"
              />
            )}
          </form.Field>

          <AuthLoadingButton
            type="submit"
            className="w-full"
            isLoading={isAnyPending}
            loadingText={merged.savingButton}
            data-testid="save-profile-btn"
            disabled={isAnyPending}
          >
            {merged.saveButton}
          </AuthLoadingButton>
        </form>
      </CardContent>
    </Card>
  );
}
