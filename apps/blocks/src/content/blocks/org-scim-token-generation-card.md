# org-scim-token-generation-card

**Type:** `registry:block`
**Status:** `v2 (deferred, needs DB schema design)`
**Namespace:** `org-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#org-scim-token-generation-card`

**Pairing:** No page block — card-only (v2 stub). Used as: a section within org SSO/SCIM settings (consumer-defined layout).

## Purpose

Admin block that generates a SCIM bearer token for an org's SCIM connection. The token is hashed and stored in `constructive_auth_private.scim_providers.token_hash`. The plaintext is shown exactly once at generation time (never again). Requires step-up auth before generation.

## Deferred because

No `scim_providers` table exists. Schema spec in `backend-spec/v2-sso-scim.md`. Requires enterprise SCIM provisioning work in constructive-db.

## Intended DB procedures (cross-reference `backend-spec/v2-sso-scim.md`)

- `constructive_auth_public.generate_scim_token(org_id uuid) RETURNS TABLE(token text, scim_provider_id uuid, expires_at timestamptz)` (hypothetical — returns plaintext once; stores hash)
- `constructive_auth_public.revoke_scim_token(scim_provider_id uuid) RETURNS boolean` (hypothetical)
- Schema: `constructive_auth_private.scim_providers (id, organization_id, token_hash, last_sync_at)`

## Default data hook (generated, not shipped)

backend-pending — no generated hook until `generate_scim_token` and `revoke_scim_token` are deployed in a public schema and codegen emits the SDK. When available, namespace is likely `admin`. Hook names would be `useGenerateScimTokenMutation` and `useRevokeScimTokenMutation`. Block would ship a `org-scim-token-generation-card.requires.json` with `{ "namespace": "admin", "mutations": ["generateScimToken", "revokeScimToken"], "queries": [], "models": [] }`.

Messages catalog must include `PROCEDURE_NOT_FOUND` (see `endpoint-contract.md` §6).

## Proposed props

```ts
export type OrgScimTokenGenerationCardProps = {
  orgId: string;
  messages?: Partial<OrgScimTokenGenerationCardMessages>;
  notifications?: boolean | NotificationConfig;
  onSuccess?: (result: { token: string; expiresAt: string | null }) => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Step-up

Required (`type: 'password'` or `type: 'mfa'`) before generating. The plaintext token exposure is a sensitive operation.

## Notes

- Show token in a read-only input with a "Copy" button. Mark it as "shown once" with a warning.
- Link to [[org-scim-setup-guide]] after generation.
- Revoke button for existing tokens with confirmation.
