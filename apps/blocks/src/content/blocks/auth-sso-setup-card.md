# auth-sso-setup-card

**Type:** `registry:block`
**Status:** `v2 (deferred, needs DB schema design)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#auth-sso-setup-card`

**Pairing:** No page block — card-only (v2 stub). Intended for use inside org settings admin pages.

## Purpose

Admin block allowing an org owner/admin to configure an enterprise Identity Provider (IdP) for their organization using OIDC or SAML. Composes [[auth-domain-verification-step]] as a sub-flow. Creates/updates a `sso_providers` row scoped to the org. Used in org settings, not on sign-in screens.

## Deferred because

No `sso_providers` table exists in `constructive_auth_private` today. The schema spec is in `backend-spec/v2-sso-scim.md`. Enterprise SSO is post-Auth-v1; requires DB PR adding the table, procedures, and domain-verification webhook.

## Intended DB procedures (cross-reference `backend-spec/v2-sso-scim.md`)

- `constructive_auth_public.configure_sso_provider(org_id uuid, kind 'oidc'|'saml', discovery_url text, client_id text, client_secret text, domain text) RETURNS sso_provider_id uuid` (hypothetical)
- `constructive_auth_public.delete_sso_provider(sso_provider_id uuid) RETURNS boolean` (hypothetical)
- Schema: `constructive_auth_private.sso_providers (id, organization_id, kind oidc|saml, issuer, metadata_url, domain, domain_verified_at, oidc_config jsonb, saml_config jsonb)`

## Proposed props

```ts
export type AuthSsoSetupCardProps = {
  /** The org User (type=2) to configure SSO for */
  orgId: string;
  messages?: Partial<AuthSsoSetupCardMessages>;
  notifications?: boolean | NotificationConfig;
  onSuccess?: (result: { ssoProviderId: string }) => void;
  onError?: (err: unknown) => void;
};
```

## Messages catalog (partial — v2 stub)

```ts
// Messages catalog to be completed when block is built (v2).
// Backend-pending blocks MUST include PROCEDURE_NOT_FOUND per endpoint-contract.md §6.
errors: {
  PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
}
```

## Steps (planned)

1. Choose provider kind: OIDC or SAML.
2. OIDC: discovery URL + client ID + secret. SAML: metadata XML upload or URL.
3. Domain claim: enter the email domain for SSO enforcement.
4. [[auth-domain-verification-step]]: DNS TXT record display + polling verification.
5. Test connection button.
6. Save / Enable.
