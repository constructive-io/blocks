/**
 * use-switch-context — block-owned utility hook
 *
 * BACKEND-PENDING (CASE-b):
 *   `constructive_auth_public.switch_context(org_id)` has not been deployed yet.
 *   The generated hook `useSwitchContextMutation` does NOT exist in @/generated/auth
 *   (the proc has not been added to constructive_auth_public, so codegen never
 *   produced the hook). Importing a non-existent export would break `tsc`.
 *
 *   Therefore this hook does NOT import from @/generated/auth for the switch op.
 *   The primary/required path is the `onSwitchSubmit` override prop.
 *   When the proc ships, the host regenerates the SDK, and this hook can be
 *   updated to bind `useSwitchContextMutation` directly via the normal import.
 *
 * LOCAL STATE LIMITATION (active until Phase 2 / proc deployment):
 *   Because the switch_context proc is undeployed, there is no server-side
 *   state update. The "active context" is tracked in local client state
 *   (the `activeContextId` prop in controlled mode). The host is responsible
 *   for persisting/restoring the active context until the backend proc ships
 *   and the SDK is regenerated.
 *
 * On success:
 *   - Fires the provided `onContextSwitch(user)` callback.
 *   - When the proc ships and this hook is updated, it should also call
 *     queryClient.invalidateQueries to refresh currentUser + orgMemberships.
 */

import { useState } from 'react';
import type { UserContextMembership } from './use-user-contexts';

export type UseSwitchContextOptions = {
  /** Adapter override — replaces the (future) generated hook call. Required until backend proc ships. */
  onSwitchSubmit?: (orgId: string | null) => Promise<void>;
  /** Fires after a successful context switch. Receives the new active context. */
  onContextSwitch?: (user: UserContextMembership['user']) => void;
  /** Fires on switch error after internal mapping. */
  onError?: (err: unknown) => void;
  /** Fires for any notification event. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  /**
   * Success toast template string from the messages catalog (e.g. `"Switched to {{name}}"`).
   * The hook replaces `{{name}}` with the target user's `displayName` at switch time and
   * forwards the result as `message` on the success onMessage event. This lets hosts
   * wiring `onMessage → toast` receive a ready-to-display localized string without
   * importing the messages catalog themselves.
   */
  switchedToastTemplate?: string;
};

export type UseSwitchContextResult = {
  /** Switch to the given org (pass null for personal account). */
  switchTo: (targetContext: UserContextMembership) => Promise<void>;
  isPending: boolean;
};

export function useSwitchContext(options: UseSwitchContextOptions): UseSwitchContextResult {
  const { onSwitchSubmit, onContextSwitch, onError, onMessage, switchedToastTemplate } = options;
  const [isPending, setIsPending] = useState(false);

  async function switchTo(targetContext: UserContextMembership): Promise<void> {
    // The orgId is null for personal accounts; for orgs it is the entity id.
    const orgId =
      targetContext.user.type === 'organization' ? targetContext.user.id : null;

    setIsPending(true);
    try {
      if (onSwitchSubmit) {
        // Host-supplied override (the primary path while backend is pending).
        await onSwitchSubmit(orgId);
      } else {
        // No override and no generated hook — the proc is backend-pending.
        // Fire PROCEDURE_NOT_FOUND so the host can surface the message.
        const err = Object.assign(new Error('switch_context procedure not deployed'), {
          extensions: { code: 'PROCEDURE_NOT_FOUND' }
        });
        throw err;
      }

      onContextSwitch?.(targetContext.user);
      // Interpolate the switchedToast template if provided (e.g. "Switched to {{name}}").
      const successMessage = switchedToastTemplate
        ? switchedToastTemplate.replace('{{name}}', targetContext.user.displayName)
        : undefined;
      onMessage?.({
        kind: 'success',
        key: 'switchContext.success',
        ...(successMessage !== undefined && { message: successMessage })
      });
    } catch (err) {
      // Delegate error-event emission to the component's onError handler.
      // The component parses the error, derives message, and fires onMessage once
      // with both key and message. We do NOT call onMessage here — that would
      // cause double-firing (block-contract §4: callback firing is deterministic).
      onError?.(err);
    } finally {
      setIsPending(false);
    }
  }

  return { switchTo, isPending };
}
