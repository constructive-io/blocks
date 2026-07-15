# org-scim-setup-guide

**Type:** `registry:block`
**Status:** `v2 (deferred, needs DB schema design)`
**Namespace:** `org-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#org-scim-setup-guide`

**Pairing:** No page block — standalone documentation card (v2 stub). Used as: a section within org SCIM setup flow (consumer-defined layout).

## Purpose

Renders provider-specific SCIM setup instructions (Okta, Azure AD / Entra ID, JumpCloud, Google Workspace). Shows the exact configuration values the admin must enter in their IdP: SCIM endpoint URL, token, supported attribute mappings. Static documentation surface — no DB mutations.

## Deferred because

Only useful once SCIM token generation ([[org-scim-token-generation-card]]) and the `scim_providers` table exist. V2 with the rest of the SCIM feature set.

## Intended DB procedures (cross-reference `backend-spec/v2-sso-scim.md`)

- Read-only: fetches the org's SCIM endpoint URL and existing token metadata (not the plaintext) from `scim_providers` to pre-fill the guide's code blocks.
- No mutations.

## Default data hook (generated, not shipped)

**Presentational — none.** This block is a static documentation/guide surface. The instructions themselves are hardcoded; only the endpoint URL and `orgId` are dynamic (injected via props). No generated hook is imported, no `requires.json` is shipped, and `blocks-runtime` is not a required registry dependency unless a future read query is added (e.g., to pre-fill the token metadata from `scim_providers`).

If a future v2 iteration adds a read query for token metadata, the block would import from the `admin` namespace (likely grouping) and ship a `requires.json` at that time.

## Proposed props

```ts
export type SupportedScimProvider = 'okta' | 'azure-ad' | 'jumpcloud' | 'google-workspace' | 'generic';

export type OrgScimSetupGuideProps = {
  orgId: string;
  /** Which IdP's guide to show. Default: 'okta' */
  provider?: SupportedScimProvider;
  /** The SCIM base URL to embed in instructions. Default: derived from runtime config. */
  scimBaseUrl?: string;
  messages?: Partial<OrgScimSetupGuideMessages>;
  onError?: (err: unknown) => void;
};
```

## Notes

- Provider selector (tabs or dropdown) at the top so admins can switch between guides.
- Code blocks for endpoint URL and token are copyable.
- Attribute mapping table: shows Constructive field ↔ SCIM attribute name (e.g., `userName` → `emails[0].value`).
- Static content can be hardcoded in the block (no DB needed for the instructions themselves); only the endpoint URL and org ID are dynamic.
