# auth-sso-sign-in-card

**Type:** `registry:block`
**Status:** `v2 (deferred, needs DB schema design)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#auth-sso-sign-in-card`

**Pairing:** No page block — card-only (v2 stub). Composed inside [[auth-sign-in-card]] when SSO detection is enabled.

## Purpose

Enhancement to [[auth-sign-in-card]]: when the user types an email and blurs the email field, detects whether the email's domain is enrolled in SSO. If it is, replaces or hides the password field and shows a "Sign in with [Company Name] SSO" button that redirects to the IdP. Domain lookup must be fast (< 200ms) to not feel janky.

## Deferred because

Requires `sso_providers.domain` and `domain_verified_at` columns — none of which exist today. DB schema spec in `backend-spec/v2-sso-scim.md`. This block depends on [[auth-sso-setup-card]] being deployed first.

## Intended DB procedures (cross-reference `backend-spec/v2-sso-scim.md`)

- `constructive_auth_public.get_sso_provider_for_domain(domain text) RETURNS TABLE(sso_provider_id uuid, org_id uuid, kind text, display_name text)` (hypothetical — must be callable by anonymous role for sign-in page, returns NULL if no SSO enrolled for domain)
- OAuth redirect: `constructive_auth_public.begin_sso_flow(sso_provider_id uuid, return_to text) RETURNS redirect_url text` (hypothetical)

## Proposed props

```ts
export type AuthSsoSignInCardProps = {
  /** Pre-fill email. If provided, domain check runs immediately. */
  defaultEmail?: string;
  messages?: Partial<AuthSsoSignInCardMessages>;
  notifications?: boolean | NotificationConfig;
  /** Fires when SSO domain is detected — caller may choose to hide password form entirely. */
  onSsoDetected?: (result: { orgName: string; ssoProviderId: string }) => void;
  onSuccess?: (result: SignInResult) => void;
  onError?: (err: unknown) => void;
};
```

## Messages catalog (partial — v2 stub)

```ts
// Messages catalog to be completed when block is built (v2).
// Backend-pending blocks MUST include PROCEDURE_NOT_FOUND per endpoint-contract.md §6.
errors: {
  PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
  SSO_NOT_CONFIGURED: 'SSO is not configured for this domain.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
}
```

## Notes

- This block augments [[auth-sign-in-card]]; it does not replace it. The two can be composed: `<AuthSignInCard ssoDetection={true} />` or mount them side by side.
- The domain check should be debounced (500ms after blur) and cache results (same domain → same result within session).
- If `allow_password_sign_in=true` and SSO is detected, offer a "Use password instead" escape hatch.
