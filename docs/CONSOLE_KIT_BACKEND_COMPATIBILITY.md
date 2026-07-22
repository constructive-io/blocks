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
and cross-database bearer rejection, strict Origin and User-Agent fingerprint
rejection for both sign-in and sign-up sessions, database-scoped session restoration,
persisted CRUD, direct-owner RLS isolation, and a composite `post_tags`
primary key. It also executes the full preset's seven-connection billing read,
asserts that the stock seed intentionally returns zero billing rows, and proves
that Console Kit renders its billing empty states without an error. The suite
creates an organization through the same type-2 user contract used by
Dashboard, observes its trigger-created owner membership, and creates and
cancels roleless application and organization invitations through the UI. It
verifies the versioned `_meta` query before loading data-backed features and
drives sign-up and an explicit verification send through Console Kit before delivering
the email through the job worker, generated function, SMTP, and Mailpit. The
proof first rejects a wrong credential, then consumes the freshly delivered
credential through `verifyEmail` from a fresh signed-out browser context,
signs in, and confirms the account email is now verified. It transfers those
values through a client-only fragment, scrubs the fragment before use, and
deletes the source Mailpit message, so the token is not written to the tenant
manifest, Next request logs, retained test artifacts, or retained proof mailbox.
This establishes fresh-credential handling; it does not establish expiry or
replay rejection, which remain backend gaps below.
Hub wraps the email proof with one site-domain row created through its
loopback-only private meta endpoint because this tenant has no site-bound
domain. Hub deletes the row after Playwright, with tenant cleanup as the
interruption fallback; neither Console Kit nor the browser suite uses operator
credentials. Proof credentials stay in mode-0600 sidecars and are never
embedded in the secret-free tenant manifest or rendered page.

Membership controls derive delegated authority from the membership's effective
permission mask and the named permission catalog; a visible mutation root does
not grant authority by itself. Authority also requires an active membership,
matching the backend support row that RLS evaluates; missing or false
`isActive` fails closed even when the public membership row carries a grant.
Application invite profiles always require an exact-width permission-mask
subset. Organization invite profiles honor a readable
`invite_profile_assignment_mode`, but a missing setting, permission mask, or
incompatible mask width falls back to strict filtering. Owners and
administrators retain their backend role fallback while active, while
delegated sessions only receive assignable profiles. Invitations without a
profile remain available whenever `create_invites` is granted.
Organization creation is enabled only when introspection proves that
`createUser.user` accepts both `displayName` and `type`; the adapter fixes
`type` to `2`, and the backend user-insert trigger creates the current actor's
owner membership in the same transaction.

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

- The generated `verify_email` function checks expiry before assigning the
  verification secret name. On the first request after three days it removes
  the expiry/rate-limit row, attempts to delete a `NULL` secret name, and
  returns false; a second request can then use the surviving expired secret
  because its expiry metadata is gone. The function also returns true without
  checking the supplied token when the email is already verified, so replay is
  idempotent rather than rejected. Assign the secret name before the expiry
  branch, remove the secret and rate-limit row atomically, and add first- and
  repeated-post-expiry regression tests before treating the credential as
  strictly expiring or one-time.
- The generated `send_verification_email` function is `SECURITY DEFINER`, is
  executable by anonymous through the stock schema defaults, and selects the
  target solely from a caller-supplied email. Console Kit binds its UI action
  to the authenticated account's loaded primary email, but direct GraphQL can
  send across accounts and distinguish an existing unverified address from a
  missing or verified address. The backend needs owner matching plus uniform
  responses and negative authorization tests; the UI guard is not the
  security boundary.
- Organization profile grants authorize the caller through the submitted
  `entity_id`, but the `SECURITY DEFINER` apply trigger updates the submitted
  `membership_id` without proving that the membership and profile belong to
  the same entity. Organization invites similarly accept a profile by ID
  without binding it to the invitation entity. Console Kit filters profile
  IDs by the active organization, requires readable scope metadata, removes
  ambiguous role names, and binds membership IDs to its RLS-visible snapshot,
  but direct GraphQL remains vulnerable until both generator paths enforce the
  same-entity invariant in the database.
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
- Stock tenant provisioning creates site theme and legal-terms metadata and
  attempts to insert the shared `app.localhost` site domain with
  `ON CONFLICT DO NOTHING`. After the first local tenant claims that route,
  later tenants retain only API-bound domains with no `site_id`, so
  `sendVerificationEmail` fails in the worker until a unique site domain is
  configured. Sign-up also does not enqueue verification automatically. The
  live proof adds and removes that reversible prerequisite explicitly and pins
  its IPv4-only Mailpit connection to `127.0.0.1`; an untouched later tenant
  still does not have working email delivery. The generated local link is
  `https://localhost/verify-email` without the Blocks development port, so the
  proof establishes delivery and token consumption through its integration
  adapter but does not claim that this generated local link is directly
  clickable end to end.
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
