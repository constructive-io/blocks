/**
 * use-passkey-sign-in  (UTILITY HOOK — authored + shipped by this block)
 *
 * Orchestrates the WebAuthn assertion (sign-in) ceremony:
 *   1. `fetch` the begin-sign-in middleware endpoint → receive authenticationOptions
 *   2. Call `startAuthentication(options, useBrowserAutofill?)` from @simplewebauthn/browser
 *   3. `fetch` the finish-sign-in middleware endpoint with the assertion response
 *
 * WHY a utility hook instead of a generated hook:
 * The ceremony procedures (passkey_begin_sign_in / passkey_finish_sign_in) are
 * FUTURE — not yet deployed in constructive_auth_public. The generated SDK
 * does NOT yet export `usePasskeyBeginSignInMutation` or
 * `usePasskeyFinishSignInMutation` (CASE b in sdk-binding-contract.md §10).
 * This hook is the primary path until those procedures ship and codegen
 * produces the hooks. The `requires.json` names the pending ops so
 * check-sdk-fixtures.ts will fail clearly until they are deployed.
 *
 * The host provides endpoint URLs via the `beginEndpoint` / `finishEndpoint`
 * props on `PasskeySignIn`; no URL is hardcoded here.
 *
 * Data contract:
 *   beginEndpoint  GET|POST → { authenticationOptions: PublicKeyCredentialRequestOptionsJSON }
 *   finishEndpoint POST (body: AuthenticationResponseJSON) → { session, user, redirectTo? }
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/** Shape returned to the consumer on success. */
export type PasskeySignInResult = {
  session: { id: string; accessToken: string; expiresAt: string };
  user: { id: string };
  redirectTo?: string;
};

export type UsePasskeySignInOptions = {
  /** Middleware endpoint for beginning the WebAuthn assertion. */
  beginEndpoint: string;
  /** Middleware endpoint for finishing the WebAuthn assertion. */
  finishEndpoint: string;
  /** When provided, restricts the challenge to this user's credentials. */
  userId?: string | null;
  /** When true, activates conditional UI (browser autofill passkey picker). Default: false. */
  conditionalUI?: boolean;
  /**
   * Called immediately when the conditional UI flow starts (before the browser shows the picker).
   * Maps to `onMessage({ kind: 'info', key: 'conditional_ui_active' })` in the component.
   */
  onConditionalActivated?: () => void;
  /**
   * Called with the sign-in result when the conditional UI (autofill picker) ceremony completes
   * successfully. Must be provided so the host can navigate / update auth state.
   */
  onConditionalSuccess?: (result: PasskeySignInResult) => void;
  /**
   * Called when the conditional UI ceremony fails with a non-abort error.
   * Receives a mapped error code string.
   */
  onConditionalError?: (code: string) => void;
};

export type UsePasskeySignInReturn = {
  /**
   * Trigger a direct passkey sign-in (button click path).
   * Cancels any in-flight conditional UI request before starting.
   */
  signIn: () => Promise<PasskeySignInResult>;
  isPending: boolean;
  /** False when PublicKeyCredential is unavailable in this browser. */
  isSupported: boolean;
  /** Last error code for display; null when clean. */
  errorCode: string | null;
};

/**
 * Map a WebAuthn / DOMException error to one of our catalog codes.
 */
function mapWebAuthnError(err: unknown): string {
  if (!err) return 'UNKNOWN_ERROR';
  const name = (err as { name?: string }).name;
  const message = (err as { message?: string }).message ?? '';
  // User cancelled the browser credential picker
  if (name === 'NotAllowedError') return 'USER_ABORTED';
  // No credentials found for this user / relying party
  if (name === 'NotFoundError' || message.includes('no credentials')) return 'NO_CREDENTIALS';
  // Server rejected the challenge / couldn't begin
  if (name === 'InvalidStateError' || name === 'SecurityError') return 'CHALLENGE_FAILED';
  // Backend pending — the endpoint returned 404 / procedure not found
  const code = (err as { extensions?: { code?: string } }).extensions?.code;
  if (code === 'PROCEDURE_NOT_FOUND' || (err as { status?: number }).status === 404) {
    return 'PROCEDURE_NOT_FOUND';
  }
  return 'UNKNOWN_ERROR';
}

