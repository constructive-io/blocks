// flows-content — the single source of truth for the auth "flows" catalog.
//
// A "flow" is a backend-capability bundle (better-auth's "plugin" model): it
// answers "which auth flow do you want to install?" with the backend modules to
// provision, the GraphQL operations that go live, and the Blocks that wire the
// UI. One manifest drives the flow reference pages (built by flows-pages.mjs into
// src/lib/docs/registry-data.ts) AND the downstream committed artifacts
// (src/flows/flows.json + the constructive-blocks skill + agentic-flow harness)
// so every surface can never drift.
//
// generate-flows.mjs + flows-pages.mjs (plain node, can't import the TS manifest)
// read this to author every surface. Mirrors showcase-content.mjs: plain exported
// data, zero deps, never imported by block source.
//
// Authoring rules (enforced by generate-flows.mjs + the vitest test):
//   - `status` is 'ga', 'limited', or 'blocked'. Non-GA flows MUST carry an
//     exact knownBackendLimitations entry with its PLATFORM-GAPS reference.
//   - `backend.preset` names a SHIPPED node-type-registry preset
//     ('auth:email' | 'auth:sso' | 'b2b'); the generator resolves it to the
//     authoritative flat module list. NEVER hand-list modules here — that is
//     exactly the drift the preset resolution exists to prevent.
//   - `blocks` are EXACT registry.json slugs (category-prefixed, e.g.
//     `auth-sign-in-card`). The generator hard-fails on any unknown slug.
//   - `relatedFlows` are `id`s of other flows in this manifest.
//
// Object/array order is the authored order; the generator preserves it for the
// sidebar + landing page, and canonicalizes (sorts keys) only for the sotHash.

/**
 * @typedef {Object} FlowBackend
 * @property {'auth:email'|'auth:sso'|'b2b'} preset  Smallest shipped preset that covers this flow's modules.
 * @property {string[]} exposedOps  GraphQL operations this flow makes live (advisory, for docs).
 *
 * @typedef {Object} FlowHowto
 * @property {string} provision  Shell snippet: provision the preset's modules (rendered in a ```bash fence).
 * @property {string} install    Shell snippet: install this flow's blocks (rendered in a ```bash fence).
 * @property {string} wire       TSX snippet: mount/wire the blocks (rendered in a ```tsx fence).
 * @property {string} usage      TSX snippet: representative usage (rendered in a ```tsx fence).
 *
 * @typedef {Object} FlowContract
 * @property {string[]} [constraints]  Runtime contract notes (accepted enum values, server-side
 *   gates, prop↔backend mismatches) an author MUST honor — rendered as bullets in MDX + flow-catalog.md.
 * @property {string[]} [knownBackendLimitations]  Known upstream defects/no-ops, each ending with the
 *   escalation tag `(PLATFORM-GAPS GAP-N)` — rendered as a distinct bullet group so agents don't treat a
 *   lying `true` as truth.
 *
 * @typedef {Object} Flow
 * @property {string} id           Stable kebab-case id, unique across the manifest.
 * @property {string} name         Human-readable title.
 * @property {'authentication'|'account-session'|'authorization'} group
 * @property {'ga'|'limited'|'blocked'} status
 * @property {string} summary      One-line pitch.
 * @property {FlowBackend} backend
 * @property {string[]} blocks     Exact registry.json slugs.
 * @property {FlowHowto} howto
 * @property {FlowContract} [contract]  Optional structured runtime contract (constraints +
 *   known backend limitations). Part of the resolved view, so it is covered by the sotHash.
 * @property {string[]} relatedFlows  Ids of related flows.
 */

