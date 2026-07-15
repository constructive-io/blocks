# auth-account-profile-card

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-account.md`
**Master entry:** `blocks-master.md#auth-account-profile-card`

**Pairing:** No page block — this card is composed by [[auth-account-settings-page]]. Install the page to get the full settings surface; install this card alone for a standalone profile edit widget.

## Purpose

Allows the signed-in user to update their `display_name` and `profile_picture`. These are the two editable fields on the core `constructive_users_public.users` row. Email and username are intentionally excluded — each has dedicated cards with separate verification flows.

For `type === 'person'` users the card renders **First / Last name** fields (or a single Display name field). For `type === 'organization'` users the card renders an **Organization name** field. The `user.type` discriminator drives which controls appear.

## When to use

- As one section card within `auth-account-settings-page`.
- Standalone on any custom profile settings page.
- Not a fit when: the consumer wants to edit email (use `auth-account-emails-list`) or username (future `auth-account-username-card`).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/auth/account-profile-card.tsx` | `registry:component` |
| `components/auth/account-profile-card.requires.json` | `registry:file` |
| `lib/auth/messages/account-profile-card-messages.ts` | `registry:lib` |

> No data hook is shipped. The `use-update-profile.ts` hook is removed — the block imports `useUpdateUserMutation` (or `useUpdateCurrentUserMutation` — FLAG: verify generated name) from `@/generated/auth`. Only the messages catalog and `requires.json` are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (supplies `QueryClientProvider` + per-namespace `configure()`; React Query reaches this block transitively)
- `card`, `button`, `input`, `label`, `avatar`, `form`
- `lib/auth-errors` (shared error mapper)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `react-hook-form` (^7)
- `zod` (^3)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via `blocks-runtime`. `@constructive-io/data` is removed.

## DB procedures used by default hook

The block composes two separate operations:

1. **Profile update** — GraphQL mutation `updateUser(input: UpdateUserInput!)` or `updateCurrentUser(input: ...)` targeting `constructive_users_public.users`. Schema `constructive_auth_public` (or `users_public`) → **namespace `auth`** → **FLAG: verify generated mutation name** (likely `useUpdateUserMutation` or `useUpdateCurrentUserMutation`). Updates `display_name` (citext) and/or `profile_picture` (jsonb image domain).

The exact generated hook name (`useUpdateUserMutation` vs `useUpdateCurrentUserMutation`) follows PostGraphile's inflection of the underlying mutation name and is not pinned in this spec — it resolves against the host's generated `auth` SDK.

2. **Profile picture upload** — presigned URL flow (not a generated GraphQL hook — REST/fetch step before the mutation).

The upload uses a presigned-URL flow (a REST/fetch step, not a generated GraphQL hook): an upload-initiation procedure or endpoint returns a presigned PUT URL, the binary is uploaded, and the resulting `image` jsonb object is passed to `updateUser`. The exact initiation procedure name (`create_upload` vs `presign_upload`) is not finalized against the constructive uploads SDK.

CSRF token is handled below the block — see `contracts/endpoint-contract.md` §3. Block does NOT pass `csrf_token`.

## Props

```ts
export type AccountProfileCardProps = {
  /**
   * Current user — drives which controls render.
   * type === 'person' → display name (or first/last name) fields.
   * type === 'organization' → org name field.
   */
  user?: {
    id: string;
    type: 'person' | 'organization';
    displayName?: string;
    profilePicture?: ImageJsonb | null;
  };
  /** Initial values pre-populated into the form. Falls back to user prop if not set. */
  defaultValues?: {
    displayName?: string;
    profilePicture?: ImageJsonb | null;
  };
  /** When provided, called instead of the default useUpdateProfile hook. */
  onSubmit?: (input: UpdateProfileInput) => Promise<UpdateProfileResult>;
  onSuccess?: (result: UpdateProfileResult) => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  notifications?: boolean | { success?: boolean; error?: boolean };
  messages?: Partial<AccountProfileCardMessages>;
  /** Max file size in bytes for profile picture upload. Default: 5_000_000 (5 MB). */
  maxFileSize?: number;
  /** Accepted MIME types for profile picture upload. Default: ['image/jpeg','image/png','image/webp']. */
  acceptedImageTypes?: string[];
};

export type UpdateProfileInput = {
  displayName?: string;
  profilePicture?: ImageJsonb | null;
};

export type UpdateProfileResult = {
  user: {
    id: string;
    type: 'person' | 'organization';
    displayName: string;
    profilePicture: ImageJsonb | null;
  };
};

/**
 * Opaque image descriptor stored as jsonb in constructive_users_public.users.profile_picture.
 * Exact shape is not yet pinned against the constructive-db types module — may be
 * { url, key, width, height, mimeType } or similar.
 */
