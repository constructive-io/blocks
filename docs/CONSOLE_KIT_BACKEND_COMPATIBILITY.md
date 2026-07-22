# Console Kit backend compatibility

Console Kit targets Constructive `_meta` contract `2026-07` and the semantic
tenant endpoint descriptor emitted by the canonical seeder. Compatibility means
that the data endpoint satisfies that complete metadata contract and each
enabled feature endpoint exposes the roots and input objects its adapter checks.
An arbitrary GraphQL endpoint, an older `_meta` shape, or a routed API name by
itself is not treated as compatible.

## Verified preset matrix

The retained proof provisions three independent databases and authenticates a
real user against each one:

| Preset | Seed | Expected application surface |
| --- | --- | --- |
| `auth:hardened` | CRM | Data, authentication, and application users |
| `b2b:storage` | SaaS | Data, authentication, users, organizations, and storage when the storage schema is routed |
| `full` | Blog | Every pack whose semantic endpoint is routed and whose exact contract is present |

The proof covers sign-up, sign-in, current-account loading, sign-out, revoked
and cross-database bearer rejection, database-scoped session restoration,
persisted CRUD, direct-owner RLS isolation, and a composite `post_tags`
primary key. It also verifies the versioned `_meta` query before loading
data-backed features. Proof credentials stay in mode-0600 sidecars and are
never embedded in the secret-free tenant manifest or rendered page.

Hardened auth tenants can enable `require_csrf_for_auth`. Console Kit accepts
an async `csrfTokenProvider` which must ask a trusted host endpoint to create a
fresh private anonymous session and return its `csrf_secret`; the token is sent
only as `SignInInput.csrfToken` or `SignUpInput.csrfToken`, and Constructive
is intended to revoke the anonymous session after successful authentication.
The current GraphQL auth schema does not expose an anonymous-session bootstrap
operation, so this provider cannot be implemented safely in browser code
alone.

Standalone sign-out clears the local credential before attempting server
revocation. If that request fails, the session keeps the old bearer in a
non-authorizing in-memory revocation queue and exposes
`retryPendingSignOut()` for an explicit retry; the queued bearer is never
returned by `getAccessToken` or written back to browser storage.

## Current backend gaps

- The generated `sign_in` and `sign_up` functions currently revoke a validated
  anonymous session with an unqualified `WHERE id = v_anon_session.id`. The
  column conflicts with each function's `OUT id` parameter, so PostgreSQL
  raises `column reference "id" is ambiguous` after valid credentials are
  accepted. Qualify the target column in the auth generator and regenerate the
  tenant before enabling `require_csrf_for_auth`; the Console Kit provider
  contract is ready, but the secure-default flow cannot complete on this
  backend revision.
- The stock storage module creates bucket and file tables but does not assign
  an API name. The semantic `storage` endpoint currently resolves to the object
  service and exposes neither table, so Console Kit correctly marks Storage
  unavailable. Route the storage schema explicitly before claiming this pack.
- The stock `full` preset creates a notifications API and schema link without a
  domain, so the seeder reports Notifications as unroutable. Core notification
  rows also need SELECT-only recipient policy; user dismissal belongs in the
  owner-scoped read-state row.
- Billing exposes plans, subscriptions, meters, usage summaries, credits, and
  ledger data, but it has no public authoritative current-balance read model or
  RLS-safe subscription-management RPC. The first-party adapter is therefore
  read-only and does not claim provider management.
- MFA challenge completion and personal profile editing are not part of the
  standalone Console Kit flow. The former needs a session completion contract;
  the latter needs a constrained backend self-update policy or RPC.

## Bootstrap invariant

Tenant provisioning requires the persisted `database:provision` function
definition from the `constructive-functions` seed package as well as the
runtime handler. The proof configuration installs that package before starting
the compute worker. Its preflight also compares Constructive source package
versions with the ignored `dist` manifests, preventing a stale CLI/server build
from being reported under the current Git revision.

Storage and notifications become compatible when their schemas are routed and
the exact adapter contracts are present; Console Kit does not alias them onto a
different API or infer permission from a visible mutation root.
