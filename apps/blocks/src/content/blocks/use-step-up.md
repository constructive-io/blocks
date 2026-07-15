# use-step-up

**Type:** `registry:hook`
**Status:** `v1 (frontend ready)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-mfa.md`
**Master entry:** `blocks-master.md#use-step-up`

## Purpose

React hook that wraps `[[auth-step-up-dialog]]` in Promise semantics. Exposes `const stepUp = useStepUp()` so any block can call `await stepUp({ type: 'password' | 'mfa' })` or the shorthand `await stepUp({ tier: 'high' | 'medium' })`. The hook mounts the dialog imperatively, resolves when verified, and rejects with a typed error on cancel or failure. Eliminates boilerplate open-state management for every block that gates a sensitive action.

## When to use

- Any block that must re-verify identity before a sensitive mutation: `[[auth-api-key-create-dialog]]`, `[[auth-account-danger-card]]`, `[[auth-passkey-management-list]]` (delete), `[[auth-mfa-totp-disable-confirm]]`, `[[auth-account-sessions-list]]` (revoke all).
- Consumer code that needs to guard a custom action.
- Not a fit when you need a permanently-visible confirmation step (use the dialog block directly with controlled `open` state).

## Files shipped (per registry.json)

| File path (in consumer repo) | Type |
|---|---|
| `lib/auth/hooks/use-step-up.ts` | `registry:lib` |
| `lib/auth/context/step-up-provider.tsx` | `registry:component` |

## Registry dependencies

- `[[auth-step-up-dialog]]` — the hook mounts this dialog via the StepUpProvider context.

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)

## DB procedures used

This hook is a **UTILITY hook** (authored and shipped — not generated). It delegates to `[[auth-step-up-dialog]]` which internally calls generated hooks from `@/generated/auth`. The generated hooks consumed indirectly are:

- `useRequireStepUpMutation` — called by `[[auth-step-up-dialog]]` on open to check if step-up is still valid.
- `useVerifyPasswordMutation` — called by `[[auth-step-up-dialog]]` when `type='password'`.
- `useVerifyTotpMutation` — called by `[[auth-step-up-dialog]]` when `type='mfa'`.

The tier-resolution logic in this hook reads MFA enrollment from cached `current_user()` TanStack Query data (or queries `useRequireStepUpMutation` to probe enrollment). No `@constructive-io/data` references; no generated-hook imports in this file directly — those live in `[[auth-step-up-dialog]]`.

## Hook API

```ts
/**
 * Options passed to the stepUp() call.
 * Either `type` OR `tier` must be provided.
 * If both are passed, `type` wins (explicit always overrides shorthand).
 */
export type StepUpOptions = {
  /**
   * Explicit verifier type. Takes precedence over `tier` if both are provided.
   */
  type?: 'password' | 'mfa';
  /**
   * Severity tier shorthand. Resolves to a `type` based on the user's MFA
   * enrollment at call time. See tier mapping table below.
   * - 'high'   → 'mfa' if user has MFA enrolled; else 'password'
   * - 'medium' → always 'password'
   */
  tier?: 'high' | 'medium';
  /**
   * Override the dialog messages for this call site.
   * Merged with global defaults.
   */
  messages?: Partial<StepUpDialogMessages>;
};

/**
 * The error thrown when step-up is cancelled or fails.
 */
export class StepUpError extends Error {
  constructor(
    public readonly reason: 'cancelled' | 'error',
    public readonly cause?: unknown
  ) {
    super(reason === 'cancelled' ? 'Step-up cancelled.' : 'Step-up failed.');
    this.name = 'StepUpError';
  }
}

/**
 * Returned by useStepUp().
 * Call stepUp(options) to imperatively trigger verification.
 * Resolves when verified. Rejects with StepUpError on cancel or failure.
 */
export type UseStepUpReturn = (options: StepUpOptions) => Promise<void>;

export function useStepUp(): UseStepUpReturn;
```

## Tier-to-type mapping logic

When `tier` is used (and `type` is not explicitly set), the hook resolves the effective `type` at call time:

| `tier` value | Condition | Effective `type` |
|---|---|---|
| `'high'` | User has at least one MFA method enrolled (TOTP enabled OR passkey registered) | `'mfa'` |
| `'high'` | User has NO MFA enrolled | `'password'` |
| `'medium'` | (any) | `'password'` |

**MFA enrollment check:** The hook calls `require_step_up('mfa')` to probe enrollment. If the procedure returns true (step-up already valid) or the user has MFA credentials, `type` resolves to `'mfa'`. Otherwise it falls back to `'password'`.

> Alternatively, the enrollment check can be done by querying `current_user()` for the `totp_enabled` field and checking for any `webauthn_credentials` rows. Implementation choice — document in the hook's JSDoc once decided.

**Explicit `type` always wins:** If both `type` and `tier` are passed, `type` is used directly without the enrollment check. This allows callers to skip the check when they already know the user's MFA state.

## Usage patterns

```tsx
// Pattern 1: explicit type
await stepUp({ type: 'password' });

// Pattern 2: tier shorthand (recommended for most blocks)
await stepUp({ tier: 'high' });   // mfa if enrolled, else password
await stepUp({ tier: 'medium' }); // always password

// Pattern 3: type wins over tier when both provided
await stepUp({ type: 'mfa', tier: 'medium' }); // uses 'mfa' — type wins
```