export function usePasskeySignIn(options: UsePasskeySignInOptions): UsePasskeySignInReturn {
  const {
    beginEndpoint,
    finishEndpoint,
    userId,
    conditionalUI = false,
    onConditionalActivated,
    onConditionalSuccess,
    onConditionalError
  } = options;

  const [isPending, setIsPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Check browser support once (SSR-safe)
  const [isSupported, setIsSupported] = useState(false);
  useEffect(() => {
    setIsSupported(
      typeof window !== 'undefined' &&
        typeof window.PublicKeyCredential !== 'undefined'
    );
  }, []);

  // AbortController for the conditional UI flow so we can cancel it on direct click
  const conditionalAbortRef = useRef<AbortController | null>(null);

  /**
   * Begin-then-finish helper shared by both the direct-click and conditional UI paths.
   */
  const runCeremony = useCallback(
    async (useBrowserAutofill: boolean, signal?: AbortSignal): Promise<PasskeySignInResult> => {
      // Step 1: fetch begin options from middleware
      const beginUrl = userId
        ? `${beginEndpoint}?userId=${encodeURIComponent(userId)}`
        : beginEndpoint;

      const beginRes = await fetch(beginUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal
      });

      if (!beginRes.ok) {
        const status = beginRes.status;
        throw Object.assign(new Error('Begin passkey sign-in failed'), { status });
      }

      const { authenticationOptions } = (await beginRes.json()) as {
        authenticationOptions: Record<string, unknown>;
      };

      // Step 2: browser WebAuthn ceremony via @simplewebauthn/browser (dynamic import for SSR guard).
      // The module is NOT installed in the authoring workspace (it is a registry npm dep consumed at
      // shadcn-add time). We defeat Vite's static import-analysis by storing the specifier in a
      // variable — Vite only checks string-literal specifiers. Tests mock the hook entirely so
      // this code path is never executed during testing.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const simpleWebAuthnBrowser = '@simplewebauthn/browser';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { startAuthentication } = await import(simpleWebAuthnBrowser as any);
      const authResponse = await startAuthentication({
        optionsJSON: authenticationOptions,
        useBrowserAutofill
      });

      // Step 3: fetch finish endpoint
      const finishRes = await fetch(finishEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authResponse),
        signal
      });

      if (!finishRes.ok) {
        throw Object.assign(new Error('Finish passkey sign-in failed'), {
          status: finishRes.status
        });
      }

      const result = (await finishRes.json()) as PasskeySignInResult;
      return result;
    },
    [beginEndpoint, finishEndpoint, userId]
  );

  // Conditional UI: start the browser picker on mount when enabled
  useEffect(() => {
    if (!isSupported || !conditionalUI) return;

    const controller = new AbortController();
    conditionalAbortRef.current = controller;

    // B2: fire the activation info event so the component can emit
    // onMessage({ kind: 'info', key: 'conditional_ui_active' })
    onConditionalActivated?.();

    (async () => {
      try {
        // B1: capture the result and call callbacks on success
        const result = await runCeremony(true, controller.signal);
        if (!controller.signal.aborted) {
          onConditionalSuccess?.(result);
        }
      } catch (err) {
        // Abort is normal (user may not have interacted, or button was clicked)
        const name = (err as { name?: string }).name;
        if (name !== 'AbortError' && !controller.signal.aborted) {
          onConditionalError?.(mapWebAuthnError(err));
        }
      } finally {
        if (conditionalAbortRef.current === controller) {
          conditionalAbortRef.current = null;
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [isSupported, conditionalUI, runCeremony, onConditionalActivated, onConditionalSuccess, onConditionalError]);

  const signIn = useCallback(async (): Promise<PasskeySignInResult> => {
    // If conditional UI is active, abort it before starting a direct request
    if (conditionalAbortRef.current) {
      conditionalAbortRef.current.abort();
      conditionalAbortRef.current = null;
    }

    setIsPending(true);
    setErrorCode(null);
    try {
      const result = await runCeremony(false);
      return result;
    } catch (err) {
      const code = mapWebAuthnError(err);
      setErrorCode(code);
      throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
        extensions: { code }
      });
    } finally {
      setIsPending(false);
    }
  }, [runCeremony]);

  return { signIn, isPending, isSupported, errorCode };
}