export type ImageJsonb = Record<string, unknown>;
```

## Messages catalog

```ts
export type AccountProfileCardMessages = {
  title: string;
  description: string;
  displayNameLabel: string;
  displayNamePlaceholder: string;
  orgNameLabel: string;
  orgNamePlaceholder: string;
  profilePictureLabel: string;
  profilePictureHint: string;
  changePhotoButton: string;
  removePhotoButton: string;
  saveButton: string;
  savingButton: string;
  successToast: string;
  fileTooLarge: string;
  fileTypeNotAccepted: string;
  uploadFailed: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultAccountProfileCardMessages: AccountProfileCardMessages = {
  title: 'Profile',
  description: 'Update your display name and profile picture.',
  displayNameLabel: 'Display name',
  displayNamePlaceholder: 'Your name',
  orgNameLabel: 'Organization name',
  orgNamePlaceholder: 'Your organization name',
  profilePictureLabel: 'Profile picture',
  profilePictureHint: 'JPG, PNG or WebP. Max 5 MB.',
  changePhotoButton: 'Change photo',
  removePhotoButton: 'Remove photo',
  saveButton: 'Save changes',
  savingButton: 'Saving…',
  successToast: 'Profile updated.',
  fileTooLarge: 'File exceeds maximum allowed size.',
  fileTypeNotAccepted: 'File type not accepted.',
  uploadFailed: 'Upload failed. Please try again.',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a `use-update-profile.ts`. It imports the generated mutation hook from the host's `auth` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import (FLAG — verify name):** `import { useUpdateUserMutation } from '@/generated/auth';`
  (hook name derived from generated mutation — confirm against host SDK `.d.ts`; likely `useUpdateUserMutation` or `useUpdateCurrentUserMutation`)
- **Instantiate:**
  ```ts
  const updateUser = useUpdateUserMutation({
    selection: { fields: { updateUser: { user: { id: true, displayName: true, profilePicture: true } } } },
  });
  ```
- **Call + read payload:**
  ```ts
  const result = await (onSubmitOverride
    ? onSubmitOverride(vars)
    : updateUser.mutateAsync({ input: { displayName, profilePicture } }).then((d) => d.updateUser));
  ```
  `vars` carry `displayName` and/or `profilePicture` — **never** `csrf_token`.
- **Returns:** `{ mutateAsync, isPending, error }`.
- **Upload flow:** if a new file is selected, the block first uploads via presigned PUT URL (REST, not a generated hook), resolves the `ImageJsonb`, then passes it to `mutateAsync`. `isUploading` state is local. Adapter override: when `props.onSubmit` is set, upload resolves first then `onSubmit` receives the resolved `ImageJsonb`.

The generated mutation name is not pinned here — it resolves against the host's generated `auth` SDK `.d.ts`, and the `requires.json` note below tracks the same open item.

### `account-profile-card.requires.json`

```json
{
  "namespace": "auth",
  "mutations": ["updateUser"],
  "queries": [],
  "models": []
}
```

> FLAG: `mutations` entry `"updateUser"` is pending name verification. Update to the confirmed generated mutation name (e.g. `"updateCurrentUser"`) once checked against the host SDK.

## Callbacks

- `onSuccess(result)` — fires after successful save. `result.user` contains updated `displayName`, `profilePicture`, and `type`.
- `onError(err)` — fires after `mapAuthError` mapping. `err.message` is user-friendly.
- `onMessage({ kind, key })` — fires on intermediate events, e.g. `{ kind: 'info', key: 'uploading' }` while the presigned PUT is in flight.

## Captcha

Not applicable — profile update is an authenticated action, not rate-limited at the auth layer.

## Step-up

Not required for basic profile fields. If the consumer wishes to gate this behind a password re-entry, they can compose `use-step-up` themselves; it is not built into this block.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| success | `messages.successToast` |
| upload failed | `messages.uploadFailed` |
| file too large | `messages.fileTooLarge` (client-side, no toast — inline error) |
| unknown error | `messages.errors.UNKNOWN_ERROR` |

## Accessibility

- `display_name` input: `autoComplete="name"`, `autoFocus` on first render.
- Profile picture uses a visually-hidden `<input type="file">` triggered by a styled button.
- File input announces selected filename via `aria-describedby`.
- Error messages: `aria-live="polite"` region.
- Submit button disabled + shows `savingButton` text while pending.

## Notes / gotchas

- `display_name` is `citext` in Postgres — the DB normalises case. Present the server-returned value after save (don't assume client casing is preserved).
- `profile_picture` is a jsonb image domain. The block stores the full jsonb returned by the upload response, not just a URL string. Consumers who need a plain URL should read `profilePicture.url` or equivalent key from the domain shape.
- Person vs org rendering: check `user.type === 'organization'` to switch the label and placeholder. DB stores `type` as `'1'` (person) or `'2'` (org); the hook normalises to `'person' | 'organization'` before passing to the component.
- If a user removes the photo, send `profilePicture: null` — confirm the mutation accepts null to clear the field.
- The block does NOT handle cropping. If consumer needs a crop step, they should wrap this block or intercept via `onSubmit`.

## Implementation notes (for the author)

- Avatar preview: show current picture, update optimistically on file select before upload completes. Round for `type === 'person'`, square for `type === 'organization'` (consistent with [[user-avatar]]).
- Show a loading overlay on the avatar during upload (not just the submit button) so users know upload is in progress.
- Test states: person user, org user, empty profile, display_name only, with picture, upload error, save error, pending, success.
