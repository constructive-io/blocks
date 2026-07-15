# org-scim-connections-list

**Type:** `registry:block`
**Status:** `v2 (deferred, needs DB schema design)`
**Namespace:** `org-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#org-scim-connections-list`

**Pairing:** No page block — card-only (v2 stub). Used as: a section within org SCIM settings (consumer-defined layout).

## Purpose

Lists active SCIM provider connections for an org. Each row shows: the SCIM endpoint URL the consumer should configure in their IdP, last sync timestamp, connection status, and a Revoke button. One connection per IdP in Constructive's model.

## Deferred because

Requires `constructive_auth_private.scim_providers` table and SCIM sync infrastructure. Schema spec in `backend-spec/v2-sso-scim.md`.

## Intended DB procedures (cross-reference `backend-spec/v2-sso-scim.md`)

- Queries `constructive_auth_private.scim_providers` filtered by `organization_id`. Must be selectable by org admins via RLS.
- `constructive_auth_public.revoke_scim_token(scim_provider_id uuid) RETURNS boolean` (hypothetical)

## Proposed props

```ts
export type OrgScimConnectionsListProps = {
  orgId: string;
  /** Base URL for the SCIM endpoint shown to the admin. Default: derived from runtime config. */
  scimBaseUrl?: string;
  messages?: Partial<OrgScimConnectionsListMessages>;
  notifications?: boolean | NotificationConfig;
  onRevokeSuccess?: (scimProviderId: string) => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};
```

## Default data hook (generated, not shipped)

backend-pending — no generated hook until `constructive_auth_private.scim_providers` is exposed via a public API and codegen emits the SDK. When available, namespace is likely `admin` (SCIM operations would live in a `scim_public` schema grouped into the `admin` API). See `backend-spec/v2-sso-scim.md`.

Messages catalog must include `PROCEDURE_NOT_FOUND` once a future mutation is wired (see `endpoint-contract.md` §6).

## Notes

- Pairs with [[org-scim-token-generation-card]] (linked as primary CTA when no connections exist).
- "Last sync" timestamp: format as relative time (e.g., "2 hours ago").
- SCIM endpoint URL format: `{scimBaseUrl}/scim/v2/{orgId}`.