/** @type {Flow[]} */
export const FLOWS = [
  // ---------------------------------------------------------------- authentication
  {
    id: 'email-password',
    name: 'Email + password',
    group: 'authentication',
    status: 'ga',
    summary:
      'The reference sign-in surface: register, sign in, sign out, and read the current user against email + password credentials.',
    backend: {
      preset: 'auth:email',
      exposedOps: ['signUp', 'signIn', 'signOut', 'currentUser']
    },
    blocks: [
      'auth-sign-in-card',
      'auth-sign-up-card',
      'auth-sign-out-button',
      'auth-sign-in-page',
      'auth-sign-up-page'
    ],
    howto: {
      provision:
        '# Provision the auth:email modules onto your database (see Backend below for the full list).\n' +
        'pgpm install   # or: provision via databaseProvisionModule.create({ data: { modules } })',
      install:
        'npx shadcn@latest add @constructive/auth-sign-in-card @constructive/auth-sign-up-card @constructive/auth-sign-out-button @constructive/auth-sign-in-page @constructive/auth-sign-up-page',
      wire:
        "import { BlocksRuntime } from '@/blocks/runtime/blocks-runtime';\n" +
        "import { tokenManager } from '@/lib/auth/token-manager';\n\n" +
        "// Mount once at the app root so every auth block resolves its hook.\n" +
        "<BlocksRuntime namespaces={['auth']} getToken={() => tokenManager.getAccessToken()}>\n" +
        '  {children}\n' +
        '</BlocksRuntime>',
      usage:
        "import { SignInCard } from '@/blocks/auth/sign-in-card/sign-in-card';\n\n" +
        'export function SignInRoute() {\n' +
        '  const router = useRouter();\n' +
        '  return (\n' +
        '    <SignInCard\n' +
        '      signUpHref="/auth/sign-up"\n' +
        '      forgotPasswordHref="/auth/forgot-password"\n' +
        '      onSuccess={() => router.push("/")}\n' +
        '    />\n' +
        '  );\n' +
        '}'
    },
    relatedFlows: ['email-verification', 'password-reset', 'social-oauth', 'profile']
  },
  {
    id: 'email-verification',
    name: 'Email verification',
    group: 'authentication',
    status: 'blocked',
    summary: 'Confirm a user owns their email: a verify-link landing page plus a resend banner for unverified accounts.',
    backend: {
      preset: 'auth:email',
      exposedOps: ['verifyEmail', 'sendVerificationEmail']
    },
    blocks: ['auth-verify-email-banner', 'auth-verify-email-page'],
    howto: {
      provision:
        '# auth:email already exposes verifyEmail / sendVerificationEmail — no extra modules.\n' +
        'pgpm install',
      install: 'npx shadcn@latest add @constructive/auth-verify-email-banner @constructive/auth-verify-email-page',
      wire:
        "import { VerifyEmailBanner } from '@/blocks/auth/verify-email-banner/verify-email-banner';\n\n" +
        '// Show the banner in your app header for signed-in, unverified users.\n' +
        'export function AppHeader({ user }) {\n' +
        '  if (user.isVerified) return null;\n' +
        '  return <VerifyEmailBanner email={user.primaryEmail} />;\n' +
        '}',
      usage:
        "// Mount the page at /auth/verify-email; it reads ?email_id= and ?token= from the URL.\n" +
        "import { VerifyEmailPage } from '@/blocks/auth/verify-email-page/verify-email-page';\n\n" +
        'export default function Page() {\n' +
        '  return <VerifyEmailPage signInHref="/auth/sign-in" dashboardHref="/dashboard" />;\n' +
        '}'
    },
    contract: {
      knownBackendLimitations: [
        'sendVerificationEmail aborts before enqueue because the deployed email path calls user_secrets_del(uuid, text[]) while only user_secrets_del(uuid, text) exists. Verification links cannot be sent until the backend signature is fixed. (PLATFORM-GAPS GAP-9)'
      ]
    },
    relatedFlows: ['email-password', 'password-reset']
  },
  {
    id: 'password-reset',
    name: 'Password reset',
    group: 'authentication',
    status: 'ga',
    summary: 'Forgot-password request plus the emailed reset-token landing — enumeration-safe by construction.',
    backend: {
      preset: 'auth:email',
      exposedOps: ['forgotPassword', 'resetPassword']
    },
    blocks: [
      'auth-forgot-password-card',
      'auth-forgot-password-page',
      'auth-reset-password-card',
      'auth-reset-password-page'
    ],
    howto: {
      provision:
        '# forgotPassword / resetPassword ship with auth:email — no extra modules.\n' +
        'pgpm install',
      install:
        'npx shadcn@latest add @constructive/auth-forgot-password-card @constructive/auth-forgot-password-page @constructive/auth-reset-password-card @constructive/auth-reset-password-page',
      wire:
        '// Both pages are thin route wrappers — no extra wiring beyond BlocksRuntime.\n' +
        '// forgot-password-page reads ?email=; reset-password-page reads ?token= and ?role_id=.',
      usage:
        "import ForgotPasswordPage from '@/blocks/auth/forgot-password-page/forgot-password-page';\n\n" +
        '// app/auth/forgot-password/page.tsx\n' +
        'export default function Page() {\n' +
        '  return <ForgotPasswordPage />;\n' +
        '}'
    },
    relatedFlows: ['email-password', 'change-password']
  },
  {
    id: 'social-oauth',
    name: 'Social / OAuth sign-in',
    group: 'authentication',
    status: 'ga',
    summary: 'Sign in with configured identity providers (Google, GitHub, …) rendered as a button row or a prominent grid.',
    backend: {
      preset: 'auth:sso',
      exposedOps: ['identityProviders', 'signInIdentity', 'signUpIdentity']
    },
    blocks: ['auth-social-buttons', 'auth-social-providers-grid'],
    howto: {
      provision:
        '# auth:sso adds connected_accounts_module + identity_providers_module (see Backend below).\n' +
        'pgpm install',
      install: 'npx shadcn@latest add @constructive/auth-social-buttons @constructive/auth-social-providers-grid',
      wire:
        "import { AuthSocialButtons } from '@/blocks/auth/social-buttons/social-buttons';\n\n" +
        '// Omit `providers` to load enabled providers from the identity-providers API at runtime.\n' +
        '<AuthSocialButtons mode="sign-in" layout="stacked" />',
      usage:
        "import { AuthSocialProvidersGrid } from '@/blocks/auth/social-providers-grid/social-providers-grid';\n\n" +
        'export function SignInExtras() {\n' +
        '  return <AuthSocialProvidersGrid mode="sign-in" returnTo="/dashboard" />;\n' +
        '}'
    },
    relatedFlows: ['email-password', 'connected-accounts']
  },
  {
    id: 'cross-origin',
    name: 'Cross-origin sign-in',
    group: 'authentication',
    status: 'ga',
    summary: 'Hand an authenticated session to another origin via a short-lived one-time token appended to the destination URL.',
    backend: {
      preset: 'auth:email',
      exposedOps: ['requestCrossOriginToken', 'signInCrossOrigin']
    },
    blocks: ['auth-cross-origin-link'],
    howto: {
      provision:
        '# requestCrossOriginToken / signInCrossOrigin ship with auth:email — no extra modules.\n' +
        'pgpm install',
      install: 'npx shadcn@latest add @constructive/auth-cross-origin-link',
      wire:
        "import { CrossOriginLink } from '@/blocks/auth/cross-origin-link/cross-origin-link';\n\n" +
        '// Mount inside the same form that collected email/password.\n' +
        '<CrossOriginLink\n' +
        '  email={email}\n' +
        '  password={password}\n' +
        '  destinationOrigin="https://app.example.com"\n' +
        '  destinationPath="/auth/cross-origin"\n' +
        '>\n' +
        '  Continue to app\n' +
        '</CrossOriginLink>',
      usage:
        "import { CrossOriginLink } from '@/blocks/auth/cross-origin-link/cross-origin-link';\n\n" +
        '<CrossOriginLink email={email} password={password} destinationOrigin="https://app.example.com" destinationPath="/auth/cross-origin" />'
    },
    relatedFlows: ['email-password']
  },

  // ---------------------------------------------------------------- account-session
  {
    id: 'profile',
    name: 'Profile',
    group: 'account-session',
    status: 'ga',
    summary: "Let the signed-in user edit their display name and avatar against the auth:email user model.",
    backend: {
      preset: 'auth:email',
      exposedOps: ['updateUser', 'currentUser']
    },
    blocks: ['auth-account-profile-card'],
    howto: {
      provision:
        '# updateUser / currentUser ship with auth:email — no extra modules.\n' +
        'pgpm install',
      install: 'npx shadcn@latest add @constructive/auth-account-profile-card',
      wire:
        "import { AccountProfileCard } from '@/blocks/auth/account-profile-card/account-profile-card';\n\n" +
        '// The profile card binds to updateUser/currentUser — only BlocksRuntime is required.\n' +
        '// NOTE: auth-account-security-card (passkeys) and the auth-account-settings-page\n' +
        '// composite hard-import ops OUTSIDE auth:email (webauthnCredentials, phoneNumbers/SMS,\n' +
        '// connectedAccounts/SSO). They belong to a richer preset (auth:sso / b2b), not this\n' +
        '// minimal profile flow — install them only once those modules are provisioned.\n' +
        'export default function AccountPage() {\n' +
        '  return <AccountProfileCard />;\n' +
        '}',
      usage:
        "import { AccountProfileCard } from '@/blocks/auth/account-profile-card/account-profile-card';\n\n" +
        '<AccountProfileCard onSuccess={() => toast.success("Profile updated")} />'
    },
    relatedFlows: ['account-emails', 'change-password', 'sessions']
  },
  {
    id: 'account-emails',
    name: 'Account emails',
    group: 'account-session',
    status: 'limited',
    summary: "Manage the signed-in user's email addresses: add, verify, set primary, and remove.",
    backend: {
      preset: 'auth:email',
      exposedOps: ['createEmail', 'updateEmail', 'deleteEmail', 'emails']
    },
    blocks: ['auth-account-emails-list'],
    howto: {
      provision:
        '# emails_module + its CRUD ship with auth:email — no extra modules.\n' +
        'pgpm install',
      install: 'npx shadcn@latest add @constructive/auth-account-emails-list',
      wire:
        "import { AccountEmailsList } from '@/blocks/auth/account-emails-list/account-emails-list';\n\n" +
        '<AccountEmailsList maxEmails={10} />',
      usage:
        "import { AccountEmailsList } from '@/blocks/auth/account-emails-list/account-emails-list';\n\n" +
        '<AccountEmailsList />'
    },
    contract: {
      knownBackendLimitations: [
        'Email CRUD remains usable, but resend/verification actions call sendVerificationEmail, which aborts on the deployed user_secrets_del signature mismatch. (PLATFORM-GAPS GAP-9)'
      ]
    },
    relatedFlows: ['profile', 'email-verification']
  },
  {
    id: 'change-password',
    name: 'Change password',
    group: 'account-session',
    status: 'ga',
    summary: 'An authenticated, step-up-gated form to set a new password with an inline strength meter.',
    backend: {
      preset: 'auth:email',
      exposedOps: ['setPassword', 'checkPassword']
    },
    blocks: ['auth-change-password-form'],
    howto: {
      provision:
        '# setPassword / checkPassword ship with auth:email — no extra modules.\n' +
        'pgpm install',
      install: 'npx shadcn@latest add @constructive/auth-change-password-form',
      wire:
        "import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';\n\n" +
        '// The form runs a step-up re-verification, so a StepUpProvider must be an ancestor.\n' +
        '<StepUpProvider>{children}</StepUpProvider>',
      usage:
        "import { ChangePasswordForm } from '@/blocks/auth/change-password-form/change-password-form';\n\n" +
        '<ChangePasswordForm requireStepUp showPasswordStrength onSuccess={() => toast("Password updated")} />'
    },
    relatedFlows: ['password-reset', 'step-up', 'profile']
  },
  {
    id: 'sessions',
    name: 'Sessions',
    group: 'account-session',
    status: 'blocked',
    summary: "List the user's active sessions and revoke them individually or in bulk, gated behind step-up.",
    backend: {
      preset: 'auth:email',
      exposedOps: ['revokeSession', 'extendTokenExpires']
    },
    blocks: ['auth-account-sessions-list'],
    howto: {
      provision:
        '# sessions_module + revokeSession ship with auth:email — no extra modules.\n' +
        'pgpm install',
      install: 'npx shadcn@latest add @constructive/auth-account-sessions-list',
      wire:
        "import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';\n\n" +
        '// Single revoke is step-up tier=medium; revoke-all-others is tier=high.\n' +
        '<StepUpProvider>{children}</StepUpProvider>',
      usage:
        "import { AccountSessionsList } from '@/blocks/auth/account-sessions-list/account-sessions-list';\n\n" +
        '// The session list has no generated list hook — supply rows via the `sessions` prop.\n' +
        '<AccountSessionsList sessions={sessions} onRevokeSubmit={revokeSession} />'
    },
    contract: {
      constraints: [
        'Single revoke is step-up tier=medium; revoke-all-others is tier=high — both must complete a step-up before the mutation fires.',
        'No generated list hook for sessions — supply rows via the `sessions` prop; the block lists but does not fetch.'
      ],
      knownBackendLimitations: [
        'revokeSession is uncallable from the auth result: the id on a signUp/signIn result is a UUIDv5 identity/credential id, not the UUIDv7 sessions.id, and no field exposes the real session id — so revokeSession(authResult.id) returns SESSION_NOT_FOUND. Ship revoke-current-session as backend-pending; do NOT hand-craft a session id or fall back to SQL. (PLATFORM-GAPS GAP-2)'
      ]
    },
    relatedFlows: ['step-up', 'profile']
  },
  {
    id: 'api-keys',
    name: 'API keys',
    group: 'account-session',
    status: 'limited',
    summary: 'Create and revoke user-scoped API keys, with a one-time reveal modal and step-up on create.',
    backend: {
      preset: 'auth:email',
      exposedOps: ['createApiKey', 'revokeApiKey']
    },
    blocks: ['auth-account-api-keys-list', 'auth-api-key-create-dialog', 'auth-api-key-created-modal'],
    howto: {
      provision:
        '# API-key CRUD ships with auth:email (user_auth_module) — no extra modules.\n' +
        'pgpm install',
      install:
        'npx shadcn@latest add @constructive/auth-account-api-keys-list @constructive/auth-api-key-create-dialog @constructive/auth-api-key-created-modal',
      wire:
        "import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';\n\n" +
        '// Create is gated behind a high-severity step-up; mount the provider once.\n' +
        '// The deployed create_api_key proc accepts ONLY:\n' +
        "//   accessLevel ∈ { 'read_only', 'full_access' }   mfaLevel ∈ { 'none', 'verified' }\n" +
        '// Any other value (read/write/admin, required) -> INVALID_ACCESS_LEVEL at runtime.\n' +
        '// createApiKey also enforces STEP_UP_REQUIRED server-side: a verifyPassword on the\n' +
        '// SAME session must precede the create. The dialog runs that step-up first; if you\n' +
        '// call createApiKey directly, complete step-up (verifyPassword) before the mutation.\n' +
        '<StepUpProvider>{children}</StepUpProvider>',
      usage:
        "import { AccountApiKeysList } from '@/blocks/auth/account-api-keys-list/account-api-keys-list';\n\n" +
        '// No generated list hook for user_api_keys — supply rows via the `keys` prop.\n' +
        "// Valid create inputs: accessLevel 'read_only' | 'full_access'; mfaLevel 'none' | 'verified'.\n" +
        '<AccountApiKeysList keys={keys} onKeyCreated={refetch} onKeyRevoked={refetch} />'
    },
    contract: {
      constraints: [
        "createApiKey accessLevel accepts ONLY { 'read_only', 'full_access' } — any other value (read/write/admin, required) fails with INVALID_ACCESS_LEVEL at runtime; the auth-api-key-create-dialog block ships an accessLevelOptions list (read/write/admin) that does NOT match the deployed proc, so constrain the UI to the two valid values.",
        'createApiKey enforces STEP_UP_REQUIRED server-side: a verifyPassword on the SAME session must precede the create (defense-in-depth beyond the client gate). The dialog runs that step-up first; a direct createApiKey call must complete step-up before the mutation.'
      ],
      knownBackendLimitations: [
        'revokeApiKey returns true and writes an audit-log entry but never sets revoked_at — the key keeps working. Treat its true as a no-op, not proof of revocation; do not surface "revoked" as terminal state. (PLATFORM-GAPS GAP-3)'
      ]
    },
    relatedFlows: ['step-up', 'profile']
  },
  {
    id: 'account-deletion',
    name: 'Account deletion',
    group: 'account-session',
    status: 'blocked',
    summary: 'A danger-zone card that emails a deletion confirmation, plus the page that completes the deletion from the link.',
    backend: {
      preset: 'auth:email',
      exposedOps: ['sendAccountDeletionEmail', 'confirmDeleteAccount']
    },
    blocks: ['auth-account-danger-card', 'auth-account-deletion-confirm-page'],
    howto: {
      provision:
        '# delete_account flow ships with auth:email (user_auth_module) — no extra modules.\n' +
        'pgpm install',
      install:
        'npx shadcn@latest add @constructive/auth-account-danger-card @constructive/auth-account-deletion-confirm-page',
      wire:
        "import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';\n\n" +
        '// The danger card gates the deletion email behind a high-tier step-up.\n' +
        '<StepUpProvider>{children}</StepUpProvider>',
      usage:
        "import { AccountDeletionConfirmPage } from '@/blocks/auth/account-deletion-confirm-page/account-deletion-confirm-page';\n\n" +
        '// app/auth/delete-account/page.tsx — reads ?token= and ?user_id= from the link.\n' +
        '<AccountDeletionConfirmPage token={token} userId={userId} redirectTo="/auth/sign-in" />'
    },
    contract: {
      knownBackendLimitations: [
        'sendAccountDeletionEmail returns success but does not enqueue or deliver a deletion message, so the confirmation page is unreachable through the normal flow. (PLATFORM-GAPS GAP-10)'
      ]
    },
    relatedFlows: ['step-up', 'profile']
  },
  {
    id: 'step-up',
    name: 'Step-up verification',
    group: 'account-session',
    status: 'ga',
    summary: 'Re-verify identity (password or TOTP) before a sensitive action, as a dialog or an imperative hook.',
    backend: {
      preset: 'auth:email',
      exposedOps: ['requireStepUp', 'verifyPassword', 'verifyTotp']
    },
    blocks: ['auth-step-up-dialog', 'use-step-up'],
    howto: {
      provision:
        '# requireStepUp / verifyPassword ship with auth:email — no extra modules.\n' +
        'pgpm install',
      install: 'npx shadcn@latest add @constructive/auth-step-up-dialog @constructive/use-step-up',
      wire:
        "import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';\n\n" +
        '// Mount the provider once near the app root; consumers call useStepUp() below it.\n' +
        '// Step-up resolves a verifyPassword/verifyTotp on the CURRENT session — server-side\n' +
        '// gated ops (e.g. createApiKey enforces STEP_UP_REQUIRED) must be preceded by it.\n' +
        '<StepUpProvider>{children}</StepUpProvider>',
      usage:
        "import { useStepUp, StepUpError } from '@/blocks/auth/use-step-up/use-step-up';\n\n" +
        'async function onDangerousAction() {\n' +
        '  const stepUp = useStepUp();\n' +
        '  try {\n' +
        "    await stepUp({ tier: 'high' });\n" +
        '    await deleteAccount();\n' +
        '  } catch (err) {\n' +
        "    if (err instanceof StepUpError && err.reason === 'cancelled') return;\n" +
        '    throw err;\n' +
        '  }\n' +
        '}'
    },
    relatedFlows: ['change-password', 'sessions', 'api-keys', 'account-deletion']
  },
  {
    id: 'connected-accounts',
    name: 'Connected accounts',
    group: 'account-session',
    status: 'ga',
    summary: 'List linked OAuth providers and disconnect them (step-up gated); offer connect links for the rest.',
    backend: {
      preset: 'auth:sso',
      exposedOps: ['disconnectAccount']
    },
    blocks: ['auth-account-connected-accounts'],
    howto: {
      provision:
        '# disconnectAccount + connected_accounts_module ship with auth:sso (see Backend below).\n' +
        'pgpm install',
      install: 'npx shadcn@latest add @constructive/auth-account-connected-accounts',
      wire:
        "import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';\n\n" +
        '// Disconnect is gated behind a step-up (tier: medium).\n' +
        '<StepUpProvider>{children}</StepUpProvider>',
      usage:
        "import { AccountConnectedAccounts } from '@/blocks/auth/account-connected-accounts/account-connected-accounts';\n\n" +
        '// Connection types are not yet public — pass connectedAccounts + providers as props.\n' +
        '<AccountConnectedAccounts connectedAccounts={linked} providers={configured} oauthRedirectBase="/auth/oauth" />'
    },
    relatedFlows: ['social-oauth', 'step-up']
  },

  // ---------------------------------------------------------------- authorization
  {
    id: 'organization',
    name: 'Organizations',
    group: 'authorization',
    status: 'blocked',
    summary: 'Create and configure organizations — first-class User records (type=2) in the unified user model.',
    backend: {
      preset: 'b2b',
      exposedOps: ['createUser', 'updateUser', 'currentUser']
    },
    blocks: ['org-create-card', 'org-settings-form'],
    howto: {
      provision:
        '# Orgs require the full B2B stack (org-scoped memberships/permissions/invites/hierarchy).\n' +
        '# There is no preset smaller than b2b for org flows — see Backend below.\n' +
        'pgpm install',
      install: 'npx shadcn@latest add @constructive/org-create-card @constructive/org-settings-form',
      wire:
        "import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';\n\n" +
        '// org-settings-form gates danger-zone deletion behind a step-up.\n' +
        '<StepUpProvider>{children}</StepUpProvider>',
      usage:
        "import { OrgCreateCard } from '@/blocks/org/create-card/create-card';\n\n" +
        '// Creates a users row with type=2 (an organization).\n' +
        '<OrgCreateCard onSuccess={(org) => router.push(`/orgs/${org.id}`)} />'
    },
    contract: {
      knownBackendLimitations: [
        'Authenticated createUser(type=2) is RLS-denied, so a user cannot mint the first non-personal organization through org-create-card. (PLATFORM-GAPS GAP-6)'
      ]
    },
    relatedFlows: ['org-members', 'org-roles', 'org-invites', 'app-memberships']
  },
  {
    id: 'org-members',
    name: 'Org members',
    group: 'authorization',
    status: 'limited',
    summary: "List an organization's members with inline role changes and step-up-gated removal.",
    backend: {
      preset: 'b2b',
      exposedOps: ['orgMemberships', 'updateOrgMembership', 'deleteOrgMembership']
    },
    blocks: ['org-members-list'],
    howto: {
      provision:
        '# Org membership CRUD requires the b2b org-scoped memberships module — see Backend below.\n' +
        'pgpm install',
      install: 'npx shadcn@latest add @constructive/org-members-list',
      wire:
        "import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';\n\n" +
        '// Sensitive member actions require a step-up before the mutation fires.\n' +
        '<StepUpProvider>{children}</StepUpProvider>',
      usage:
        "import { MembersList } from '@/blocks/org/members-list/members-list';\n\n" +
        '// GA path is updateOrgMembership (role change) + deleteOrgMembership (remove).\n' +
        '// removeOrgMember / transferOrgOwnership are NOT deployed in the provisioned admin\n' +
        '// schema yet — pending seams; do not call them.\n' +
        '<MembersList orgId={orgId} />'
    },
    contract: {
      knownBackendLimitations: [
        'Member listing and direct membership CRUD require an existing organization; self-service organization creation is RLS-denied, and transferOrgOwnership remains undeployed. (PLATFORM-GAPS GAP-5, GAP-6)'
      ]
    },
    relatedFlows: ['organization', 'org-roles', 'org-invites']
  },
  {
    id: 'org-roles',
    name: 'Org roles',
    group: 'authorization',
    status: 'limited',
    summary: 'Create, edit, and delete named org role profiles that bundle the org-scoped permission set.',
    backend: {
      preset: 'b2b',
      exposedOps: ['createOrgProfile', 'updateOrgProfile', 'deleteOrgProfile']
    },
    blocks: ['org-create-card', 'org-roles-editor'],
    howto: {
      provision:
        '# Org role profiles require the b2b org-scoped profiles module — see Backend below.\n' +
        'pgpm install',
      install: 'npx shadcn@latest add @constructive/org-create-card @constructive/org-roles-editor',
      wire: '// Both blocks bind to the generated admin SDK hooks — only BlocksRuntime is required.',
      usage:
        "import { OrgCreateCard } from '@/blocks/org/create-card/create-card';\n" +
        "import { OrgRolesEditor } from '@/blocks/org/roles-editor/roles-editor';\n\n" +
        '// OrgRolesEditor needs an orgId (a User row with type=2). Create the org first with\n' +
        '// org-create-card, then pass its id to the editor.\n' +
        '<OrgCreateCard onSuccess={(org) => setOrgId(org.id)} />\n' +
        '{orgId && <OrgRolesEditor orgId={orgId} />}'
    },
    contract: {
      knownBackendLimitations: [
        'Role editing requires an existing organization; org-create-card cannot currently create one for a normal authenticated user because createUser(type=2) is RLS-denied. (PLATFORM-GAPS GAP-6)'
      ]
    },
    relatedFlows: ['organization', 'org-members']
  },
  {
    id: 'org-invites',
    name: 'Org invites',
    group: 'authorization',
    status: 'ga',
    summary: 'Invite members to an org by email and let invitees accept app- or org-level invitations from a token link.',
    backend: {
      preset: 'b2b',
      exposedOps: ['createOrgInvite', 'orgInvites', 'submitOrgInviteCode', 'submitAppInviteCode']
    },
    blocks: ['org-invite-dialog', 'auth-invitation-acceptance-card', 'auth-invitation-acceptance-page'],
    howto: {
      provision:
        '# Invite flows require the b2b invites modules (app + org scope) — see Backend below.\n' +
        'pgpm install',
      install:
        'npx shadcn@latest add @constructive/org-invite-dialog @constructive/auth-invitation-acceptance-card @constructive/auth-invitation-acceptance-page',
      wire:
        "import { OrgInviteDialog } from '@/blocks/org/invite-dialog/invite-dialog';\n\n" +
        '// resendOrgInvite is pending — the dialog resends by cancel + re-create.\n' +
        '<OrgInviteDialog orgId={orgId} open={open} onOpenChange={setOpen} />',
      usage:
        "import InvitationAcceptancePage from '@/blocks/auth/invitation-acceptance-page/invitation-acceptance-page';\n\n" +
        '// app/invite/page.tsx — reads ?token= and ?kind= from the URL.\n' +
        'export default function Page() {\n' +
        '  return <InvitationAcceptancePage />;\n' +
        '}'
    },
    relatedFlows: ['organization', 'org-members', 'app-memberships']
  },
  {
    id: 'app-memberships',
    name: 'App memberships',
    group: 'authorization',
    status: 'ga',
    summary: "Admin-manage an org's app-level memberships: approve, revoke (step-up gated), and update profiles.",
    backend: {
      preset: 'b2b',
      exposedOps: ['updateAppMembership', 'deleteAppMembership', 'appMemberships']
    },
    blocks: ['org-app-memberships'],
    howto: {
      provision:
        '# App membership management requires the b2b app-scoped memberships module — see Backend below.\n' +
        'pgpm install',
      install: 'npx shadcn@latest add @constructive/org-app-memberships',
      wire:
        "import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';\n\n" +
        '// Revoke is gated behind a confirmation dialog + step-up (tier: medium).\n' +
        '<StepUpProvider>{children}</StepUpProvider>',
      usage:
        "import { OrgAppMemberships } from '@/blocks/org/app-memberships/app-memberships';\n\n" +
        '<OrgAppMemberships orgId={orgId} />'
    },
    relatedFlows: ['organization', 'org-invites', 'org-members']
  }
];

export default FLOWS;
