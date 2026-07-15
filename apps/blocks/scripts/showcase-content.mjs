// showcase-content — the prose for each showcased block's reference page.
//
// generate-manifest.mjs (plain node, can't import the TS showcase-data) reads
// this to build each showcased block's DocPageData in src/lib/docs/registry-data.ts.
// Props / messages / requires are NOT here — the generated page REFERENCES the
// typed SHOWCASE map (src/components/docs/showcase-data.ts) by the same slug used
// here, so those tables stay in lockstep with block source.
//
// Inline code in `intro` uses escaped backticks so it renders as <code> in MDX.
// Docs harness only — never imported by block source.

/** @typedef {{ title: string; description: string; intro: string; previewNote: string; usage: string }} ShowcaseContent */

/** @type {Record<string, ShowcaseContent>} */
export const CONTENT = {
  chat: {
    title: 'Chat widget',
    description: 'AI chat with page context, streaming messages, tool approval, and configurable providers.',
    intro: 'A floating or embedded AI SDK chat surface with server route handlers and optional page-context scraping.',
    previewNote: 'The preview is fully local; sending is intentionally disabled until a host configures the API route.',
    usage: `import { ChatProvider, ChatWidget } from '@/components/chat';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider config={{ api: '/api/chat', scrape: true }}>
      {children}
      <ChatWidget />
    </ChatProvider>
  );
}`,
  },
  'schema-builder': {
    title: 'Schema builder',
    description: 'A framework-agnostic PostgreSQL schema editor backed by typed host adapter ports.',
    intro: 'The complete Structure, Relationships, Indexes, and Policies workspace from @constructive-io/schema-builder.',
    previewNote: 'The documentation preview uses an in-memory adapter and makes no GraphQL requests.',
    usage: `import { SchemaBuilder } from '@constructive-io/schema-builder';
import '@constructive-io/schema-builder/styles.css';

<SchemaBuilder
  adapter={schemaBuilderAdapter}
  scope={{ orgId, databaseId, userId }}
  colorMode={resolvedColorMode}
  preferences={preferences}
  onPreferencesChange={setPreferences}
  activeTab={activeTab}
  onActiveTabChange={setActiveTab}
/>`,
  },
  'auth-sign-in-card': {
    title: 'Sign-in card',
    description: 'Email + password sign-in, bound to your generated auth SDK.',
    intro:
      'Email + password sign-in bound to the generated \`useSignInMutation\` hook.',
    previewNote:
      'Submit any values and toggle the outcome.',
    usage: `import { SignInCard } from '@/blocks/auth/sign-in-card/sign-in-card';

export function SignInPage() {
  const router = useRouter();
  return (
    <SignInCard
      showRememberMe
      forgotPasswordHref="/auth/forgot-password"
      signUpHref="/auth/sign-up"
      onSuccess={(result) => {
        if (result?.mfaRequired) return startMfa(result);
        router.push('/');
      }}
    />
  );
}`,
  },

  'auth-sign-up-card': {
    title: 'Sign-up card',
    description: 'Account registration with an inline password-strength meter, bound to your auth SDK.',
    intro:
      'Account registration bound to the generated \`useSignUpMutation\` hook.',
    previewNote:
      'Type a password to see the strength meter; toggle the outcome.',
    usage: `import { SignUpCard } from '@/blocks/auth/sign-up-card/sign-up-card';

<SignUpCard
  signInHref="/auth/sign-in"
  onSuccess={(result) => router.push('/welcome')}
/>`,
  },

  'auth-forgot-password-card': {
    title: 'Forgot-password card',
    description: 'Request a password-reset link, bound to your auth SDK.',
    intro:
      'Requests a link via the generated \`useForgotPasswordMutation\` hook, then shows a neutral confirmation panel.',
    previewNote:
      'Submit an email to reach the confirmation; toggle the outcome.',
    usage: `import { ForgotPasswordCard } from '@/blocks/auth/forgot-password-card/forgot-password-card';

<ForgotPasswordCard signInHref="/auth/sign-in" />`,
  },

  'auth-reset-password-card': {
    title: 'Reset-password card',
    description: 'Set a new password from an emailed reset token.',
    intro:
      'Sets a new password via the generated \`useResetPasswordMutation\` hook.',
    previewNote:
      'The preview seeds demo token and role; toggle the outcome.',
    usage: `import { ResetPasswordCard } from '@/blocks/auth/reset-password-card/reset-password-card';

// Reads ?role_id= and ?token= from the URL by default; props win when provided.
<ResetPasswordCard signInPath="/auth/sign-in" />`,
  },

  'auth-sign-out-button': {
    title: 'Sign-out button',
    description: 'One-call sign-out that clears the query cache.',
    intro:
      'A button bound to the generated \`useSignOutMutation\` hook.',
    previewNote:
      'Click to run sign-out; toggle the outcome for the error path.',
    usage: `import { SignOutButton } from '@/blocks/auth/sign-out-button/sign-out-button';

<SignOutButton variant="outline" onSuccess={() => router.push('/auth/sign-in')}>
  Sign out
</SignOutButton>`,
  },

  'auth-step-up-dialog': {
    title: 'Step-up dialog',
    description: 'Re-verify identity with a password or TOTP before a sensitive action.',
    intro:
      'A controlled dialog that re-authenticates the current user and returns the result via \`onVerify\`.',
    previewNote:
      'Open and verify; switch password/TOTP variant, toggle the outcome.',
    usage: `import { useState } from 'react';
import { StepUpDialog } from '@/blocks/auth/step-up-dialog/step-up-dialog';

function DangerZone() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Delete account</Button>
      <StepUpDialog
        open={open}
        type="password"
        onVerify={(result) => {
          setOpen(false);
          if (result.ok) deleteAccount();
        }}
      />
    </>
  );
}`,
  },

  'use-step-up': {
    title: 'useStepUp',
    description: 'Trigger step-up verification imperatively from anywhere.',
    intro:
      'A hook + provider pair wrapping \`step-up-dialog\` as a promise: \`await stepUp()\` resolves on verify, rejects with \`StepUpError\`.',
    previewNote:
      'Trigger step-up; the resolve and reject are logged below.',
    usage: `import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';
import { useStepUp, StepUpError } from '@/blocks/auth/use-step-up/use-step-up';

// 1. Mount the provider once near your app root:
<StepUpProvider>{children}</StepUpProvider>

// 2. Trigger it imperatively anywhere below:
function DeleteButton() {
  const stepUp = useStepUp();
  async function onClick() {
    try {
      await stepUp({ tier: 'high' });
      await deleteAccount();
    } catch (err) {
      if (err instanceof StepUpError && err.reason === 'cancelled') return;
      throw err;
    }
  }
  return <Button onClick={onClick}>Delete account</Button>;
}`,
  },

  'auth-account-emails-list': {
    title: 'Account emails list',
    description: "Manage a user's email addresses — add, verify, set primary, remove.",
    intro:
      "Lists the signed-in user's emails from the generated emails query and wires the management mutations.",
    previewNote:
      'Open the add or remove dialog; the mock list does not re-fetch.',
    usage: `import { AccountEmailsList } from '@/blocks/auth/account-emails-list/account-emails-list';

<AccountEmailsList maxEmails={10} />`,
  },

  'user-avatar': {
    title: 'User avatar',
    description: 'Profile image with an initials fallback; round for people, square for orgs.',
    intro:
      "A presentational avatar that renders the subject's profile picture, falling back to initials.",
    previewNote:
      'Initials show with no picture — circle for people, square for orgs.',
    usage: `import { UserAvatar } from '@/blocks/user/user-avatar/user-avatar';

<UserAvatar
  user={{ id, type: 'person', displayName: 'Ada Lovelace', username: 'ada', profilePicture: null }}
  size="md"
/>`,
  },
  'auth-sign-in-page': {
    title: "Sign-in page",
    description: "Full-viewport sign-in layout that wraps the sign-in card and handles post-auth routing.",
    intro: "Composes `SignInCard` and routes the result to `DEFAULT_REDIRECT`, `MFA_PATH`, or a guarded `?redirect=`.",
    previewNote: "Submit any values to see the invalid-credentials error (mock returns empty).",
    usage: "import SignInPage from '@/blocks/auth/sign-in-page/sign-in-page';\n\n// Install as your app's /auth/sign-in route:\nexport default function Page() {\n  return <SignInPage />;\n}\n\n// The installed file exposes editable constants:\n// const DEFAULT_REDIRECT    = '/dashboard';\n// const MFA_PATH            = '/auth/mfa/totp';\n// const SIGN_UP_PATH        = '/auth/sign-up';\n// const FORGOT_PASSWORD_PATH = '/auth/forgot-password';\n// const BRAND_LOGO_SRC      = ''; // optional logo URL",
  },
  'auth-sign-up-page': {
    title: "Sign-up page",
    description: "A centered full-page registration layout that composes SignUpCard with post-registration redirect logic. Reads `?redirect=` from search params and routes the user after a successful sign-up, sending unverified users to the email verification page.",
    intro: "Thin page-glue: a centered `<main>` that wires `SignUpCard` to your router's post-registration navigation.",
    previewNote: "Preview renders `SignUpCard` directly; the page needs Next router APIs.",
    usage: "Drop `SignUpPage` into your Next.js App Router at `app/(auth)/sign-up/page.tsx`. Edit the `DEFAULT_REDIRECT`, `VERIFY_EMAIL_PATH`, and `SIGN_IN_PATH` constants at the top of the file to match your route structure.",
  },
  'auth-forgot-password-page': {
    title: "Forgot-password page",
    description: "Centered page layout that wraps the forgot-password card and pre-fills the email from the URL.",
    intro: "Page-glue that mounts `ForgotPasswordCard` and forwards `?email=` from the URL as the card's `defaultEmail`.",
    previewNote: "Submit any email to reach the confirmation; toggle the outcome.",
    usage: "import ForgotPasswordPage from '@/blocks/auth/forgot-password-page/forgot-password-page';\n\n// Mount as a Next.js App Router page (e.g. app/auth/forgot-password/page.tsx):\nexport default function Page() {\n  return <ForgotPasswordPage />;\n}\n\n// The page reads ?email= automatically; to link from sign-in:\n// router.push(`/auth/forgot-password?email=${encodeURIComponent(email)}`);",
  },
  'auth-reset-password-page': {
    title: "Reset-password page",
    description: "A Next.js 15 page-level wrapper that reads `?token=` and `?role_id=` from the URL via `useSearchParams`, then composes `ResetPasswordCard` inside a `Suspense` boundary inside a full-viewport centred layout. On success it calls `router.push()` to redirect to the sign-in page. Drop the file at `app/auth/reset-password/page.tsx`.",
    intro: "A thin page wrapper around `auth-reset-password-card`: it owns routing while the card owns the form.",
    previewNote: "Preview renders `ResetPasswordCard` directly; the page has no `onSubmit`.",
    usage: "Drop `reset-password-page.tsx` at `app/auth/reset-password/page.tsx`. Configure `SIGN_IN_PATH` and `FORGOT_PASSWORD_PATH` at the top of the file to match your routing convention. Ensure `auth-reset-password-card` is also installed.",
  },
  'auth-verify-email-page': {
    title: "Verify email page",
    description: "One-time email verification page that reads the link token from the URL and transitions through loading, success, expired, and invalid states.",
    intro: "Reads `?email_id=` and `?token=` on mount, calls `useVerifyEmailMutation`, then resolves into terminal states.",
    previewNote: "Toggle State across success, expired, invalid, missing, and loading.",
    usage: "import { VerifyEmailPage } from '@/blocks/auth/verify-email-page/verify-email-page';\n\n// Place in app/auth/verify-email/page.tsx\nexport default function VerifyEmailRoute() {\n  const searchParams = useSearchParams();\n  const email = searchParams.get('email') ?? undefined;\n  return (\n    <main className=\"flex min-h-screen items-center justify-center px-4\">\n      <VerifyEmailPage\n        email={email}\n        signInHref=\"/auth/sign-in\"\n        dashboardHref=\"/dashboard\"\n        onSuccess={() => console.log('verified')}\n      />\n    </main>\n  );\n}",
  },
  'auth-verify-email-banner': {
    title: "Verify email banner",
    description: "Dismissible banner prompting users to verify their primary email address.",
    intro: "A banner for users with an unverified email; its Resend button calls `useSendVerificationEmailMutation`.",
    previewNote: "Click Resend and toggle the outcome; Dismiss then Restore to replay.",
    usage: "import { VerifyEmailBanner } from '@/blocks/auth/verify-email-banner/verify-email-banner';\n\nexport function AppHeader({ user }: { user: CurrentUser }) {\n  const [dismissed, setDismissed] = useState(false);\n  if (user.isVerified || dismissed) return null;\n  return (\n    <VerifyEmailBanner\n      email={user.primaryEmail}\n      onDismiss={() => setDismissed(true)}\n      onSuccess={(email) =>\n        toast.success(`Verification email sent to ${email}`)\n      }\n    />\n  );\n}",
  },
  'auth-cross-origin-link': {
    title: "Cross-origin link",
    description: "One-click cross-origin authentication: generates a short-lived token and redirects the user to another origin.",
    intro: "A button that calls `useRequestCrossOriginTokenMutation` for a one-time token, then redirects with it.",
    previewNote: "Click to run the exchange; toggle the outcome for the error path.",
    usage: "import { CrossOriginLink } from '@/blocks/auth/cross-origin-link/cross-origin-link';\n\n// Mount inside the same form that collected email/password:\n<CrossOriginLink\n  email={email}\n  password={password}\n  destinationOrigin=\"https://app.example.com\"\n  destinationPath=\"/auth/cross-origin\"\n  rememberMe={rememberMe}\n  onSuccess={(_token, url) => console.log('Redirecting to', url)}\n>\n  Continue to app\n</CrossOriginLink>",
  },
  'auth-social-buttons': {
    title: "Social buttons",
    description: "A row of OAuth provider sign-in / sign-up buttons. Renders a configurable list of social-login buttons with built-in icons for Google, GitHub, Apple, Facebook, Microsoft, LinkedIn, and Slack. Supports stacked, grid, and icon-only layouts, a sign-in / sign-up mode toggle, and an optional or-divider above the buttons.",
    intro: "`AuthSocialButtons` takes a static `providers` array, or loads enabled providers from the host's API.",
    previewNote: "Preview uses a static provider list; clicks cancel navigation.",
    usage: "<AuthSocialButtons\n  providers={['google', 'github', 'microsoft', 'apple']}\n  mode=\"sign-in\"\n  layout=\"stacked\"\n  showDivider\n  onProviderClick={() => false}\n/>",
  },
  'auth-social-providers-grid': {
    title: "Social providers grid",
    description: "Renders the configured OAuth providers as sign-in/sign-up buttons — stacked, grid, or icon-only. Wraps `auth-social-buttons` with a mode-aware divider and a \"Last used\" badge on the provider the user previously authenticated with (stored in `localStorage`).",
    intro: "Renders every configured OAuth provider and badges the one the user last signed in with.",
    previewNote: "Toggle Mode and Layout to compare labels and layouts.",
    usage: "import { AuthSocialProvidersGrid } from '@/blocks/auth/social-providers-grid/social-providers-grid';\n\nexport default function SignInPage() {\n  return (\n    <div className=\"max-w-sm mx-auto space-y-6\">\n      {/* … email/password fields … */}\n      <AuthSocialProvidersGrid\n        mode=\"sign-in\"\n        layout=\"stacked\"\n        returnTo=\"/dashboard\"\n        onProviderClick={(provider, url) => {\n          analytics.track('oauth_click', { provider: provider.slug });\n        }}\n      />\n    </div>\n  );\n}",
  },
  'auth-invitation-acceptance-card': {
    title: "Invitation acceptance card",
    description: "Accept or decline an app or org invitation via a token URL.",
    intro: "Accepts or declines an app or org invite via `useSubmitAppInviteCodeMutation`/`useSubmitOrgInviteCodeMutation`.",
    previewNote: "Toggle Kind for app vs org; toggle Outcome to drive accept or error.",
    usage: "import { InvitationAcceptanceCard } from '@/blocks/auth/invitation-acceptance-card/invitation-acceptance-card';\n\nexport function InvitePage() {\n  const router = useRouter();\n  const token = useSearchParams().get('token') ?? '';\n  return (\n    <InvitationAcceptanceCard\n      token={token}\n      kind=\"org\"\n      onSuccess={(result) => router.push(`/orgs/${result.org?.id}`)}\n      onDecline={() => router.push('/')}\n    />\n  );\n}",
  },
  'auth-invitation-acceptance-page': {
    title: "Invitation acceptance page",
    description: "Token-gated invite-claim page. Reads ?token= and ?kind= from the URL, gates on the current user via useCurrentUserQuery, and composes InvitationAcceptanceCard in a centered full-viewport layout.",
    intro: "Page wrapper for the invitation card: auth-gates the viewer, parses the token, routes accept or decline.",
    previewNote: "Toggle Kind to swap app- and org-invite cards.",
    usage: "import InvitationAcceptancePage from '@/blocks/auth/invitation-acceptance-page/invitation-acceptance-page';\n\n// In app/invite/page.tsx:\nexport default function Page() {\n  return (\n    <Suspense>\n      <InvitationAcceptancePage />\n    </Suspense>\n  );\n}",
  },
  'auth-account-deletion-confirm-page': {
    title: "Account deletion confirm page",
    description: "Full-page confirmation handler for the account-deletion email link. Calls the deletion mutation once on mount and renders three distinct outcome states: a spinner while processing, a success card with auto-redirect, and error cards for expired or invalid tokens.",
    intro: "Confirms the emailed deletion link via `confirmDeleteAccount`, then resolves into a terminal state.",
    previewNote: "Toggle State to jump between the post-mount outcomes.",
    usage: "import { AccountDeletionConfirmPage } from '@/blocks/auth/account-deletion-confirm-page/account-deletion-confirm-page';\n\nexport default function DeleteAccountPage({ searchParams }) {\n  return (\n    <AccountDeletionConfirmPage\n      token={searchParams.token ?? ''}\n      userId={searchParams.user_id ?? ''}\n      redirectTo=\"/auth/sign-in\"\n      accountSettingsHref=\"/account/settings\"\n      onSuccess={({ userId }) => analytics.track('account_deleted', { userId })}\n    />\n  );\n}",
  },
  'auth-magic-link-sent-page': {
    title: "Magic-link sent page",
    description: "Confirmation page shown after a magic-link request, with a resend CTA and 60-second cooldown.",
    intro: "Reads the sent-to email from `?email=` and offers a resend CTA once the cooldown elapses.",
    previewNote: "Toggle Outcome to drive the resend success or a rate-limited error.",
    usage: "import MagicLinkSentPage from '@/blocks/auth/magic-link-sent-page/magic-link-sent-page';\n\n// Place on /auth/magic-link-sent (or any route after the request form)\nexport default function Page() {\n  const router = useRouter();\n  return (\n    <MagicLinkSentPage\n      onSubmit={async ({ email }) => {\n        await requestMagicLink({ email });\n        return null;\n      }}\n      onSuccess={() => router.push('/auth/magic-link-sent')}\n    />\n  );\n}",
  },
  'auth-magic-link-callback-page': {
    title: "Magic-link callback page",
    description: "Handles the /auth/magic-link?token=... URL users land on from their email. Verifies the token via onSubmit and transitions through: loading → success (redirect) | expired | invalid | missing-token.",
    intro: "Verifies the `?token=` from a magic-link email on mount, then redirects or surfaces a failure.",
    previewNote: "The demo pre-injects `?token=` so it resolves in place.",
    usage: "import MagicLinkCallbackPage from '@/blocks/auth/magic-link-callback-page/magic-link-callback-page';\n\n<Suspense>\n  <MagicLinkCallbackPage\n    onSubmit={async ({ token, credentialKind }) => {\n      // returns MagicLinkSignInResult | null\n      return null;\n    }}\n  />\n</Suspense>",
  },
  'auth-account-profile-card': {
    title: "Account profile card",
    description: "Lets the signed-in user update their display name and profile picture. Handles person and organization user types, optimistic avatar previews, and a presigned-URL upload contract.",
    intro: "Edits display name and avatar, falling back to `useCurrentUserQuery` when no `user` prop is passed.",
    previewNote: "Toggle Outcome to see the save succeed or throw.",
    usage: "import { AccountProfileCard } from '@/blocks/auth/account-profile-card/account-profile-card';\n\nfunction ProfileSettings() {\n  return (\n    <AccountProfileCard\n      user={{ id: currentUser.id, type: 'person', displayName: currentUser.displayName, profilePicture: null }}\n      onSubmit={async (input) => {\n        const result = await myApi.updateUser(input);\n        return result;\n      }}\n      onSuccess={(result) => toast.success('Profile updated!')}\n      onMessage={({ kind, key }) => console.log(kind, key)}\n    />\n  );\n}",
  },
  'auth-account-security-card': {
    title: "Account security card",
    description: "At-a-glance security posture summary showing password status, two-factor authentication status, and registered passkey count. Display-only — all actions are delegated via callbacks so the host decides how to navigate to the relevant management flows.",
    intro: "Reads the passkey count from `useWebauthnCredentialsQuery` and shows it beside password and 2FA status.",
    previewNote: "Toggle Passkeys to vary the registered-passkey count.",
    usage: "import { AccountSecurityCard } from '@/blocks/auth/account-security-card/account-security-card';\n\nexport default function SecurityPage() {\n  const router = useRouter();\n  return (\n    <AccountSecurityCard\n      onChangePassword={() => router.push('/account/change-password')}\n      onManageMfa={() => router.push('/account/mfa')}\n      onManagePasskeys={() => router.push('/account/passkeys')}\n      onError={(err) => console.error(err)}\n    />\n  );\n}",
  },
  'auth-account-danger-card': {
    title: "Account danger card",
    description: "Danger zone card that initiates the account-deletion flow. The user clicks Delete account, confirms in a dialog, passes a step-up identity check (tier: high), and the block sends a deletion confirmation email. Success transitions the card to an inline 'Check your inbox' state.",
    intro: "After a step-up check it dispatches a deletion-confirmation email instead of deleting inline.",
    previewNote: "Click Delete account, clear step-up, toggle Outcome to error.",
    usage: "Wrap AccountDangerCard inside StepUpProvider (once per route/layout). Supply onSubmit to replace the real mutation in demos or tests. onDeletionEmailSent fires after success; onError and onMessage provide notification seams.",
  },
  'auth-account-sessions-list': {
    title: "Account sessions list",
    description: "Lists the signed-in user's active sessions (host-supplied via adapter seam) and provides per-session and bulk revoke actions, both gated behind step-up verification.",
    intro: "Lists active sessions with device and IP; revoke is bound to the generated `revokeSession` mutation.",
    previewNote: "Toggle Outcome to error, or Revoke to drop a session in success mode.",
    usage: "Mount with a host-supplied sessions array. Bind onRevokeSubmit to your revokeSession mutation. Use onSessionRevoked / onAllOtherSessionsRevoked to sync local state after success.",
  },
  'auth-account-api-keys-list': {
    title: "Account API keys list",
    description: "Displays the signed-in user's API keys and provides revoke and create actions. The key list is host-supplied via the `keys` prop; the `revokeApiKey` mutation is bound to the generated SDK.",
    intro: "Lists API keys with expiry status; Revoke is bound to the generated `revokeApiKey` mutation.",
    previewNote: "Toggle Outcome to error, then Revoke a key to see the error path.",
    usage: "import { AccountApiKeysList } from '@/blocks/auth/account-api-keys-list/account-api-keys-list';\n\nexport function ApiKeysPage({ keys, refetch }: { keys: ApiKeyRow[]; refetch: () => void }) {\n  return (\n    <AccountApiKeysList\n      keys={keys}\n      maxKeys={10}\n      onKeyRevoked={() => refetch()}\n      onKeyCreated={() => refetch()}\n      onMessage={(event) => toast(event.message ?? event.key)}\n    />\n  );\n}",
  },
  'auth-account-connected-accounts': {
    title: "Connected accounts",
    description: "Settings card listing linked OAuth providers with a disconnect action, gated behind step-up re-verification. Also renders Connect links for configured providers not yet linked.",
    intro: "Lists linked OAuth providers; Disconnect is gated by a medium-tier step-up dialog.",
    previewNote: "Toggle Outcome, then Disconnect and clear the step-up.",
    usage: "Pass connectedAccounts and providers as props (host-supplied from your own query). Supply oauthRedirectBase pointing to your OAuth initiation route. Override onSubmitDisconnect to replace the generated hook with your own logic.",
  },
  'auth-account-phones-list': {
    title: "Account phones list",
    description: "Multi-phone management card — add, verify with OTP, set primary, and delete phone numbers.",
    intro: "Lists the user's phone numbers from `usePhoneNumbersQuery`, with add, verify, and delete actions.",
    previewNote: "Try Add, verify, or delete; actions resolve offline.",
    usage: "Mount inside a host that has called `configure({ adapter })` from `@/generated/auth`. Pass `onSubmitAdd`, `onSubmitSendOtp`, `onSubmitVerifyOtp`, `onSubmitSetPrimary`, and `onSubmitDelete` overrides to wire the block to your backend.",
  },
  'auth-account-settings-page': {
    title: "Account settings page",
    description: "Tabbed convergence page composing all account-settings section cards into a single layout.",
    intro: "Tabs together every account card; calls `useCurrentUserQuery` once and deep-links via `?tab=`.",
    previewNote: "Toggle the API-keys tab, or click any tab to switch sections.",
    usage: "import AccountSettingsPage from '@/blocks/auth/account-settings-page/account-settings-page';\n\n// Place at app/account/page.tsx\nexport default function AccountPage() {\n  const router = useRouter();\n  return (\n    <AccountSettingsPage\n      allowApiKeys={featureFlags.apiKeys}\n      onChangePassword={() => router.push('/account/change-password')}\n      onManagePasskeys={() => router.push('/account/passkeys')}\n      onDeletionEmailSent={() => router.push('/auth/sign-in')}\n    />\n  );\n}",
  },
  'auth-change-password-form': {
    title: "Change-password form",
    description: "Inline form for authenticated users to update their password. Collects current password, new password, and confirmation; gates submission behind a step-up identity check (tier: medium) before calling the mutation.",
    intro: "Updates a password via `useSetPasswordMutation`, with inline confirm-match and a live strength meter.",
    previewNote: "Step-up is off here; toggle Outcome to error for the reject path.",
    usage: "import { ChangePasswordForm } from '@/blocks/auth/change-password-form/change-password-form';\n\n<ChangePasswordForm\n  requireStepUp\n  showPasswordStrength\n  onSubmit={async ({ currentPassword, newPassword }) => {\n    const ok = await myApi.changePassword({ currentPassword, newPassword });\n    return ok;\n  }}\n  onSuccess={() => toast('Password updated.')}\n  onMessage={({ kind, message }) => kind === 'error' && toast.error(message)}\n/>",
  },
  'auth-api-key-create-dialog': {
    title: "API-key create dialog",
    description: "Modal form for creating a new user-scoped API key with step-up verification.",
    intro: "Collects key name, scope, and expiry, then calls `useCreateApiKeyMutation` behind a high-tier step-up.",
    previewNote: "Click Create API key, then toggle Outcome for success or error.",
    usage: "import { ApiKeyCreateDialog } from '@/blocks/auth/api-key-create-dialog/api-key-create-dialog';\nimport { ApiKeyCreatedModal } from '@/blocks/auth/api-key-created-modal/api-key-created-modal';\n\nexport function ManageKeysPage() {\n  const [createOpen, setCreateOpen] = useState(false);\n  const [createdKey, setCreatedKey] = useState(null);\n  return (\n    <>\n      <Button onClick={() => setCreateOpen(true)}>Create API key</Button>\n      <ApiKeyCreateDialog\n        open={createOpen}\n        onOpenChange={setCreateOpen}\n        onSuccess={(result) => {\n          setCreateOpen(false);\n          setCreatedKey(result);\n        }}\n      />\n    </>\n  );\n}",
  },
  'auth-api-key-created-modal': {
    title: "API-key created modal",
    description: "A one-time display modal for a freshly-created raw API key. The raw key is unrecoverable after this view — the database stores only its SHA-256 hash. The modal enforces an explicit acknowledgement checkbox before allowing dismissal, and blocks Escape / overlay-click until the user confirms they have saved the key.",
    intro: "Reveals a freshly created API key once, unlocking Done only after the acknowledgement is checked.",
    previewNote: "Toggle Expiry, then tick the acknowledgement to enable Done.",
    usage: "import { ApiKeyCreatedModal } from '@/blocks/auth/api-key-created-modal/api-key-created-modal';\n\nfunction KeyCreationFlow() {\n  const [rawKey, setRawKey] = useState<string | null>(null);\n  const [keyName, setKeyName] = useState('');\n\n  return (\n    <ApiKeyCreatedModal\n      open={rawKey !== null}\n      onOpenChange={(open) => { if (!open) setRawKey(null); }}\n      apiKey={rawKey ?? ''}\n      keyName={keyName}\n      expiresAt=\"2026-12-31T23:59:59Z\"\n      onDismissed={() => setRawKey(null)}\n    />\n  );\n}",
  },
  'auth-passkey-management-list': {
    title: "Passkey management list",
    description: "Lists all passkeys (WebAuthn credentials) registered for the current user. Supports inline rename — no step-up required — and step-up-gated deletion. Each credential shows its type badge (Built-in vs Hardware key), transports, creation date, and last-used time.",
    intro: "Lists the user's WebAuthn passkeys; rename inline, or delete behind a high-tier step-up.",
    previewNote: "Toggle Outcome to error to fail a rename or delete.",
    usage: "import { PasskeyManagementList } from '@/blocks/auth/passkey-management-list/passkey-management-list';\n\n<PasskeyManagementList\n  onRename={async ({ credentialId, name }) => {\n    await myApi.renamePasskey(credentialId, name);\n  }}\n  onDelete={async ({ credentialId }) => {\n    await myApi.deletePasskey(credentialId);\n  }}\n  onSuccess={(event) => {\n    if (event.type === 'deleted') toast.success('Passkey removed.');\n    if (event.type === 'renamed') toast.success('Passkey renamed.');\n  }}\n/>",
  },
  'auth-passkey-enroll': {
    title: "Passkey enroll",
    description: "Registers a new WebAuthn credential (passkey) for the current authenticated user. Orchestrates the two-step begin/browser/finish ceremony via Express middleware, with an `onSubmit` override seam for host-controlled integration.",
    intro: "Registers a Touch ID, Face ID, or hardware-key passkey through the WebAuthn ceremony.",
    previewNote: "Toggle Outcome for the enrolled path or an error banner.",
    usage: "import { PasskeyEnroll } from '@/blocks/auth/passkey-enroll/passkey-enroll';\n\n<PasskeyEnroll\n  userId={session.userId}\n  enabled={featureFlags.allowWebAuthnSignUp}\n  onSubmit={async ({ credentialName, userId }) => {\n    const result = await myPasskeyCeremony({ credentialName, userId });\n    return { credentialId: result.id, credentialName };\n  }}\n  onSuccess={(result) => toast.success(`Passkey \"${result.credentialName}\" added`)}\n  onMessage={(event) => analytics.track(event.key)}\n/>",
  },
  'auth-passkey-sign-in': {
    title: "Passkey sign-in",
    description: "A WebAuthn assertion button that drives the full begin/browser/finish passkey ceremony. Renders a full-width button or compact icon variant; returns null when the browser does not support WebAuthn.",
    intro: "A button that authenticates a user with a saved passkey via the WebAuthn assertion ceremony.",
    previewNote: "Toggle Outcome for success or error; Variant swaps button and icon.",
    usage: "import { PasskeySignIn } from '@/blocks/auth/passkey-sign-in/passkey-sign-in';\n\n<PasskeySignIn\n  onSubmit={async ({ userId }) => {\n    return await passkeySignInAdapter({ userId });\n  }}\n  onSuccess={(result) => {\n    router.push(result.redirectTo ?? '/dashboard');\n  }}\n  onMessage={(event) => toast[event.kind](event.message)}\n/>",
  },
  'auth-mfa-totp-enroll': {
    title: "MFA TOTP enroll",
    description: "Three-step TOTP enrollment flow: scan a QR code in an authenticator app, verify the first 6-digit code, then save generated backup codes.",
    intro: "A guided two-factor setup that walks the user from QR scan to saved backup codes.",
    previewNote: "Toggle Outcome for the error or success path; any 6-digit code passes.",
    usage: "import { MfaTotpEnroll } from '@/blocks/auth/mfa-totp-enroll/mfa-totp-enroll';\n\n<MfaTotpEnroll\n  onSubmit={async () => {\n    const res = await enableTotp();\n    return { qrUrl: res.qrUrl, manualKey: res.manualKey };\n  }}\n  onConfirm={async (code) => {\n    const ok = await confirmTotpSetup({ totpCode: code });\n    return ok;\n  }}\n  onGenerateCodes={async () => {\n    const { codes } = await generateBackupCodes();\n    return codes;\n  }}\n  onSuccess={({ backupCodes }) => console.log('enrolled', backupCodes)}\n/>",
  },
  'auth-mfa-totp-challenge': {
    title: "MFA TOTP challenge",
    description: "Presents a 6-digit TOTP code input when sign-in returns `mfa_required=true` with a non-null `mfa_challenge_token`. Handles trust-device opt-in, code validation, and error mapping.",
    intro: "The second sign-in step: a 6-digit TOTP input shown when `mfaRequired` is true.",
    previewNote: "Toggle Outcome to error for the INVALID_TOTP alert.",
    usage: "import { MfaTotpChallenge } from '@/blocks/auth/mfa-totp-challenge/mfa-totp-challenge';\n\n// After sign-in returns mfaRequired=true:\n<MfaTotpChallenge\n  challengeToken={signInResult.mfaChallengeToken}\n  onSubmit={async (vars) => completeMfaChallenge(vars)}\n  onSuccess={(result) => router.push('/dashboard')}\n  onError={({ code, message }) => toast.error(message)}\n  showTrustDevice\n/>",
  },
  'auth-mfa-totp-challenge-page': {
    title: "MFA TOTP challenge page",
    description: "Full-viewport Next.js page that handles the TOTP multi-factor authentication step. Reads `?token=` and `?redirect=` from the URL, validates both, and mounts the MfaTotpChallenge card. Routes to `redirectTo` on success and shows informative error cards for a missing or expired token.",
    intro: "Page-glue for `/auth/mfa/totp`: reads the `?token=` from sign-in and mounts the TOTP card.",
    previewNote: "Toggle State across ready, missing-token, and expired.",
    usage: "// app/auth/mfa/totp/page.tsx\nimport { Suspense } from 'react';\nimport MfaTotpChallengePage from '@/blocks/auth/mfa-totp-challenge-page/mfa-totp-challenge-page';\n\nexport default function Page() {\n  return (\n    <Suspense fallback={null}>\n      <MfaTotpChallengePage />\n    </Suspense>\n  );\n}",
  },
  'auth-mfa-totp-disable-confirm': {
    title: "MFA TOTP disable confirm",
    description: "Confirmation dialog for disabling TOTP two-factor authentication. Requires high-severity step-up verification before executing the disable mutation, and displays prominent security warnings about the implications of removing 2FA.",
    intro: "A confirm dialog that removes TOTP two-factor auth behind a high-tier step-up challenge.",
    previewNote: "Click Disable, clear the step-up, then toggle Outcome to error.",
    usage: "import { MfaTotpDisableConfirm } from '@/blocks/auth/mfa-totp-disable-confirm/mfa-totp-disable-confirm';\nimport { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';\n\nfunction AccountSecurity() {\n  const [open, setOpen] = useState(false);\n  return (\n    <StepUpProvider>\n      <Button variant=\"destructive\" onClick={() => setOpen(true)}>\n        Disable 2FA\n      </Button>\n      <MfaTotpDisableConfirm\n        open={open}\n        onOpenChange={setOpen}\n        onSubmit={async () => { await disableTotp.mutateAsync({}); }}\n        onSuccess={() => queryClient.invalidateQueries()}\n      />\n    </StepUpProvider>\n  );\n}",
  },
  'auth-mfa-backup-codes-display': {
    title: "MFA backup codes display",
    description: "Display-only card for one-time presentation of MFA backup codes. Renders a 2-column monospace grid with Copy all, Download as .txt, and an optional confirmation checkbox gate before the user can continue.",
    intro: "Presents freshly generated backup codes after TOTP enrolment or a regeneration flow.",
    previewNote: "Check the confirmation box to enable Continue.",
    usage: "import { MfaBackupCodesDisplay } from '@/blocks/auth/mfa-backup-codes-display/mfa-backup-codes-display';\n\n// codes come from your generate_backup_codes() mutation caller\n<MfaBackupCodesDisplay\n  codes={generatedCodes}\n  requireConfirmation\n  onConfirm={() => router.push('/account/security')}\n  onMessage={(event) => toast(event.message ?? event.key)}\n/>",
  },
  'auth-mfa-backup-codes-regenerate': {
    title: "MFA backup codes regenerate",
    description: "Confirmation dialog that rotates a user's MFA backup codes via a step-up gate and displays the newly generated codes for saving.",
    intro: "Rotates a user's MFA backup codes behind a high-tier step-up, then shows the new set.",
    previewNote: "Toggle Outcome to generate 8 codes or hit an error.",
    usage: "import { MfaBackupCodesRegenerate } from '@/blocks/auth/mfa-backup-codes-regenerate/mfa-backup-codes-regenerate';\nimport { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';\n\nconst [open, setOpen] = useState(false);\n\n<StepUpProvider>\n  <MfaBackupCodesRegenerate\n    open={open}\n    onOpenChange={setOpen}\n    onSubmit={async () => {\n      const d = await generateBackupCodes.mutateAsync({});\n      return d.generateBackupCodes;\n    }}\n    onSuccess={() => router.push('/account/security')}\n  />\n</StepUpProvider>",
  },
  'auth-magic-link-request-card': {
    title: "Magic-link request card",
    description: "Email-only form that initiates the magic-link sign-in flow. On success it transitions to a \"Check your email\" confirmation panel within the same card — no navigation or redirect.",
    intro: "A single email field that requests a magic link, then swaps to a confirmation panel.",
    previewNote: "Submit an email for the confirmation; toggle Outcome to error.",
    usage: "import { MagicLinkRequestCard } from '@/blocks/auth/magic-link-request-card/magic-link-request-card';\n\n<MagicLinkRequestCard\n  defaultEmail={searchParams.get('email') ?? undefined}\n  signInHref=\"/auth/sign-in\"\n  onSubmit={async ({ email }) => {\n    await requestMagicLink({ email });\n  }}\n  onSuccess={({ email }) => router.push(`/auth/magic-link-sent?email=${encodeURIComponent(email)}`)}\n/>",
  },
  'auth-email-otp-request-card': {
    title: "Email OTP request card",
    description: "Email-only form that sends a one-time passcode to the user's inbox. On success the card transitions to a code-sent confirmation panel (or inline `auth-email-otp-input` when `showOtpInputInline` is true). The confirmation copy interpolates the submitted email. A Resend button in the confirmed state reuses the same send path.",
    intro: "An email field that sends a one-time passcode via the generated `useSendEmailOtpMutation` hook.",
    previewNote: "Toggle Outcome for the code-sent panel or a rate-limited banner.",
    usage: "import { EmailOtpRequestCard } from '@/blocks/auth/email-otp-request-card/email-otp-request-card';\n\nexport function SignInWithCodePage() {\n  return (\n    <EmailOtpRequestCard\n      otpType=\"sign_in\"\n      signInHref=\"/auth/sign-in\"\n      onSubmit={async ({ email, type }) => {\n        await sendEmailOtp({ email, type }); // your SDK call\n      }}\n      onSuccess={({ email }) => console.log('code sent to', email)}\n      onMessage={(event) => toast(event.message ?? event.key)}\n    />\n  );\n}",
  },
  'auth-email-otp-input': {
    title: "Email OTP input",
    description: "A 6-segment one-time-code input with countdown timer, auto-submit on fill, paste support, and resend CTA. Designed for inline code-entry steps in OTP sign-in, email-verify, and password-reset flows.",
    intro: "Six digit boxes that verify an emailed code via the generated `useSignInEmailOtpMutation` hook.",
    previewNote: "Toggle Outcome for the verified path or an INVALID_OTP alert.",
    usage: "import { EmailOtpInput } from '@/blocks/auth/email-otp-input/email-otp-input';\nimport { useSignInEmailOtpMutation, useSendEmailOtpMutation } from '@/generated/auth';\n\nfunction OtpStep({ email }: { email: string }) {\n  const verifyMutation = useSignInEmailOtpMutation({ selection: { fields: { accessToken: true, isVerified: true, mfaRequired: true } } });\n  const resendMutation = useSendEmailOtpMutation({ selection: {} });\n  return (\n    <EmailOtpInput\n      email={email}\n      onVerify={(e, code) => verifyMutation.mutateAsync({ email: e, code }).then((d) => d.signInEmailOtp)}\n      onResend={(e) => resendMutation.mutateAsync({ email: e, type: 'sign_in' }).then(() => undefined)}\n      onSuccess={(result) => router.push(result.mfaRequired ? '/auth/mfa/totp' : '/dashboard')}\n    />\n  );\n}",
  },
  'auth-anonymous-sign-in-button': {
    title: "Anonymous sign-in button",
    description: "Single-click guest session button that creates an anonymous session without requiring credentials.",
    intro: "A one-tap button that creates an anonymous guest session via its `onSubmit` seam.",
    previewNote: "Click to start a guest session; toggle Outcome for the disabled error.",
    usage: "import { AnonymousSignInButton } from '@/blocks/auth/anonymous-sign-in-button/anonymous-sign-in-button';\n\n<AnonymousSignInButton\n  onSubmit={async () => myAnonymousSignInApi()}\n  onSuccess={(result) => {\n    storeToken(result.accessToken);\n    router.push('/explore');\n  }}\n  onError={(err) => toast.error(err.message)}\n>\n  Continue as guest\n</AnonymousSignInButton>",
  },
  'auth-sso-setup-card': {
    title: "SSO setup card",
    description: "Enterprise Single Sign-On setup card for OIDC and SAML provider configuration, mounted inside org-settings pages. The full UI ships today; interactive paths are driven by override props.",
    intro: "An OIDC and SAML 2.0 setup card for org settings; the UI ships but the backend is pending.",
    previewNote: "Explore the full card UI; live actions need host wiring.",
    usage: "import { SsoSetupCard } from '@/blocks/auth/sso-setup-card/sso-setup-card';\n\nexport default function OrgSettingsPage({ orgId }: { orgId: string }) {\n  return (\n    <section>\n      <SsoSetupCard\n        orgId={orgId}\n        messages={{\n          title: 'Single Sign-On',\n          description: 'Configure OIDC or SAML for your organization.',\n        }}\n      />\n    </section>\n  );\n}",
  },
  'auth-sso-sign-in-card': {
    title: "SSO sign-in card",
    description: "Email-domain lookup card that initiates an SSO flow. Preview block — the full UI ships today; backend integration is not yet available, so the domain-lookup path is driven by override props.",
    intro: "An email-domain lookup card that starts an SSO flow; the UI ships but the backend is pending.",
    previewNote: "Enter a work email, click Continue, then toggle Outcome.",
    usage: "import { AuthSsoSignInCard } from '@/blocks/auth/sso-sign-in-card/sso-sign-in-card';\n\nexport function SsoSignInPage() {\n  const router = useRouter();\n  return (\n    <AuthSsoSignInCard\n      signInHref=\"/auth/sign-in\"\n      onDomainSubmit={async (email) => {\n        // Call your domain-lookup + SSO-initiate procedure here.\n        return { ssoProviderId: result.id, orgName: result.orgName };\n      }}\n      onSsoDetected={(result) => router.push(`/sso/${result.ssoProviderId}/callback`)}\n    />\n  );\n}",
  },
  'auth-domain-verification-step': {
    title: "Domain verification step",
    description: "Displays the DNS TXT record an administrator must add to prove domain ownership for an SSO provider configuration. Preview block — the full UI ships today; backend integration is not yet available, so the verification polling path is driven by override props.",
    intro: "Shows the DNS TXT record an admin adds to prove domain ownership; the UI ships, backend pending.",
    previewNote: "Copy the TXT record; the Check now button needs host wiring.",
    usage: "import { AuthDomainVerificationStep } from '@/blocks/auth/domain-verification-step/domain-verification-step';\n\n<AuthDomainVerificationStep\n  ssoProviderId={provider.id}\n  domain=\"acme.com\"\n  onVerified={(id) => router.push(`/settings/sso/${id}`)}\n  onTimeout={() => toast.error('Verification timed out')}\n  onMessage={(e) => toast[e.kind]?.(e.message ?? e.key)}\n/>",
  },
  'org-create-card': {
    title: "Org create card",
    description: "A multi-step wizard card that creates a new organization. Handles display-name entry, slug derivation and availability checking, optional logo upload, and a final confirmation step before submitting.",
    intro: "A multi-step org-creation wizard bound to the generated `useCreateUserMutation` hook.",
    previewNote: "Toggle Outcome to see the error path in the confirm step.",
    usage: "import { OrgCreateCard } from '@/blocks/org/create-card/create-card';\n\n<OrgCreateCard\n  defaultName=\"Acme Corp\"\n  showLogoStep={false}\n  onSubmit={async (input) => {\n    const org = await createOrg(input);\n    return { org };\n  }}\n  onSuccess={(result) => router.push(`/orgs/${result.org.id}`)}\n/>",
  },
  'org-settings-form': {
    title: "Org settings form",
    description: "Form for editing an organization's display name and URL slug, with a Danger Zone section for deleting the org (requires step-up authentication and typed name confirmation).",
    intro: "Edits an org's name and slug via `useUserQuery`, with a step-up-gated delete.",
    previewNote: "Toggle Outcome to drive the save and delete paths.",
    usage: "Mount inside a `StepUpProvider`. Pass `orgId` (the org's user ID) plus `onSubmit` for settings updates and `onDeleteSubmit` for deletion. Both handlers receive the relevant input and must return/resolve when the backend call succeeds, or throw to surface an error message.",
  },
  'org-members-list': {
    title: "Org members list",
    description: "Paginated list of organization members with role badges, inline role-change selector, remove confirmation dialog, and ownership transfer — all gated by viewer permissions.",
    intro: "Lists org members with role badges; role-change, remove, and transfer bind to the generated admin SDK.",
    previewNote: "Toggle Outcome to error on remove, role-change, or transfer.",
    usage: "import { MembersList } from '@/blocks/org/members-list/members-list';\n\n<MembersList\n  orgId={org.id}\n  viewerIsOwner={viewer.isOwner}\n  viewerIsAdmin={viewer.isAdmin}\n  roleProfiles={roleProfiles}\n  onRemoveMember={async (membershipId) => {\n    await removeOrgMember({ membershipId });\n  }}\n  onTransferOwnership={async (membershipId) => {\n    await transferOrgOwnership({ membershipId });\n  }}\n  onMessage={(event) => toast(event)}\n/>",
  },
  'org-invite-dialog': {
    title: "Org invite dialog",
    description: "Dialog for inviting members to an organization by email, with optional role assignment and a list of pending (unclaimed) invites with resend and cancel actions.",
    intro: "Invites members by email with an optional role, and lists pending invites with resend and cancel.",
    previewNote: "Toggle Outcome to see the PERMISSION_DENIED error path.",
    usage: "Mount InviteDialog with orgId and onOpenChange. Pass roleProfiles to enable the role selector. Wire onInviteSent to close the dialog and surface a confirmation. Wire onError to display the mapped error message.",
  },
  'org-roles-editor': {
    title: "Org roles editor",
    description: "Admin interface for managing named org role profiles. Each profile is a named permission bundle drawn from the SPRT system. Org admins create, update, and delete profiles.",
    intro: "Create, edit, and delete custom org role profiles — named permission bundles; system roles stay read-only.",
    previewNote: "Add a role, then toggle Outcome to drive save and delete.",
    usage: "Mount inside BlocksRuntime with the 'admin' namespace. Pass orgId (the org's user id). Override onSubmit and onDelete to replace the default GraphQL mutations, or let the block use useCreateOrgProfileMutation / useUpdateOrgProfileMutation / useDeleteOrgProfileMutation directly.",
  },
  'org-app-memberships': {
    title: "Org app memberships",
    description: "Admin block for managing an organization's app-level memberships. Supports approve, profile-update (via Select), and revoke (step-up gated) actions.",
    intro: "Lists an org's app memberships with Approve, profile-update, and step-up-gated Revoke actions.",
    previewNote: "Toggle Outcome to drive the approve and revoke responses.",
    usage: "<OrgAppMemberships\n  orgId=\"org_demo_001\"\n  membershipProfiles={[\n    { id: 'prof_viewer', label: 'Viewer' },\n    { id: 'prof_editor', label: 'Editor' },\n  ]}\n  onSubmit={async (vars) => { /* approve or profile-update */ return null; }}\n  onRevoke={async (vars) => { /* revoke */ return null; }}\n/>",
  },
  'org-scim-token-generation-card': {
    title: "SCIM token generation card",
    description: "A card for generating and revoking the SCIM bearer token used by an identity provider to provision users. Preview block — the full UI ships today; backend integration is not yet available, so Generate and Revoke are driven by override props.",
    intro: "Generates or revokes an org's SCIM bearer token for IdP sync; the UI ships but the backend is pending.",
    previewNote: "Toggle Outcome for the revealed token or an error alert.",
    usage: "import { OrgScimTokenGenerationCard } from '@/blocks/org/scim-token-generation-card/scim-token-generation-card';\n\n<OrgScimTokenGenerationCard\n  orgId={org.id}\n  onSubmit={async (orgId) => {\n    const result = await generateScimToken({ orgId });\n    return { token: result.token, expiresAt: result.expiresAt ?? null };\n  }}\n  onSuccess={(result) => console.log('Token generated', result.token)}\n  onError={(err) => toast.error(err.message)}\n/>",
  },
  'org-scim-connections-list': {
    title: "SCIM connections",
    description: "Displays active SCIM provider connections for an organization. Preview block — the full UI ships today; backend integration is not yet available, so the list renders an informational empty state.",
    intro: "Lists an org's active SCIM provider connections; the UI ships but the backend is pending.",
    previewNote: "Backend pending — the panel renders its informational empty state.",
    usage: "import { OrgScimConnectionsList } from '@/blocks/org/scim-connections-list/scim-connections-list';\n\nexport default function OrgSettingsPage({ orgId }: { orgId: string }) {\n  return (\n    <section>\n      <OrgScimConnectionsList\n        orgId={orgId}\n        scimBaseUrl=\"https://api.yourapp.com\"\n        onRevokeSuccess={(id) => console.log('revoked', id)}\n        onError={(err) => console.error(err.message)}\n      />\n    </section>\n  );\n}",
  },
  'org-scim-setup-guide': {
    title: "SCIM provisioning setup guide",
    description: "Displays provider-specific SCIM 2.0 setup instructions for an organization. Shows the SCIM endpoint URL (copyable), bearer token guidance, and the full attribute-mapping table. Supports Okta, Azure AD / Entra ID, JumpCloud, Google Workspace, and Generic SCIM 2.0.",
    intro: "Provider-specific SCIM 2.0 setup instructions — endpoint URL, token guidance, and attribute mappings.",
    previewNote: "Switch the provider selector to update the endpoint and docs link.",
    usage: "import { OrgScimSetupGuide } from '@/blocks/org/scim-setup-guide/scim-setup-guide';\n\n<OrgScimSetupGuide\n  orgId={org.id}\n  provider=\"okta\"\n  scimBaseUrl=\"https://auth.example.com\"\n  onError={(err) => console.error('SCIM guide error', err)}\n/>",
  },
  'shell-sidebar': {
    title: "Shell sidebar",
    description: "Primary navigation rail for application shells. Collapses to an icon-only mode, persists state to localStorage, and supports badges, nested sub-items, and render-prop top/bottom slots.",
    intro: "A pure-layout navigation rail that collapses to a 64 px icon rail, with external top and bottom slots.",
    previewNote: "Toggle Mode to collapse the rail; expand Products for sub-items.",
    usage: "import { ShellSidebar } from '@/blocks/shell/sidebar/sidebar';\nimport { UserContextSwitcher } from '@/blocks/user/user-context-switcher/user-context-switcher';\nimport { ShellAccountMenu } from '@/blocks/shell/account-menu/account-menu';\n\n<ShellSidebar\n  navItems={[\n    { label: 'Dashboard', href: '/dashboard', icon: <DashIcon /> },\n    { label: 'Users', href: '/users', icon: <UsersIcon />, badge: 4 },\n    { label: 'Settings', href: '/settings', icon: <SettingsIcon /> },\n  ]}\n  topSlot={(collapsed) => <UserContextSwitcher collapsed={collapsed} />}\n  bottomSlot={(collapsed) => <ShellAccountMenu collapsed={collapsed} />}\n/>",
  },
  'shell-header': {
    title: "Shell header",
    description: "Sticky top application bar that composes a logo slot, optional breadcrumbs, a search input, a command-palette trigger (Cmd+K), and an account-menu slot. Pure layout — no data fetching.",
    intro: "A sticky, data-free top app bar that composes logo, breadcrumbs, search, and account-menu slots.",
    previewNote: "A compact header; try the ⌘K trigger and sidebar toggle.",
    usage: "import { ShellHeader } from '@/blocks/shell/header/header';\nimport { ShellBreadcrumbs } from '@/blocks/shell/breadcrumbs/breadcrumbs';\nimport { ShellAccountMenu } from '@/blocks/shell/account-menu/account-menu';\n\n<ShellHeader\n  logo={<MyLogo />}\n  breadcrumbsSlot={<ShellBreadcrumbs />}\n  accountMenuSlot={<ShellAccountMenu />}\n  showSearch\n  onCommandPaletteOpen={() => setCommandPaletteOpen(true)}\n  onSidebarToggle={() => setSidebarOpen((v) => !v)}\n  sidebarOpen={sidebarOpen}\n/>",
  },
  'shell-breadcrumbs': {
    title: "Shell breadcrumbs",
    description: "Route-based breadcrumb trail for the app shell. Parses `usePathname()` and maps path segments to human-readable labels via a consumer-provided `resolveLabel` function, or accepts an explicit `segments` override.",
    intro: "A route-based breadcrumb trail from Next.js `usePathname()`, or an explicit `segments` list.",
    previewNote: "Switch Depth to see shallow, deep, and ellipsis-collapsed trails.",
    usage: "import { ShellBreadcrumbs } from '@/blocks/shell/breadcrumbs/breadcrumbs';\n\n// Automatic pathname parsing (App Router)\n<ShellBreadcrumbs\n  resolveLabel={(segment) => entityNames[segment] ?? null}\n  maxVisible={4}\n  showHome\n  homeHref=\"/\"\n/>\n\n// Explicit segments override (Pages Router or static)\n<ShellBreadcrumbs\n  segments={[\n    { label: 'Organizations', href: '/orgs' },\n    { label: 'Acme Corp', href: '/orgs/acme' },\n    { label: 'Schema Builder' },\n  ]}\n/>",
  },
  'shell-command-palette': {
    title: "Shell command palette",
    description: "Auth-aware command palette (Cmd+K) with grouped commands, keyboard navigation, and permission-filtered entries via the companion provider.",
    intro: "A Cmd+K command palette with grouped commands and keyboard navigation.",
    previewNote: "Open the palette (or press Cmd+K) and select a command.",
    usage: "import { ShellCommandPalette } from '@/blocks/shell/command-palette/command-palette';\n\n<ShellCommandPalette\n  commands={[\n    {\n      id: 'nav:settings',\n      label: 'Go to account settings',\n      group: 'navigation',\n      shortcut: '⌘,',\n      onSelect: () => router.push('/settings'),\n    },\n    {\n      id: 'account:sign-out',\n      label: 'Sign out',\n      group: 'account',\n      onSelect: handleSignOut,\n    },\n  ]}\n  onError={(err) => toast.error(String(err))}\n/>",
  },
  'shell-notifications': {
    title: "Shell notifications",
    description: "Bell-icon popover that surfaces per-user notifications in the app shell. Renders a badge with the unread count, a scrollable notification panel with per-kind icons (info, warning, success, error), relative timestamps, and per-item mark-read and dismiss actions. Fully offline — the host owns data fetching and passes items via the `items` prop.",
    intro: "A bell-icon popover with an unread badge, showing host-supplied notification rows.",
    previewNote: "Open the bell, then use Mark all read or per-item dismiss.",
    usage: "import { ShellNotifications } from '@/blocks/shell/notifications/notifications';\n\nfunction AppHeader() {\n  const { data, markRead, markAllRead, dismiss } = useNotifications();\n\n  return (\n    <header className=\"flex items-center justify-between px-4 py-2\">\n      <Logo />\n      <ShellNotifications\n        items={data}\n        allNotificationsHref=\"/notifications\"\n        onMarkRead={markRead}\n        onMarkAllRead={markAllRead}\n        onDismiss={dismiss}\n      />\n    </header>\n  );\n}",
  },
  'shell-account-menu': {
    title: "Shell account menu",
    description: "Dropdown menu that shows the current user's avatar and display name as the trigger. Composes UserAvatar and SignOutButton. Navigates to signOutRedirectHref after sign-out.",
    intro: "A dropdown keyed to the current user from the auth SDK, with account-settings and sign-out actions.",
    previewNote: "Open the menu and click Sign out; it stays mounted here.",
    usage: "<ShellAccountMenu accountSettingsHref=\"/account/settings\" signOutRedirectHref=\"/login\" showActiveContext onSignOutSuccess={() => clearStores()} />",
  },
  'user-context-switcher': {
    title: "User context switcher",
    description: "Dropdown that lets a signed-in user switch their active context between their personal account and any org they are a member of.",
    intro: "Switches active context between personal and org accounts via `useCurrentUserQuery` + `useOrgMembershipsQuery`.",
    previewNote: "Toggle Outcome to test the error path on context switch.",
    usage: "Mount inside a host that has called `configure({ adapter })` from `@constructive/blocks-runtime`. Pass `currentUser` to skip the redundant auth fetch. Provide `onSwitchSubmit` (the override seam for the context-switch path until that backend support is available) and `onContextSwitch` to react to switches in your host state.",
  },
};
