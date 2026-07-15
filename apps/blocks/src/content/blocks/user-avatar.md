# user-avatar

**Type:** `registry:component`
**Status:** `v1 (frontend ready)`
**Namespace:** `user-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#user-avatar`

**Pairing:** No page block — card-only. Used as: a presentational primitive inside [[user-context-switcher]], [[auth-account-profile-card]], [[org-create-card]], [[auth-invitation-acceptance-page]], and [[auth-account-connected-accounts]].

## Purpose

Pure presentational avatar component for any `User` (person or org). Renders `user.profile_picture` (the custom `image` domain value stored in `constructive_users_public.users.profile_picture`) when available, falling back to the user's initials derived from `user.displayName`. Polymorphic: round avatar for `type === 'person'`, square (rounded-sm) for `type === 'organization'`. No DB calls — all data passed via props.

## When to use

- Wherever a user or org identity needs a visual representation (nav headers, member lists, invite cards, comment threads).
- Inside [[user-context-switcher]] entries.
- Inside [[auth-invitation-acceptance-page]] to show inviter and org avatars.
- As a preview in [[org-create-card]] logo upload step.
- Not a fit when: you need a full identity card with name/email — combine `UserAvatar` with the adjacent text in the parent component.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/user/user-avatar.tsx` | `registry:component` |
| `lib/user/utils/user-initials.ts` | `registry:lib` |

## Registry dependencies

- `avatar` (shadcn primitive — `<Avatar>`, `<AvatarImage>`, `<AvatarFallback>`)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)

## DB procedures used by default hook

None. This is a pure presentational component. All user data is passed via props.

## Props

```ts
/** The unified User model subset required for avatar rendering. */
export type UserAvatarUser = {
  id: string;
  /** 'person' = round avatar; 'organization' = square avatar. Normalized by the calling hook. */
  type: 'person' | 'organization';
  displayName: string;
  username: string | null;
  /**
   * Value from `constructive_users_public.users.profile_picture`.
   * Custom `image` domain — may be a URL string or null.
   * If a deployment's `profile_picture` returns a jsonb reference rather
   * than a URL string, the caller must extract the URL before passing
   * it here — the component is purely presentational and renders the
   * string it is given.
   */
  profilePicture: string | null;
};

export type UserAvatarSize = 'sm' | 'md' | 'lg';

export type UserAvatarProps = {
  user: UserAvatarUser;
  /**
   * Visual size of the avatar.
   * sm = 24px, md = 32px, lg = 40px (Tailwind size-6 / size-8 / size-10).
   * Default: 'md'
   */
  size?: UserAvatarSize;
  /**
   * Override alt text. Default: user.displayName.
   */
  alt?: string;
  /**
   * Additional CSS class names forwarded to the root `<Avatar>` element.
   */
  className?: string;
};
```

## Rendering logic

```ts
// Shape: round for persons, square for orgs
const shapeClass =
  user.type === 'organization'
    ? 'rounded-sm'   // square avatar for orgs
    : 'rounded-full'; // round avatar for persons

// Size map
const sizeClass = {
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-10',
}[size ?? 'md'];

// Initials fallback — up to 2 characters derived from displayName
const initials = deriveInitials(user.displayName); // e.g. "Acme Corp" → "AC", "Jane Doe" → "JD"
```

Initials derivation (in `lib/user/utils/user-initials.ts`):
- Split `displayName` on whitespace.
- Take the first letter of the first word and the first letter of the last word (if they differ).
- Uppercase. Max 2 characters.
- Falls back to the first character of `username` if `displayName` is empty.

## Messages catalog

No user-visible strings. This component is purely visual. No `messages` prop.

## Default hook contract

No hook. Pass `user` data from the parent hook's result.

## Callbacks

None. Presentational component.

## Captcha

Not applicable.

## Step-up

Not applicable.

## Notifications (default toasts)

None.

## Accessibility

- `<AvatarImage>` receives `alt` prop (defaults to `user.displayName`).
- `<AvatarFallback>` contains the initials text with `aria-hidden="true"` — the `alt` on the image is the accessible label; initials are decorative when the image loads.
- When the image fails to load, `<AvatarFallback>` is the visible representation; ensure the parent component has an accessible label at the list/card level.

## Notes / gotchas

- **profile_picture domain**: `constructive_users_public.users.profile_picture` uses the custom `image` domain. If the value is a plain URL string, pass it directly to `<AvatarImage src={...} />`. If the DB returns jsonb, the calling hook must extract the URL before passing to this component.
- **Polymorphic shape**: `type === 'organization'` → `rounded-sm` (square with slight radius). `type === 'person'` → `rounded-full` (circle). This is enforced by CSS class, not a separate component variant.
- **Size tokens**: sizes use Tailwind v4 `size-*` utilities. If the consuming app uses Tailwind v3, map manually: `sm=h-6 w-6`, `md=h-8 w-8`, `lg=h-10 w-10`.
- **No lazy loading**: this component is always synchronous. Parent is responsible for skeleton state while user data loads.
- Cross-ref: [[user-context-switcher]] renders one `UserAvatar` per context entry. [[org-create-card]] uses it for the logo preview on step 2. [[auth-invitation-acceptance-page]] uses it to show the inviter and target org.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/user/user-avatar/`
- Keep this component under ~60 lines. It is intentionally thin.
- Storybook stories: person with photo, person initials fallback, org with logo, org initials fallback, all three sizes (sm/md/lg), long display name (initials truncation), emoji in display name (graceful handling).
- `deriveInitials` should handle edge cases: single-word names (use first 2 chars), names with only non-alphabetic characters (use first 1 char), empty string (use `?`).
