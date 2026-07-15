# auth-domain-verification-step

**Type:** `registry:block`
**Status:** `v2 (deferred, needs DB schema design)`
**Namespace:** `auth-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#auth-domain-verification-step`

**Pairing:** No page block — sub-flow step (v2 stub). Embedded as a wizard step inside [[auth-sso-setup-card]].

## Purpose

Sub-flow of [[auth-sso-setup-card]]. Displays the DNS TXT record the admin must add to their domain to prove ownership, then polls the server until the record is detected or a timeout is reached. Used to bind an org's SSO configuration to a verified domain.

## Deferred because

Domain verification requires a server-side DNS lookup mechanism and a `domain_verified_at` column in `constructive_auth_private.sso_providers`. Neither exists today. Schema spec in `backend-spec/v2-sso-scim.md`.

## Binding status

**v2 stub — no generated hook, no `requires.json`.** This block has no DB procedures deployed and no PostGraphile schema exists yet for SSO/domain verification. When v2 schema is designed and deployed, the block will import generated hooks from `@/generated/auth` (assuming procedures land in `constructive_auth_public`). No `@constructive-io/data` references; no `requires.json` shipped at this stage.

## Intended DB procedures (cross-reference `backend-spec/v2-sso-scim.md`)

- `constructive_auth_public.get_domain_verification_record(sso_provider_id uuid) RETURNS TABLE(txt_record_name text, txt_record_value text)` (hypothetical)
- `constructive_auth_public.check_domain_verification(sso_provider_id uuid) RETURNS boolean` (hypothetical — triggers DNS lookup server-side, sets `domain_verified_at` on success)

## Proposed props

```ts
export type AuthDomainVerificationStepProps = {
  ssoProviderId: string;
  domain: string;
  /** Polling interval in ms. Default: 5000 (5s). */
  pollIntervalMs?: number;
  /** Max poll duration in ms. Default: 300000 (5 min). */
  pollTimeoutMs?: number;
  messages?: Partial<AuthDomainVerificationStepMessages>;
  onVerified?: (ssoProviderId: string) => void;
  onTimeout?: () => void;
  onError?: (err: unknown) => void;
};
```

## States

- `loading` — fetching TXT record to display.
- `waiting` — TXT record displayed, polling for DNS propagation.
- `verified` — `domain_verified_at` set, fires `onVerified`.
- `timeout` — polling time exceeded, fires `onTimeout`.
- `error` — lookup procedure failed.

## Notes

- This block can be used standalone or embedded in [[auth-sso-setup-card]] as a wizard step.
- Show a "Check now" manual trigger button so impatient admins don't have to wait for the poll interval.
- DNS propagation can take minutes to hours. Communicate this clearly in the UI.
