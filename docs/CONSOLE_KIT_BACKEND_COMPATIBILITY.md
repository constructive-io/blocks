# Console Kit backend compatibility

Console Kit is an application-database console for Constructive tenants. It
does not depend on a control-plane SDK, a provisioning receipt, or a known
preset name at runtime. The host supplies a database identity and its public
GraphQL endpoints; Console Kit discovers what those endpoints expose and lets
PostgreSQL privileges and RLS decide what the signed-in user may do.

The compatibility guarantee covers the current `auth:hardened`, `b2b:storage`,
and `full` Constructive DB presets. Individually installed feature packs also
work with custom tenants that expose their required public contracts, but a
pack being installed in the frontend never proves that its backend capability
is exposed or authorized.

## Install surfaces

`console-kit-core` installs the shell, runtime, capability states, endpoint and
session handling, and store without importing a feature pack. Each
`feature-pack-*` item installs only its provider-neutral view, shared view
dependencies, and compatibility manifest, so it can be rendered by a host that
does not use Console Kit. The matching `console-module-*` item installs core and
that standalone feature pack transitively, then adds its
`ConsoleKitFeatureModule`, discovery bindings, Constructive adapter, metadata
resolver, and pack-owned state where applicable.

| Intended use | Registry item | Installs Console Kit core |
| --- | --- | --- |
| Host-controlled standalone view | `feature-pack-{id}` | No |
| Selected Console Kit composition | `console-module-{id}` | Yes, transitively |
| Official backend-aligned composition | `preset-{profile}` | Yes |
| Complete one-command console | `console-kit-nextjs` | Yes |

Preset items install core plus the exact modules for one official preset:

| Registry item | Installed feature modules |
| --- | --- |
| `preset-auth-hardened` | Data, Auth, Users |
| `preset-b2b-storage` | Data, Auth, Users, Organizations, Storage |
| `preset-full` | Data, Auth, Users, Organizations, Storage, Billing, Notifications |

`console-kit-nextjs` remains the one-command full install. Custom applications
can instead install core and only the `console-module-*` integrations they need,
then pass those modules to `ConsoleKit`. Installing a console module also
installs its standalone feature-pack view; installing only the feature pack does
not pull in Console Kit. Navigation is the intersection of installed modules
and capabilities actually discovered for the active tenant.

Every Console Kit instance owns one Zustand store composed from modular
slices. Core contributes navigation, tenant, session, endpoint, discovery,
runtime, and adapter state; packs may contribute their own slices through
their feature modules. Changing the database or identity aborts stale work,
clears scoped core caches, constructs fresh module state, and invalidates old
module action and getter closures. Same-scope adapter refreshes preserve module
state. A feature pack must not create another provider or use a process-wide
store.

## Capability and authorization evidence

Console Kit evaluates each public endpoint independently:

1. **Reachability.** The host-provided endpoint must answer; Console Kit never
   derives sibling hosts or uses private routing headers.
2. **Schema metadata.** `_meta` supplies database tables, fields, primary and
   foreign keys, relations, advisory GraphQL inflection, scopes, and feature
   smart tags. It can include tables or operation names that are not exposed by
   the current public GraphQL schema.
3. **GraphQL operations.** Standard introspection identifies the exact
   executable roots, mutation inputs, pagination, filters, and other public
   shapes. Adapters must reconcile `_meta` hints against this surface before
   constructing an operation.
4. **Runtime authority.** Authenticated reads and writes establish the current
   user's effective grants and RLS visibility. `_meta` and introspection are
   schema evidence, not authorization evidence.

Each pack declares which layers it requires. Data, Organizations, and Storage
require compatible table `_meta` because their adapters resolve tenant-specific
tables, relationships, and semantic tags. Auth, Users, Billing, and
Notifications use Constructive's named module operations and require standard
GraphQL introspection; they record `_meta` sections as optional rather than
pretending an incompatible `_meta` response invalidates otherwise introspectable
module roots.