```tsx
// Full usage example:

// 1. Add <StepUpProvider> once in your app root (or per-route layout):
import { StepUpProvider } from '@/lib/auth/context/step-up-provider';

export default function RootLayout({ children }) {
  return (
    <StepUpProvider>
      {children}
      {/* StepUpProvider renders <StepUpDialog> as a portal here */}
    </StepUpProvider>
  );
}

// 2. Anywhere in the tree:
import { useStepUp } from '@/lib/auth/hooks/use-step-up';

function DeleteApiKeyButton({ keyId }) {
  const stepUp = useStepUp();
  const { mutateAsync: revokeKey } = useRevokeApiKeyMutation({ selection: { fields: { revokeApiKey: true } } });

  async function handleDelete() {
    try {
      await stepUp({ tier: 'high' }); // mfa if enrolled, password as fallback
      await revokeKey({ keyId });
      toast.success('API key deleted.');
    } catch (err) {
      if (err instanceof StepUpError && err.reason === 'cancelled') return; // user cancelled — silent
      toast.error('Failed to delete API key.');
    }
  }

  return <Button onClick={handleDelete}>Delete</Button>;
}
```

## Tier usage by block

| Block | Action | Tier | Resolves to |
|---|---|---|---|
| `[[auth-account-danger-card]]` | Delete account | `tier: 'high'` | `mfa` if enrolled, else `password` |
| `[[auth-account-sessions-list]]` | Revoke ALL other sessions | `tier: 'high'` | `mfa` if enrolled, else `password` |
| `[[auth-mfa-totp-disable-confirm]]` | Disable TOTP | `tier: 'high'` | `mfa` (user has TOTP active) |
| `[[auth-api-key-create-dialog]]` | Create API key | `tier: 'high'` | `mfa` if enrolled, else `password` |
| `[[auth-passkey-management-list]]` | Delete passkey | `tier: 'high'` | `mfa` if enrolled, else `password` |
| `[[auth-change-password-form]]` | Change password | `tier: 'medium'` | `password` |
| `[[auth-account-sessions-list]]` | Revoke single session | `tier: 'medium'` | `password` |
| `[[auth-account-connected-accounts]]` | Disconnect OAuth | `tier: 'medium'` | `password` |

## StepUpProvider contract

```ts
export type StepUpProviderProps = {
  children: React.ReactNode;
  /**
   * Global message defaults for the step-up dialog.
   * Per-call messages are merged on top.
   */
  messages?: Partial<StepUpDialogMessages>;
};
```

- The provider holds a React ref to the current pending Promise and controls the `[[auth-step-up-dialog]]` `open` state.
- Only one step-up can be active at a time. If `stepUp()` is called while a dialog is already open, it rejects immediately with `StepUpError({ reason: 'error' })` — no silent stacking.

## Callbacks / error handling

- `stepUp()` resolves (`void`) on success.
- `stepUp()` rejects with `StepUpError({ reason: 'cancelled' })` if the user dismisses the dialog.
- `stepUp()` rejects with `StepUpError({ reason: 'error', cause })` if verification fails (wrong password, invalid TOTP, network error).
- Callers should always `catch` and check `err instanceof StepUpError && err.reason === 'cancelled'` to distinguish user-cancellation (silent) from actual errors.

## Captcha

- Not applicable.

## Step-up

- This hook IS the step-up mechanism. It does not recurse.

## Accessibility

- Delegates entirely to `[[auth-step-up-dialog]]` which handles focus trap, aria-modal, and keyboard navigation.
- The StepUpProvider renders the dialog as a React portal at the document root — no z-index surprises from parent stacking contexts.

## Notes / gotchas

- **`StepUpProvider` placement:** Must wrap any component that calls `useStepUp()`. Placing it at the root layout is recommended. The hook throws if called outside provider context.
- **`require_step_up` skip:** `[[auth-step-up-dialog]]` calls `require_step_up()` on open. If valid within the `step_up_window`, the dialog skips rendering and the Promise resolves immediately. The caller has no awareness of this skip — it's transparent.
- **Concurrent calls:** Reject-immediately is the chosen behavior (not queue). Document clearly in the provider's JSDoc.
- **SSR:** The `StepUpProvider` renders a portal — use `suppressHydrationWarning` or mount-guard if targeting Next.js App Router SSR.
- **`type` vs `tier` tradeoffs:** `tier` adds an async enrollment check on each call. If the block already knows the user's MFA state (e.g. from a `current_user()` query result), prefer passing `type` directly to skip the check.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/auth/use-step-up/`
- The provider stores `pendingResolve` and `pendingReject` in a ref (not state) to avoid re-renders.
- The `onVerify` callback passed to `[[auth-step-up-dialog]]` resolves or rejects the stored Promise, then clears the ref and closes the dialog.
- Tier resolution: implement as a small internal async function `resolveTier(tier, data): 'password' | 'mfa'` that reads MFA enrollment from cached `current_user()` data (TanStack Query cache) before falling through to a live query.
- Test plan: unit test the Promise lifecycle (resolve on success, reject on cancel, reject on error). Unit test tier resolution with mock enrollment states. Playwright test: trigger step-up from a consuming block, verify dialog appears, verify resolution.
