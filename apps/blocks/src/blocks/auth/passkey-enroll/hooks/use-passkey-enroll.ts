/**
 * use-passkey-enroll
 *
 * Block-owned UTILITY hook (AUTHORED and SHIPPED — not generated). Orchestrates
 * the WebAuthn registration ceremony via Express middleware calls, because the
 * public-schema procedures (passkey_begin_registration /
 * passkey_finish_registration) are backend-pending and no generated hook exists
 * yet. See sdk-binding-contract.md §10 and auth-passkey-enroll.requires.json.
 *
 * Flow:
 *   1. POST to `beginEndpoint` → receive WebAuthn registration options.
 *   2. Call `startRegistration(options)` from @simplewebauthn/browser — triggers
 *      the native browser dialog (Touch ID, Face ID, security key, etc.).
 *   3. POST to `finishEndpoint` with the credential response + credentialName.
 *   4. Return `{ credentialId, credentialName }`.
 *
 * When `onSubmitOverride` is supplied by the consumer, the three-step ceremony
 * is bypassed entirely and the override is called with `{ credentialName, userId }`.
 *
 * @simplewebauthn/browser is loaded lazily via `loadStartRegistration` to avoid
 * SSR issues (the module references `window` at load time). The loader is
 * injectable so tests can stub it without needing the real package installed.
 */

import { useState, useEffect } from 'react';

export type PasskeyEnrollInput = {
  credentialName: string;
  userId: string;
};

export type PasskeyEnrollResult = {
  credentialId: string;
  credentialName: string;
};

/**
 * Signature for the `startRegistration` function from @simplewebauthn/browser.
 * Declared inline so the hook has no compile-time dependency on the package.
 */
export type StartRegistrationFn = (options: {
  optionsJSON: Record<string, unknown>;
}) => Promise<Record<string, unknown>>;

/**
 * Async loader that returns the `startRegistration` function.
 * Injectable for testing; defaults to a dynamic import of @simplewebauthn/browser
 * (which is an npm dep declared in the block registry item — installed by the
 * consumer at shadcn-add time, not in this authoring workspace).
 */
export type StartRegistrationLoader = () => Promise<StartRegistrationFn>;

/**
 * Default production loader. Uses a Vite-ignore suppression comment so the
 * bundler skips static analysis of the specifier — the package is not installed
 * in the authoring workspace, but resolves on the consumer host. This avoids
 * the CSP-unsafe Function() / eval pattern.
 *
 * The `import(specifier)` call is typed via an intermediary string variable so
 * TypeScript does not resolve the module at compile time (the package is a
 * declared consumer-side npm dep, not installed in the authoring workspace).
 */
export const defaultStartRegistrationLoader: StartRegistrationLoader = async () => {
  const specifier = '@simplewebauthn/browser';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await (/* @vite-ignore */ import(/* @vite-ignore */ specifier) as unknown as Promise<any>);
  return mod.startRegistration as StartRegistrationFn;
};

export type UsePasskeyEnrollOptions = {
  /** POST endpoint to call to begin the WebAuthn registration ceremony. */
  beginEndpoint?: string;
  /** POST endpoint to call to finish the WebAuthn registration ceremony. */
  finishEndpoint?: string;
  /** Consumer override — replaces the entire begin/browser/finish flow. */
  onSubmitOverride?: (input: PasskeyEnrollInput) => Promise<PasskeyEnrollResult>;
  /**
   * Injectable loader for `startRegistration`. Defaults to loading from
   * @simplewebauthn/browser at runtime. Override in tests to avoid needing
   * the real package installed in the authoring workspace.
   */
  startRegistrationLoader?: StartRegistrationLoader;
};

export type UsePasskeyEnrollReturn = {
  /** Execute the passkey enrollment. Throws on error. */
  enroll: (input: PasskeyEnrollInput) => Promise<PasskeyEnrollResult>;
  isPending: boolean;
  /** Whether the current browser supports WebAuthn / passkeys. */
  isSupported: boolean;
};

export function usePasskeyEnroll({
  beginEndpoint = '/api/auth/passkey/begin-registration',
  finishEndpoint = '/api/auth/passkey/finish-registration',
  onSubmitOverride,
  startRegistrationLoader = defaultStartRegistrationLoader
}: UsePasskeyEnrollOptions = {}): UsePasskeyEnrollReturn {
  const [isPending, setIsPending] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Detect WebAuthn support after mount (avoid SSR mismatch).
  useEffect(() => {
    setIsSupported(
      typeof window !== 'undefined' &&
        typeof window.PublicKeyCredential !== 'undefined'
    );
  }, []);

  async function enroll(input: PasskeyEnrollInput): Promise<PasskeyEnrollResult> {
    // Consumer override: bypass the ceremony entirely.
    if (onSubmitOverride) {
      setIsPending(true);
      try {
        return await onSubmitOverride(input);
      } finally {
        setIsPending(false);
      }
    }

    setIsPending(true);
    try {
      // Step 1: fetch registration options from the middleware.
      const beginRes = await fetch(beginEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: input.userId }),
        credentials: 'include'
      });

      if (!beginRes.ok) {
        const body = (await beginRes.json().catch(() => null)) as { code?: string } | null;
        const code = body?.code ?? 'CHALLENGE_FAILED';
        throw Object.assign(new Error('Challenge fetch failed'), { extensions: { code } });
      }

      const registrationOptions = (await beginRes.json().catch(() => {
        throw Object.assign(new Error('Unexpected server response'), { extensions: { code: 'UNKNOWN_ERROR' } });
      })) as Record<string, unknown>;

      // Step 2: trigger the browser dialog via the injectable loader.
      // This avoids a static `import('@simplewebauthn/browser')` that Vite would
      // resolve at transform time — the package is not installed in the authoring
      // workspace but is a declared npm dep installed on the consumer host.
      const startRegistration = await startRegistrationLoader();
      const registrationResponse = await startRegistration({ optionsJSON: registrationOptions });

      // Step 3: finish the ceremony — server verifies + persists the credential.
      const finishRes = await fetch(finishEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: input.userId,
          credentialName: input.credentialName,
          registrationResponse
        }),
        credentials: 'include'
      });

      if (!finishRes.ok) {
        const body = (await finishRes.json().catch(() => null)) as { code?: string } | null;
        const code = body?.code ?? 'UNKNOWN_ERROR';
        throw Object.assign(new Error('Finish registration failed'), { extensions: { code } });
      }

      const finishData = (await finishRes.json().catch(() => {
        throw Object.assign(new Error('Unexpected server response'), { extensions: { code: 'UNKNOWN_ERROR' } });
      })) as { credentialId: string };
      return {
        credentialId: finishData.credentialId,
        credentialName: input.credentialName
      };
    } finally {
      setIsPending(false);
    }
  }

  return { enroll, isPending, isSupported };
}