Endpoint adapters move through `checking`, `available`, `unavailable`,
`unauthorized`, `incompatible`, or `error`. Pack capability discovery records
`checking`, `ready`, `partial`, or `unavailable`. These states combine the
evidence above; they are not a claim that schema exposure and runtime authority
are the same thing. A visible mutation root does not imply that the current
user may execute it, and an RLS-empty result is not expanded through an
operator endpoint. Ambiguous primary keys, relationships, or semantic bindings
fail closed until the host supplies an explicit binding.

The host passes an explicit semantic endpoint map or resolver. The Zustand
session slice remains credential-free. In standalone mode, the bearer token is
held by the database-scoped session closure and session storage by default, or
local storage only when the host opts into a remembered session. The session
sends its credential to selected tenant endpoints and rejects a database
identity mismatch. Sign-out and token rejection clear identity-scoped state
before another user can inherit it.

## Official preset expectations

The preset composition controls what frontend code is installed; runtime
availability still follows the evidence above.

| Preset | Expected public behavior |
| --- | --- |
| `auth:hardened` | Auth and user-management contracts are discovered from their public endpoints. Data appears when the tenant has exposed application tables. |
| `b2b:storage` | Auth, Users, and Organizations can activate when their contracts are exposed. The stock Storage module is installed but its bucket/file schema is not routed through a default public API, so Storage remains unavailable with a missing semantic-route reason. |
| `full` | All seven frontend modules are installed. Stock Storage remains unavailable without a semantic route, and Notifications remains unavailable because the stock API/schema has no public domain; the remaining packs activate only when their required contracts are present. |

The `objects` endpoint is the object-store API and is not evidence that the
Storage pack's bucket and file tables are available. Storage becomes usable
when one reachable public endpoint exposes both storage-tagged bucket and file
tables through `_meta` and exposes the corresponding operations through
introspection. A custom tenant can use the supported Storage module option
`{ api_name: "admin" }` to provide that route without changing Constructive DB.

Likewise, a Notifications module record or API-schema link is not a reachable
inbox. The pack activates only when the host supplies a public endpoint whose
introspection exposes the required notification roots. These states describe
the tenant's public surface; they do not diagnose an absent module or a
backend defect.

## Native verification contract

Live compatibility is exercised against an untouched Constructive DB runtime
started from `constructive-db/functions` with:

```bash
fun up --local --db consolekitblocks
```

The Blocks fixture calls the native `metaschema_generators.provision_database`
procedure with the current preset module arrays, reads the resulting endpoint
map from the service metadata tables, and adds a direct-owner application table
for CRUD/RLS coverage. The fixture explicitly changes the app-membership
defaults to auto-approved and auto-verified, recorded as
`membershipFixtureMode: "auto-approved-and-verified"` in its secret-free
manifest. This isolates Console Kit session and tenant-RLS behavior from mail
delivery; it does not prove the stock email-verification workflow.

The fixture also creates one custom B2B tenant with Storage routed to `admin`
so storage-tagged bucket and file metadata plus their public query roots can be
verified through supported backend configuration. The endpoint exposes table
CRUD roots such as `createBucket` and `createFile`, but it does not expose the
object-upload or presigned-URL workflow required by the Storage adapter. The
adapter therefore intentionally presents a read-only state and hides write
controls.

The browser path exercises Console Kit signup, persisted-session restoration
after reload, signout/signin, `_meta`-driven Data navigation, authenticated
Users and Organizations routes, and the routed read-only Storage view. Separate
public GraphQL helpers exercise direct-owner create, read, update, and delete,
anonymous and peer isolation, plus invalid, revoked, and cross-tenant token
rejection. The suite does not claim those CRUD mutations are browser-driven.

Fixture cleanup first inventories the physical PostgreSQL schemas belonging to
the exact journaled tenant database IDs, drops only those quoted namespaces,
deletes the matching metadata, and verifies that neither catalog rows nor
physical namespaces remain. The live runtime does not patch Constructive DB,
regenerate its packages, or treat a frontend workaround as part of the
compatibility contract.
