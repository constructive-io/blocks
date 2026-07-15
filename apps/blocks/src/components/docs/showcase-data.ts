/**
 * showcase-data — per-block content for the enriched doc pages.
 *
 * `SHOWCASE_SLUGS` are the blocks that get the full 8-section anatomy (live
 * preview + usage + lean props + auto-rendered messages/requires); every other
 * manifest entry keeps the generic spec-only layout.
 *
 * Messages and requires are IMPORTED from block source (consumption, never
 * edited) so those sections stay in lockstep with the block — the page never
 * restates strings the block owns. The live previews live in `showcase.tsx`.
 *
 * Docs harness only — never imported by block source.
 */

import { defaultAccountEmailsListMessages } from '@/blocks/auth/account-emails-list/messages';
import { defaultForgotPasswordCardMessages } from '@/blocks/auth/forgot-password-card/messages';
import { defaultResetPasswordCardMessages } from '@/blocks/auth/reset-password-card/messages';
import { defaultSignInCardMessages } from '@/blocks/auth/sign-in-card/messages';
import { defaultSignOutButtonMessages } from '@/blocks/auth/sign-out-button/messages';
import { defaultSignUpCardMessages } from '@/blocks/auth/sign-up-card/messages';
import { defaultStepUpDialogMessages } from '@/blocks/auth/step-up-dialog/messages';

import accountEmailsRequires from '@/blocks/auth/account-emails-list/auth-account-emails-list.requires.json';
import forgotPasswordRequires from '@/blocks/auth/forgot-password-card/auth-forgot-password-card.requires.json';
import resetPasswordRequires from '@/blocks/auth/reset-password-card/auth-reset-password-card.requires.json';
import signInRequires from '@/blocks/auth/sign-in-card/auth-sign-in-card.requires.json';
import signOutRequires from '@/blocks/auth/sign-out-button/auth-sign-out-button.requires.json';
import signUpRequires from '@/blocks/auth/sign-up-card/auth-sign-up-card.requires.json';
import stepUpRequires from '@/blocks/auth/step-up-dialog/auth-step-up-dialog.requires.json';

import type { PropRow } from './props-table';
import { defaultUserContextSwitcherMessages } from '@/blocks/user/context-switcher/messages';
import userContextSwitcherRequires from '@/blocks/user/context-switcher/user-context-switcher.requires.json';
import { defaultShellAccountMenuMessages } from '@/blocks/shell/account-menu/messages';
import shellAccountMenuRequires from '@/blocks/shell/account-menu/shell-account-menu.requires.json';
import { defaultShellNotificationsMessages } from '@/blocks/shell/notifications/messages';
import shellNotificationsRequires from '@/blocks/shell/notifications/shell-notifications.requires.json';
import { defaultShellCommandPaletteMessages } from '@/blocks/shell/command-palette/messages';
import shellCommandPaletteRequires from '@/blocks/shell/command-palette/shell-command-palette.requires.json';
import { defaultShellBreadcrumbsMessages } from '@/blocks/shell/breadcrumbs/messages';
import { defaultShellHeaderMessages } from '@/blocks/shell/header/messages';
import { defaultShellSidebarMessages } from '@/blocks/shell/sidebar/messages';
import { defaultOrgScimSetupGuideMessages } from '@/blocks/org/scim-setup-guide/messages';
import { defaultScimConnectionsListMessages } from '@/blocks/org/scim-connections-list/messages';
import { defaultOrgScimTokenGenerationCardMessages } from '@/blocks/org/scim-token-generation-card/messages';
import { defaultOrgAppMembershipsMessages } from '@/blocks/org/app-memberships/messages';
import orgAppMembershipsRequires from '@/blocks/org/app-memberships/org-app-memberships.requires.json';
import { defaultOrgRolesEditorMessages } from '@/blocks/org/roles-editor/messages';
import orgRolesEditorRequires from '@/blocks/org/roles-editor/org-roles-editor.requires.json';
import { defaultOrgInviteDialogMessages } from '@/blocks/org/invite-dialog/messages';
import orgInviteDialogRequires from '@/blocks/org/invite-dialog/org-invite-dialog.requires.json';
import { defaultOrgMembersListMessages } from '@/blocks/org/members-list/messages';
import orgMembersListRequires from '@/blocks/org/members-list/org-members-list.requires.json';
import { defaultOrgSettingsFormMessages } from '@/blocks/org/settings-form/messages';
import orgSettingsFormRequires from '@/blocks/org/settings-form/org-settings-form.requires.json';
import { defaultOrgCreateCardMessages } from '@/blocks/org/create-card/messages';
import orgCreateCardRequires from '@/blocks/org/create-card/org-create-card.requires.json';
import { defaultAuthDomainVerificationStepMessages } from '@/blocks/auth/domain-verification-step/messages';
import { defaultAuthSsoSignInCardMessages } from '@/blocks/auth/sso-sign-in-card/messages';
import { defaultSsoSetupCardMessages } from '@/blocks/auth/sso-setup-card/messages';
import { defaultAnonymousSignInButtonMessages } from '@/blocks/auth/anonymous-sign-in-button/messages';
import authAnonymousSignInButtonRequires from '@/blocks/auth/anonymous-sign-in-button/auth-anonymous-sign-in-button.requires.json';
import { defaultEmailOtpInputMessages } from '@/blocks/auth/email-otp-input/messages';
import authEmailOtpInputRequires from '@/blocks/auth/email-otp-input/auth-email-otp-input.requires.json';
import { defaultEmailOtpRequestCardMessages } from '@/blocks/auth/email-otp-request-card/messages';
import authEmailOtpRequestCardRequires from '@/blocks/auth/email-otp-request-card/auth-email-otp-request-card.requires.json';
import { defaultMagicLinkRequestCardMessages } from '@/blocks/auth/magic-link-request-card/messages';
import authMagicLinkRequestCardRequires from '@/blocks/auth/magic-link-request-card/auth-magic-link-request-card.requires.json';
import { defaultMfaBackupCodesRegenerateMessages } from '@/blocks/auth/mfa-backup-codes-regenerate/messages';
import authMfaBackupCodesRegenerateRequires from '@/blocks/auth/mfa-backup-codes-regenerate/auth-mfa-backup-codes-regenerate.requires.json';
import { defaultMfaBackupCodesDisplayMessages } from '@/blocks/auth/mfa-backup-codes-display/messages';
import { defaultMfaTotpDisableConfirmMessages } from '@/blocks/auth/mfa-totp-disable-confirm/messages';
import authMfaTotpDisableConfirmRequires from '@/blocks/auth/mfa-totp-disable-confirm/auth-mfa-totp-disable-confirm.requires.json';
import { defaultMfaTotpChallengePageMessages } from '@/blocks/auth/mfa-totp-challenge-page/messages';
import { defaultMfaTotpChallengeMessages } from '@/blocks/auth/mfa-totp-challenge/messages';
import authMfaTotpChallengeRequires from '@/blocks/auth/mfa-totp-challenge/auth-mfa-totp-challenge.requires.json';
import { defaultMfaTotpEnrollMessages } from '@/blocks/auth/mfa-totp-enroll/messages';
import authMfaTotpEnrollRequires from '@/blocks/auth/mfa-totp-enroll/auth-mfa-totp-enroll.requires.json';
import { defaultPasskeySignInMessages } from '@/blocks/auth/passkey-sign-in/messages';
import authPasskeySignInRequires from '@/blocks/auth/passkey-sign-in/auth-passkey-sign-in.requires.json';
import { defaultPasskeyEnrollMessages } from '@/blocks/auth/passkey-enroll/messages';
import authPasskeyEnrollRequires from '@/blocks/auth/passkey-enroll/auth-passkey-enroll.requires.json';
import { defaultPasskeyManagementListMessages } from '@/blocks/auth/passkey-management-list/messages';
import authPasskeyManagementListRequires from '@/blocks/auth/passkey-management-list/auth-passkey-management-list.requires.json';
import { defaultApiKeyCreatedModalMessages } from '@/blocks/auth/api-key-created-modal/messages';
import { defaultApiKeyCreateDialogMessages } from '@/blocks/auth/api-key-create-dialog/messages';
import authApiKeyCreateDialogRequires from '@/blocks/auth/api-key-create-dialog/auth-api-key-create-dialog.requires.json';
import { defaultChangePasswordFormMessages } from '@/blocks/auth/change-password-form/messages';
import authChangePasswordFormRequires from '@/blocks/auth/change-password-form/auth-change-password-form.requires.json';
import { defaultAccountSettingsPageMessages } from '@/blocks/auth/account-settings-page/messages';
import authAccountSettingsPageRequires from '@/blocks/auth/account-settings-page/auth-account-settings-page.requires.json';
import { defaultAccountPhonesListMessages } from '@/blocks/auth/account-phones-list/messages';
import authAccountPhonesListRequires from '@/blocks/auth/account-phones-list/auth-account-phones-list.requires.json';
import { defaultAccountConnectedAccountsMessages } from '@/blocks/auth/account-connected-accounts/messages';
import authAccountConnectedAccountsRequires from '@/blocks/auth/account-connected-accounts/auth-account-connected-accounts.requires.json';
import { defaultAccountApiKeysListMessages } from '@/blocks/auth/account-api-keys-list/messages';
import authAccountApiKeysListRequires from '@/blocks/auth/account-api-keys-list/auth-account-api-keys-list.requires.json';
import { defaultAccountSessionsListMessages } from '@/blocks/auth/account-sessions-list/messages';
import authAccountSessionsListRequires from '@/blocks/auth/account-sessions-list/auth-account-sessions-list.requires.json';
import { defaultAccountDangerCardMessages } from '@/blocks/auth/account-danger-card/messages';
import authAccountDangerCardRequires from '@/blocks/auth/account-danger-card/auth-account-danger-card.requires.json';
import { defaultAccountSecurityCardMessages } from '@/blocks/auth/account-security-card/messages';
import authAccountSecurityCardRequires from '@/blocks/auth/account-security-card/auth-account-security-card.requires.json';
import { defaultAccountProfileCardMessages } from '@/blocks/auth/account-profile-card/messages';
import authAccountProfileCardRequires from '@/blocks/auth/account-profile-card/auth-account-profile-card.requires.json';
import { defaultMagicLinkCallbackPageMessages } from '@/blocks/auth/magic-link-callback-page/messages';
import authMagicLinkCallbackPageRequires from '@/blocks/auth/magic-link-callback-page/auth-magic-link-callback-page.requires.json';
import { defaultMagicLinkSentPageMessages } from '@/blocks/auth/magic-link-sent-page/messages';
import authMagicLinkSentPageRequires from '@/blocks/auth/magic-link-sent-page/auth-magic-link-sent-page.requires.json';
import { defaultAccountDeletionConfirmMessages } from '@/blocks/auth/account-deletion-confirm-page/messages';
import authAccountDeletionConfirmPageRequires from '@/blocks/auth/account-deletion-confirm-page/auth-account-deletion-confirm-page.requires.json';
import authInvitationAcceptancePageRequires from '@/blocks/auth/invitation-acceptance-page/auth-invitation-acceptance-page.requires.json';
import { defaultInvitationAcceptanceMessages } from '@/blocks/auth/invitation-acceptance-card/messages';
import authInvitationAcceptanceCardRequires from '@/blocks/auth/invitation-acceptance-card/auth-invitation-acceptance-card.requires.json';
import { defaultSocialProvidersGridMessages } from '@/blocks/auth/social-providers-grid/messages';
import { defaultAuthSocialButtonsMessages } from '@/blocks/auth/social-buttons/messages';
import authSocialButtonsRequires from '@/blocks/auth/social-buttons/auth-social-buttons.requires.json';
import { defaultCrossOriginLinkMessages } from '@/blocks/auth/cross-origin-link/messages';
import authCrossOriginLinkRequires from '@/blocks/auth/cross-origin-link/auth-cross-origin-link.requires.json';
import { defaultVerifyEmailBannerMessages } from '@/blocks/auth/verify-email-banner/messages';
import authVerifyEmailBannerRequires from '@/blocks/auth/verify-email-banner/auth-verify-email-banner.requires.json';
import { defaultVerifyEmailPageMessages } from '@/blocks/auth/verify-email-page/messages';
import authVerifyEmailPageRequires from '@/blocks/auth/verify-email-page/auth-verify-email-page.requires.json';
import type { RequiresInput, RequiresJson } from './requires-panel';

export type ShowcaseEntry = {
  /** Lean key-props reference (not the full type). */
  props: PropRow[];
  /** The block's `default<Block>Messages` object, rendered generically. */
  messages?: Record<string, unknown>;
  /** The block's `<block>.requires.json` (single- or multi-namespace), rendered generically. */
  requires?: RequiresInput;
};

export const SHOWCASE: Record<string, ShowcaseEntry> = {
  'auth-sign-in-card': {
    props: [
      { name: 'showRememberMe', type: 'boolean', default: 'true', description: 'Show the remember-me checkbox.' },
      { name: 'defaultEmail', type: 'string', description: 'Prefill the email field.' },
      { name: 'credentialKind', type: 'string', default: "'bearer'", description: 'Credential kind sent to the API.' },
      { name: 'forgotPasswordHref', type: 'string', description: 'Renders a "forgot password?" link when set.' },
      { name: 'signUpHref', type: 'string', description: 'Renders a sign-up link in the footer when set.' },
      {
        name: 'onSubmit',
        type: '(vars: SignInVars) => Promise<SignInResult | null>',
        description: 'Override seam — fully replaces the generated useSignInMutation call.',
      },
      { name: 'onSuccess', type: '(result: SignInResult) => void', description: 'Fires after a resolved sign-in.' },
      {
        name: 'onMessage',
        type: '(event: MessageEvent) => void',
        description: 'Notification seam — fires for success and mapped errors.',
      },
    ],
    messages: defaultSignInCardMessages,
    requires: signInRequires as RequiresJson,
  },

  'auth-sign-out-button': {
    props: [
      { name: 'children', type: 'ReactNode', default: 'messages.buttonText', description: 'Button label.' },
      {
        name: 'variant',
        type: "'default' | 'outline' | 'ghost' | 'link' | 'destructive'",
        default: "'default'",
        description: 'Underlying Button variant.',
      },
      { name: 'size', type: "'default' | 'sm' | 'lg' | 'icon'", default: "'default'", description: 'Underlying Button size.' },
      {
        name: 'onSubmit',
        type: '() => Promise<void>',
        description: 'Override seam — replaces the generated useSignOutMutation call.',
      },
      { name: 'onSuccess', type: '() => void', description: 'Fires after a resolved sign-out (after the cache clears).' },
      { name: 'onMessage', type: '(event: MessageEvent) => void', description: 'Notification seam for success and errors.' },
    ],
    messages: defaultSignOutButtonMessages,
    requires: signOutRequires as RequiresJson,
  },

  'auth-forgot-password-card': {
    props: [
      { name: 'defaultEmail', type: 'string', description: 'Prefill the email field.' },
      { name: 'showBackLink', type: 'boolean', default: 'true', description: 'Show the "back to sign-in" link.' },
      { name: 'signInHref', type: 'string', description: 'Target for the back-to-sign-in link.' },
      {
        name: 'onSubmit',
        type: '(vars: ForgotPasswordVars) => Promise<void>',
        description: 'Override seam — replaces the generated useForgotPasswordMutation call.',
      },
      { name: 'onSuccess', type: '() => void', description: 'Fires after the request is accepted (before the confirm panel).' },
      { name: 'onMessage', type: '(event: MessageEvent) => void', description: 'Notification seam for success and errors.' },
    ],
    messages: defaultForgotPasswordCardMessages,
    requires: forgotPasswordRequires as RequiresJson,
  },

  'auth-reset-password-card': {
    props: [
      { name: 'roleId', type: 'string', default: '?role_id=', description: 'Role id; falls back to the URL searchParam.' },
      { name: 'token', type: 'string', default: '?token=', description: 'Reset token; falls back to the URL searchParam.' },
      { name: 'showPasswordStrength', type: 'boolean', default: 'true', description: 'Show the inline strength meter.' },
      { name: 'signInPath', type: 'string', description: 'Renders a sign-in link on the success panel.' },
      {
        name: 'onSubmit',
        type: '(vars: ResetPasswordVars) => Promise<boolean | null>',
        description: 'Override seam — replaces the generated useResetPasswordMutation call. Return false for an expired token.',
      },
      { name: 'onMessage', type: '(event: MessageEvent) => void', description: 'Notification seam for success and errors.' },
    ],
    messages: defaultResetPasswordCardMessages,
    requires: resetPasswordRequires as RequiresJson,
  },

  'auth-sign-up-card': {
    props: [
      { name: 'showRememberMe', type: 'boolean', default: 'true', description: 'Show the remember-me checkbox.' },
      { name: 'showPasswordStrength', type: 'boolean', default: 'true', description: 'Show the inline strength meter.' },
      { name: 'showPasswordConfirm', type: 'boolean', default: 'true', description: 'Show the confirm-password field (validated inline).' },
      { name: 'signInHref', type: 'string', description: 'Renders a sign-in link in the footer when set.' },
      {
        name: 'onCheckPasswordBreach',
        type: '(password: string) => Promise<boolean | number>',
        description: 'Optional HIBP seam; return falsy to block submit. No default fetcher shipped.',
      },
      {
        name: 'onSubmit',
        type: '(vars: SignUpVars) => Promise<SignUpResult | null>',
        description: 'Override seam — replaces the generated useSignUpMutation call.',
      },
      { name: 'onSuccess', type: '(result: SignUpResult) => void', description: 'Fires after a resolved sign-up.' },
    ],
    messages: defaultSignUpCardMessages,
    requires: signUpRequires as RequiresJson,
  },

  'auth-step-up-dialog': {
    props: [
      { name: 'open', type: 'boolean', required: true, description: 'Controls dialog visibility (parent-owned).' },
      { name: 'type', type: "'password' | 'mfa'", required: true, description: 'Which verifier to render.' },
      { name: 'onVerify', type: '(result: StepUpResult) => void', required: true, description: 'Fires with ok=true on success, ok=false on cancel/error.' },
      {
        name: 'onSubmitPassword',
        type: '(input: { password }) => Promise<StepUpResult>',
        description: 'Override seam for the verify-password call.',
      },
      {
        name: 'onSubmitTotp',
        type: '(input: { totpValue }) => Promise<StepUpResult>',
        description: 'Override seam for the verify-TOTP call.',
      },
      { name: 'allowBackupCode', type: 'false', default: 'false', description: 'Locked off in v1 (backend procedure not deployed).' },
    ],
    messages: defaultStepUpDialogMessages,
    requires: stepUpRequires as RequiresJson,
  },

  'use-step-up': {
    props: [
      { name: 'tier', type: "'high' | 'medium'", description: 'Severity shorthand. v1: both resolve to a password challenge.' },
      { name: 'type', type: "'password' | 'mfa'", description: 'Explicit verifier; wins over tier when both are passed.' },
      {
        name: 'messages',
        type: 'StepUpDialogMessageOverrides',
        description: 'Per-call dialog copy, merged over the provider defaults.',
      },
    ],
  },

  'auth-account-emails-list': {
    props: [
      { name: 'readOnly', type: 'boolean', default: 'false', description: 'Hide all mutating controls.' },
      { name: 'maxEmails', type: 'number', default: '10', description: 'Cap on the number of addresses.' },
      {
        name: 'onSubmitAdd',
        type: '(email: string) => Promise<EmailRow>',
        description: 'Override seam for adding an address.',
      },
      {
        name: 'onSubmitSetPrimary',
        type: '(id: string) => Promise<EmailRow>',
        description: 'Override seam for promoting an address to primary.',
      },
      { name: 'onSubmitDelete', type: '(id: string) => Promise<void>', description: 'Override seam for removing an address.' },
      { name: 'onMessage', type: '(event: MessageEvent) => void', description: 'Notification seam for every outcome.' },
    ],
    messages: defaultAccountEmailsListMessages,
    requires: accountEmailsRequires as RequiresJson,
  },

  'user-avatar': {
    props: [
      { name: 'user', type: 'UserAvatarUser', required: true, description: 'The subject: id, type, displayName, username, profilePicture.' },
      { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Avatar size (24 / 32 / 40px).' },
      { name: 'alt', type: 'string', description: 'Override the derived alt text.' },
    ],
  },
  'auth-sign-in-page': {
    props: [
      { name: "className", type: "string", description: "Extra classes on the outer `<main>` element (full-viewport centering wrapper)." },
      { name: "DEFAULT_REDIRECT", type: "string", default: "'/dashboard'", description: "Editable constant in the installed file — where to send the user after a successful sign-in." },
      { name: "MFA_PATH", type: "string", default: "'/auth/mfa/totp'", description: "Editable constant — target route for the MFA challenge step." },
      { name: "SIGN_UP_PATH", type: "string", default: "'/auth/sign-up'", description: "Editable constant — passed to `SignInCard` as `signUpHref`." },
      { name: "FORGOT_PASSWORD_PATH", type: "string", default: "'/auth/forgot-password'", description: "Editable constant — passed to `SignInCard` as `forgotPasswordHref`." },
      { name: "BRAND_LOGO_SRC", type: "string", default: "''", description: "Editable constant — URL of an optional logo rendered above the card when non-empty." },
    ],
  },
  'auth-sign-up-page': {
    props: [
      { name: "className", type: "string", default: "undefined", description: "Additional CSS classes applied to the outer `<main>` element. Use to adjust min-height or vertical padding when embedding in a custom shell." },
    ],
  },
  'auth-forgot-password-page': {
    props: [
      { name: "defaultEmail", type: "string | undefined", default: "undefined", description: "Pre-fills the email field. The page reads this from the ?email= search param; override when embedding the card directly." },
      { name: "signInHref", type: "string", default: "'/auth/sign-in'", description: "Href for the 'Back to sign in' link rendered in the card footer. Defaults to SIGN_IN_PATH constant in the installed page." },
      { name: "showBackLink", type: "boolean", default: "true", description: "Show or hide the back-to-sign-in link. Passed through to the card." },
      { name: "onSubmit", type: "(vars: ForgotPasswordVars) => Promise<void>", description: "Override seam on the card — fully replaces the generated useForgotPasswordMutation call." },
      { name: "onSuccess", type: "(vars: ForgotPasswordVars) => void", description: "Fires after the request is accepted (before the confirmation panel appears)." },
      { name: "onMessage", type: "(event: { kind: string; key: string; message?: string }) => void", description: "Notification seam — fires for success, mapped errors, and resend events." },
    ],
  },
  'auth-reset-password-page': {
    props: [
      { name: "className", type: "string", default: "undefined", description: "Optional extra CSS classes applied to the outer `<main>` element. Use to override min-height or padding for non-full-screen layouts." },
    ],
  },
  'auth-verify-email-page': {
    props: [
      { name: "email", type: "string", description: "Email address pre-supplied for the resend-verification call on the expired panel. Required for the Resend button to appear; without it the expired state shows only the sign-in link." },
      { name: "signInHref", type: "string", default: "'/auth/sign-in'", description: "Href for the sign-in link shown on the expired and invalid panels." },
      { name: "dashboardHref", type: "string", default: "'/dashboard'", description: "Href for the success CTA button." },
      { name: "onSubmit", type: "(vars: { emailId: string; token: string }) => Promise<boolean | null>", description: "Override seam — fully replaces useVerifyEmailMutation. Return true for success, false for invalid, or throw with EXPIRED_TOKEN code for the expired state." },
      { name: "onSuccess", type: "() => void", description: "Fires after the verification resolves to true. Use to redirect or update auth state." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped verification error (invalid or unknown)." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for every outcome including resend results." },
      { name: "messages", type: "VerifyEmailPageMessageOverrides", description: "Shallow-partial message overrides. errors sub-map accepts EXPIRED_TOKEN, INVALID_TOKEN, UNKNOWN_ERROR keys." },
      { name: "className", type: "string", description: "Additional class names on the root element." },
    ],
    messages: defaultVerifyEmailPageMessages,
    requires: authVerifyEmailPageRequires as RequiresJson,
  },
  'auth-verify-email-banner': {
    props: [
      { name: "email", type: "string", required: true, description: "Primary email address to resend verification to." },
      { name: "dismissed", type: "boolean", description: "Controlled dismissed state. When provided the banner acts as a controlled component." },
      { name: "onDismiss", type: "() => void", description: "Fires when the user clicks the dismiss button." },
      { name: "showResendButton", type: "boolean", default: "true", description: "Show or hide the resend CTA." },
      { name: "onResend", type: "(email: string) => Promise<boolean>", description: "Override seam — fully replaces the generated useSendVerificationEmailMutation call." },
      { name: "onSuccess", type: "(email: string) => void", description: "Fires after a successful resend." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped error." },
      { name: "onMessage", type: "(event: MessageEvent) => void", description: "Notification seam — fires for success and mapped errors." },
      { name: "messages", type: "VerifyEmailBannerMessageOverrides", description: "Override any subset of the default copy, including per-code error strings." },
    ],
    messages: defaultVerifyEmailBannerMessages,
    requires: authVerifyEmailBannerRequires as RequiresJson,
  },
  'auth-cross-origin-link': {
    props: [
      { name: "email", type: "string", required: true, description: "Email credential forwarded to the token mutation (from the parent form)." },
      { name: "password", type: "string", required: true, description: "Password credential forwarded to the token mutation." },
      { name: "destinationOrigin", type: "string", required: true, description: "Target origin, e.g. `https://app.example.com`. Must be server-side allowlisted." },
      { name: "destinationPath", type: "string", default: "'/auth/cross-origin'", description: "Path appended to the origin before the `?token=` query param." },
      { name: "renderAs", type: "'button' | 'link'", default: "'button'", description: "Render as an `AuthLoadingButton` (default) or a plain `Button` with `role=button`." },
      { name: "variant", type: "'default' | 'outline' | 'ghost' | 'link'", default: "'default'", description: "Visual variant forwarded to the underlying Button." },
      { name: "onSubmit", type: "(input: CrossOriginLinkInput) => Promise<string>", description: "Override seam — fully replaces the generated `useRequestCrossOriginTokenMutation` call. Must resolve to the token string." },
      { name: "onSuccess", type: "(token: string, url: string) => void", description: "Fires after token generation, before the cross-origin redirect." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped error." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for every outcome (success and all errors)." },
    ],
    messages: defaultCrossOriginLinkMessages,
    requires: authCrossOriginLinkRequires as RequiresJson,
  },
  'auth-social-buttons': {
    props: [
      { name: "providers", type: "string[]", description: "Static provider slug list. When set the DB query is skipped. Known slugs: 'google' | 'github' | 'apple' | 'facebook' | 'microsoft' | 'linkedin' | 'slack'. Custom slugs are allowed (renders generic icon + slug as displayName)." },
      { name: "mode", type: "'sign-in' | 'sign-up'", default: "'sign-in'", description: "Affects button labels. 'sign-in' renders \"Sign in with …\"; 'sign-up' renders \"Sign up with …\". Default: 'sign-in'." },
      { name: "layout", type: "'stacked' | 'grid' | 'icon-only'", default: "'stacked'", description: "Button layout. 'stacked' renders full-width buttons in a column; 'grid' switches to two columns when there are 4 or more providers; 'icon-only' renders square icon buttons in a row. Default: 'stacked'." },
      { name: "showDivider", type: "boolean", default: "true", description: "Show an 'or' divider above the buttons. Default: true." },
      { name: "returnTo", type: "string", description: "URL appended as `return_to` on the OAuth redirect. Defaults to `window.location.href` at click time (falls back to '/' in SSR)." },
      { name: "baseOAuthPath", type: "string", default: "'/auth'", description: "Base path for the Express OAuth middleware. Default: '/auth'. Pass a full origin for cross-origin setups (e.g. 'https://auth.example.com/auth')." },
      { name: "renderButton", type: "(provider: IdentityProvider) => React.ReactNode | null", description: "Custom render function for each provider button. Return null to fall back to default rendering." },
      { name: "onProviderClick", type: "(provider: IdentityProvider, url: string) => boolean | void", description: "Called before navigating to the OAuth URL. Return false to cancel navigation (useful in tests or analytics)." },
      { name: "messages", type: "AuthSocialButtonsMessageOverrides", description: "Deep-partial message overrides. Top-level keys override UI copy; the nested `errors` map overrides backend error-code messages by UPPER_SNAKE_CASE key." },
      { name: "onError", type: "(err: unknown) => void", description: "Called when the identity-providers query fails." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Structured event emitter. Fires 'error' when the query fails and 'info' with key 'noProviders' when the resolved list is empty." },
      { name: "className", type: "string", description: "Extra class names applied to the root wrapper div." },
    ],
    messages: defaultAuthSocialButtonsMessages,
    requires: authSocialButtonsRequires as RequiresJson,
  },
  'auth-social-providers-grid': {
    props: [
      { name: "mode", type: "'sign-in' | 'sign-up'", default: "'sign-in'", description: "Controls button label template — \"Sign in with …\" vs \"Sign up with …\" — and the divider text." },
      { name: "providers", type: "string[]", description: "Static slug list (e.g. `['google', 'github']`). When set, the DB query inside `auth-social-buttons` is skipped entirely." },
      { name: "layout", type: "'stacked' | 'grid' | 'icon-only'", default: "'stacked'", description: "Button layout passed through to `auth-social-buttons`." },
      { name: "showLastUsed", type: "boolean", default: "true", description: "Show a \"Last used\" badge on the previously-authenticated provider. Reads/writes `cnc_last_auth_provider` in `localStorage`." },
      { name: "showDivider", type: "boolean", default: "true", description: "Render the outer \"or\" divider above the button group (the inner `auth-social-buttons` divider is suppressed)." },
      { name: "returnTo", type: "string", description: "URL appended as `?return_to=` on the OAuth redirect. Defaults to `window.location.href` at click time." },
      { name: "onProviderClick", type: "(provider: IdentityProvider, url: string) => boolean | void", description: "Intercept seam called before OAuth navigation. Return `false` to cancel. The block writes the last-used entry to `localStorage` here before delegating." },
      { name: "messages", type: "SocialProvidersGridMessageOverrides", description: "Partial message overrides — `dividerText`, `lastUsedBadge`, `signInWith`, `signUpWith`, and per-code `errors`." },
    ],
    messages: defaultSocialProvidersGridMessages,
  },
  'auth-invitation-acceptance-card': {
    props: [
      { name: "token", type: "string", required: true, description: "The invitation token from the URL (required for the mutation call)." },
      { name: "kind", type: "'app' | 'org'", default: "'app'", description: "App-level or org-level invite; drives which mutation is called and which UI sections render." },
      { name: "inviter", type: "UserAvatarUser | null", description: "Optional inviter user record; shown in the org invite card beneath the org avatar." },
      { name: "org", type: "UserAvatarUser | null", description: "Optional org user record; required when kind is 'org' to show the org avatar and name." },
      { name: "role", type: "string | null", description: "Human-readable role label (e.g. \"Member\", \"Admin\") shown as a badge on org invites." },
      { name: "onSubmit", type: "(input: { token: string; kind: 'app' | 'org' }) => Promise<InviteAcceptResult>", description: "Override seam — fully replaces the generated mutation calls. Resolves to InviteAcceptResult; throw to surface an error." },
      { name: "onSuccess", type: "(result: InviteAcceptResult) => void", description: "Fires after acceptance (both accepted and pending-approval paths). Use to navigate." },
      { name: "onDecline", type: "() => void", description: "Fires when the Decline button is clicked. Caller is responsible for navigating away." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for success, mapped errors, and non-fatal branches." },
    ],
    messages: defaultInvitationAcceptanceMessages,
    requires: authInvitationAcceptanceCardRequires as RequiresJson,
  },
  'auth-invitation-acceptance-page': {
    props: [
      { name: "messages", type: "InvitationAcceptanceMessageOverrides", description: "Deep-partial override for every UI string the page and its composed card render — titles, descriptions, button labels, and error-code messages." },
      { name: "className", type: "string", description: "Extra Tailwind classes added to the outer <main> element. The page already sets min-h-svh, flex, centering, and bg-background." },
    ],
    requires: authInvitationAcceptancePageRequires as RequiresJson,
  },
  'auth-account-deletion-confirm-page': {
    props: [
      { name: "token", type: "string", required: true, description: "Deletion token from the `?token=` URL query param." },
      { name: "userId", type: "string", required: true, description: "User id from the `?user_id=` URL query param." },
      { name: "redirectTo", type: "string", default: "'/auth/sign-in'", description: "Path to redirect to after successful deletion." },
      { name: "accountSettingsHref", type: "string", default: "'/account/settings'", description: "Href for the 'Go to account settings' CTA shown on the expired-token state." },
      { name: "onSubmit", type: "(vars: { userId: string; token: string }) => Promise<boolean | null>", description: "Override seam — replaces the generated `useConfirmDeleteAccountMutation` call. Return `true` for success, `false`/`null` for invalid, or throw with `extensions.code` of `DELETION_TOKEN_EXPIRED` for the expired state." },
      { name: "onSuccess", type: "(result: { userId: string }) => void", description: "Fires after successful deletion, before the redirect timer fires." },
      { name: "onExpired", type: "() => void", description: "Fires when the server returns an expired-token error code." },
      { name: "onInvalid", type: "() => void", description: "Fires when the token is invalid or has already been used." },
      { name: "onMessage", type: "(event: { kind: string; key: string; message?: string }) => void", description: "Notification seam — fires for every outcome branch (success, errors, and non-fatal branches)." },
    ],
    messages: defaultAccountDeletionConfirmMessages,
    requires: authAccountDeletionConfirmPageRequires as RequiresJson,
  },
  'auth-magic-link-sent-page': {
    props: [
      { name: "onSubmit", type: "(vars: RequestMagicLinkVars) => Promise<null>", description: "Override seam for the resend action. Required until request_magic_link ships. Default stub throws PROCEDURE_NOT_FOUND." },
      { name: "onSuccess", type: "(result: null) => void", description: "Fires after a successful resend." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped error from the resend attempt." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for both success and errors." },
      { name: "messages", type: "MagicLinkSentPageMessageOverrides", description: "Override any UI copy or error message strings, including nested errors map." },
      { name: "className", type: "string", description: "Extra class names applied to the outermost `<main>` element." },
    ],
    messages: defaultMagicLinkSentPageMessages,
    requires: authMagicLinkSentPageRequires as RequiresJson,
  },
  'auth-magic-link-callback-page': {
    props: [
      { name: "onSubmit", type: "(vars: { token: string; credentialKind: string }) => Promise<MagicLinkSignInResult | null>", description: "Replace the default SDK mutation. Required while the backend procedure is pending. Return a MagicLinkSignInResult for success, null for invalid token, or throw with extensions.code EXPIRED_TOKEN for expired." },
      { name: "onSuccess", type: "(result: MagicLinkSignInResult) => void", description: "Fires after a successful sign-in, before the router redirect." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped error (expired, invalid, unknown)." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for success, warnings, and errors." },
      { name: "messages", type: "MagicLinkCallbackPageMessageOverrides", description: "Override any UI copy strings or error messages. Deep-partial: override individual keys without restating the full object." },
      { name: "className", type: "string", description: "Extra class names applied to the root wrapper div." },
    ],
    messages: defaultMagicLinkCallbackPageMessages,
    requires: authMagicLinkCallbackPageRequires as RequiresJson,
  },
  'auth-account-profile-card': {
    props: [
      { name: "user", type: "AccountProfileUser", description: "Current user (id, type, displayName, profilePicture). When omitted the block calls `useCurrentUserQuery`." },
      { name: "defaultValues", type: "{ displayName?: string; profilePicture?: ImageJsonb | null }", description: "Pre-populate form fields. Falls back to `user` when not set." },
      { name: "onSubmit", type: "(input: UpdateProfileInput) => Promise<UpdateProfileResult>", description: "Override seam — fully replaces the generated `useUpdateUserMutation` call. Pass `profilePictureUpload: File` for new-picture uploads." },
      { name: "onSuccess", type: "(result: UpdateProfileResult) => void", description: "Fires after a successful save." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped GraphQL error." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for all outcomes including upload progress." },
      { name: "maxFileSize", type: "number", default: "5_000_000", description: "Max profile-picture file size in bytes." },
      { name: "acceptedImageTypes", type: "string[]", default: "['image/jpeg','image/png','image/webp']", description: "Accepted MIME types for the file picker." },
      { name: "messages", type: "AccountProfileCardMessageOverrides", description: "Deep-partial message overrides — top-level copy keys and nested `errors` map keyed by UPPER_SNAKE_CASE error code." },
      { name: "className", type: "string", description: "Additional class names on the root Card element." },
    ],
    messages: defaultAccountProfileCardMessages,
    requires: authAccountProfileCardRequires as RequiresJson,
  },
  'auth-account-security-card': {
    props: [
      { name: "onChangePassword", type: "() => void", description: "Fires when the user clicks the change-password or set-password button. The button is hidden when this prop is omitted." },
      { name: "onManageMfa", type: "() => void", description: "Fires when the user clicks the Enable or Manage button in the MFA row. The button is hidden when this prop is omitted." },
      { name: "onManagePasskeys", type: "() => void", description: "Fires when the user clicks the Manage passkeys button. The button is hidden when this prop is omitted." },
      { name: "adapter", type: "{ webauthnCredentials: { totalCount: number } } | (() => Promise<{ webauthnCredentials: { totalCount: number } }>)", description: "Replaces the generated `useWebauthnCredentialsQuery` call. Pass a static object for immediate data or an async factory for dynamic data — useful for non-Constructive backends, tests, and Storybook." },
      { name: "messages", type: "AccountSecurityCardMessageOverrides", description: "Partial override for any UI copy string. The nested `errors` map accepts `UNKNOWN_ERROR` keys for localised error messages." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires when the passkey-count query fails with a normalised error shape." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for every event including query errors." },
      { name: "className", type: "string", description: "Extra class names applied to the root Card element." },
    ],
    messages: defaultAccountSecurityCardMessages,
    requires: authAccountSecurityCardRequires as RequiresJson,
  },
  'auth-account-danger-card': {
    props: [
      { name: "messages", type: "AccountDangerCardMessageOverrides", default: "defaultAccountDangerCardMessages", description: "Partial overrides for all UI copy and error messages." },
      { name: "onSubmit", type: "() => Promise<void>", description: "Replaces the default useSendAccountDeletionEmailMutation call. Resolves void on success; throw to surface an error." },
      { name: "onDeletionEmailSent", type: "() => void", description: "Fires after the deletion email mutation resolves successfully." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after any mapped error (mutation or step-up failure)." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for success, mapped errors, and step-up cancellation." },
      { name: "className", type: "string", description: "Extra class names applied to the outer Card element." },
    ],
    messages: defaultAccountDangerCardMessages,
    requires: authAccountDangerCardRequires as RequiresJson,
  },
  'auth-account-sessions-list': {
    props: [
      { name: "sessions", type: "SessionRow[]", default: "[]", description: "Host-supplied list of active sessions. Defaults to [] (renders empty state). No generated list hook exists — the host must supply rows." },
      { name: "onRevokeSubmit", type: "(vars: RevokeSessionVars) => Promise<RevokeSessionResult | null>", description: "Override for the default useRevokeSessionMutation call. Must throw on failure to surface AuthErrorAlert; returning null is treated as success." },
      { name: "onSessionRevoked", type: "(sessionId: string) => void", description: "Fires after a single session is successfully revoked. Use to remove the session from local state." },
      { name: "onAllOtherSessionsRevoked", type: "() => void", description: "Fires after all non-current sessions are successfully revoked." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires for every mapped error regardless of where it originated." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam for success, mapped errors, and step-up events." },
      { name: "messages", type: "AccountSessionsListMessageOverrides", description: "Deep-partial message overrides. Override any UI copy or error code message without restating the full catalog." },
      { name: "className", type: "string", description: "Extra CSS class applied to the outer Card element." },
    ],
    messages: defaultAccountSessionsListMessages,
    requires: authAccountSessionsListRequires as RequiresJson,
  },
  'auth-account-api-keys-list': {
    props: [
      { name: "keys", type: "ApiKeyRow[]", default: "[]", description: "The list of API keys to display. No generated hook exists for `user_api_keys`; the host must supply rows. Default empty array renders the empty state." },
      { name: "maxKeys", type: "number", description: "Maximum number of API keys allowed. When `keys.length >= maxKeys` the Create button is disabled and a cap notice appears." },
      { name: "onRevokeSubmit", type: "(vars: RevokeApiKeyVars) => Promise<RevokeApiKeyResult | null>", description: "Override seam — fully replaces the generated `useRevokeApiKeyMutation` call. Return `{ result: true }` on success or throw to surface an error." },
      { name: "onKeyRevoked", type: "(keyId: string) => void", description: "Fires after a key is successfully revoked. Use to refresh the caller's key list." },
      { name: "onKeyCreated", type: "(result: ApiKeyCreatedResult) => void", description: "Fires after `auth-api-key-create-dialog` succeeds. Use to refresh the caller's key list." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for success and mapped errors on both revoke and create paths." },
      { name: "messages", type: "AccountApiKeysListMessageOverrides", description: "Deep-partial copy overrides. Top-level keys override UI strings; nested `errors` map overrides error-code messages by UPPER_SNAKE_CASE key." },
      { name: "className", type: "string", description: "Extra class names applied to the wrapping `Card`." },
    ],
    messages: defaultAccountApiKeysListMessages,
    requires: authAccountApiKeysListRequires as RequiresJson,
  },
  'auth-account-connected-accounts': {
    props: [
      { name: "connectedAccounts", type: "ConnectedAccountRow[]", default: "[]", description: "Pre-fetched list of linked OAuth account rows. When omitted, the block renders an empty list." },
      { name: "providers", type: "IdentityProvider[]", default: "[]", description: "Static list of configured identity providers. Providers absent from connectedAccounts are shown as 'not connected' with a Connect link." },
      { name: "oauthRedirectBase", type: "string", default: "/auth/social", description: "Base URL for initiating an OAuth connection flow. The block appends ?provider=<slug>&action=connect." },
      { name: "onSubmitDisconnect", type: "(vars: DisconnectAccountVars) => Promise<DisconnectAccountResult>", description: "Override for the disconnect mutation. Receives { accountId } and must return { success: boolean }. Replaces the generated useDisconnectAccountMutation call." },
      { name: "onAccountDisconnected", type: "(accountId: string, provider: string) => void", description: "Fires after a successful disconnect with the removed account id and provider slug." },
      { name: "onAccountConnected", type: "(provider: string) => void", description: "Fires when the host signals a successful OAuth connection back to the block." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after any mapped error." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam for both success and error events." },
      { name: "messages", type: "AccountConnectedAccountsMessageOverrides", description: "Optional message overrides for all UI strings (labels, toasts, error messages)." },
      { name: "className", type: "string", description: "Additional CSS classes for the outer card." },
    ],
    messages: defaultAccountConnectedAccountsMessages,
    requires: authAccountConnectedAccountsRequires as RequiresJson,
  },
  'auth-account-phones-list': {
    props: [
      { name: "onSubmitAdd", type: "(cc: string, number: string) => Promise<PhoneRow>", required: true, description: "Required override: creates the phone row and sends the OTP in one call. Returns the created PhoneRow." },
      { name: "onSubmitSendOtp", type: "(cc: string, number: string) => Promise<void>", description: "Override for sending/resending the OTP to an existing unverified phone. Backend-pending seam." },
      { name: "onSubmitVerifyOtp", type: "(phoneE164: string, otp: string) => Promise<PhoneRow>", description: "Override for verifying the 6-digit OTP. Returns the updated PhoneRow on success. Backend-pending seam." },
      { name: "onSubmitSetPrimary", type: "(phoneId: string) => Promise<PhoneRow>", description: "Override for promoting a verified phone to primary. Falls back to `useUpdatePhoneNumberMutation`." },
      { name: "onSubmitDelete", type: "(phoneId: string) => Promise<void>", description: "Override for deleting a non-primary phone number. Falls back to `useDeletePhoneNumberMutation`." },
      { name: "defaultCountry", type: "string", default: "'+1'", description: "Default country calling code for the add-phone picker. Default: '+1'." },
      { name: "maxPhones", type: "number", default: "5", description: "Maximum number of phone numbers the user can add. Hides the Add button when reached. Default: 5." },
      { name: "readOnly", type: "boolean", default: "false", description: "Disables all add/delete/primary actions and renders the list in display-only mode." },
      { name: "onPhoneAdded", type: "(phone: PhoneRow) => void", description: "Fires after a new phone row is created and OTP sent." },
      { name: "onPhoneVerified", type: "(phone: PhoneRow) => void", description: "Fires after OTP is verified successfully." },
      { name: "onPrimaryChanged", type: "(phone: PhoneRow) => void", description: "Fires after a phone is promoted to primary." },
      { name: "onPhoneDeleted", type: "(phoneId: string) => void", description: "Fires after a phone is deleted." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for success, mapped errors, and info events." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped error. Always fires alongside onMessage for error events." },
      { name: "messages", type: "AccountPhonesListMessageOverrides", description: "Partial overrides for all UI strings (labels, button text, error messages)." },
      { name: "className", type: "string", description: "Additional CSS classes for the outer Card element." },
    ],
    messages: defaultAccountPhonesListMessages,
    requires: authAccountPhonesListRequires as RequiresJson,
  },
  'auth-account-settings-page': {
    props: [
      { name: "sections", type: "AccountSettingsSection[]", description: "Which sections to render. Omit sections the host app does not need without forking the page. Defaults to all eight sections." },
      { name: "allowApiKeys", type: "boolean", default: "true", description: "Feature flag — when false, the api-keys tab is removed from the tab list." },
      { name: "onDeletionEmailSent", type: "() => void", description: "Called after account-deletion email is sent. Route to a sign-out or confirmation page." },
      { name: "onChangePassword", type: "() => void", description: "Passed through to auth-account-security-card. Route to the change-password flow." },
      { name: "onManagePasskeys", type: "() => void", description: "Passed through to auth-account-security-card. Route to the passkeys management page." },
      { name: "onManageMfa", type: "() => void", description: "Passed through to auth-account-security-card. When undefined, the MFA management CTA is hidden (backend-pending in v1)." },
      { name: "messages", type: "Partial<AccountSettingsPageMessages>", description: "Override any page-level copy: tab labels, page title, skip-to-content link." },
      { name: "className", type: "string", description: "Extra classes for the outer container (default: `w-full max-w-4xl mx-auto px-4 py-8`)." },
    ],
    messages: defaultAccountSettingsPageMessages,
    requires: authAccountSettingsPageRequires as RequiresJson,
  },
  'auth-change-password-form': {
    props: [
      { name: "onSubmit", type: "(input: ChangePasswordInput) => Promise<boolean>", description: "Override seam — fully replaces the generated useSetPasswordMutation call. Return true for success, false to surface the INVALID_CREDENTIALS error." },
      { name: "requireStepUp", type: "boolean", default: "true", description: "Gate submission behind a step-up re-verification dialog (tier: medium). Set to false when the session was just authenticated." },
      { name: "showPasswordStrength", type: "boolean", default: "true", description: "Show the inline strength progress bar beneath the new-password field." },
      { name: "onSuccess", type: "(result: ChangePasswordResult) => void", description: "Fires after a successful password update." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped error with the resolved code and message." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for every success and mapped error event." },
      { name: "messages", type: "ChangePasswordFormMessageOverrides", description: "Partial message overrides for all UI copy and UPPER_SNAKE_CASE error codes." },
      { name: "className", type: "string", description: "Extra class names merged onto the root div." },
    ],
    messages: defaultChangePasswordFormMessages,
    requires: authChangePasswordFormRequires as RequiresJson,
  },
  'auth-api-key-create-dialog': {
    props: [
      { name: "open", type: "boolean", required: true, description: "Controls dialog visibility (parent-owned)." },
      { name: "onOpenChange", type: "(open: boolean) => void", required: true, description: "Called when the dialog requests an open-state change (cancel or overlay click)." },
      { name: "onSuccess", type: "(result: ApiKeyCreatedResult) => void", required: true, description: "Fires after successful creation with keyId, rawKey, name, and expiresAt. Parent should close this dialog and open auth-api-key-created-modal." },
      { name: "onSubmit", type: "(input: ApiKeyCreateInput) => Promise<ApiKeyCreatedResult>", description: "Override seam — fully replaces the generated useCreateApiKeyMutation call. Receives raw form values after step-up succeeds." },
      { name: "accessLevelOptions", type: "AccessLevelOption[]", default: "[read, write, admin]", description: "Available access-level choices rendered in the select. Each entry is { value, label }." },
      { name: "mfaLevelOptions", type: "MfaLevelOption[]", default: "[none, required]", description: "Available MFA-requirement choices. Each entry is { value, label }." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped mutation or step-up error." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for step-up events and errors." },
      { name: "messages", type: "ApiKeyCreateDialogMessageOverrides", description: "Shallow-partial copy overrides; nested errors map accepts UNKNOWN_ERROR and expiresInOptions accepts per-preset labels." },
    ],
    messages: defaultApiKeyCreateDialogMessages,
    requires: authApiKeyCreateDialogRequires as RequiresJson,
  },
  'auth-api-key-created-modal': {
    props: [
      { name: "open", type: "boolean", required: true, description: "Controls dialog visibility. Set to true immediately after a key-creation mutation resolves." },
      { name: "onOpenChange", type: "(open: boolean) => void", required: true, description: "Called when the dialog requests a state change. Escape and overlay-click are blocked until the user acknowledges." },
      { name: "apiKey", type: "string", required: true, description: "The raw API key string (e.g. `cnc_live_sk_...`). Lives only in React state — never stored in the DOM or sent to the backend." },
      { name: "keyName", type: "string", required: true, description: "Human-readable name of the key, shown in the modal heading context." },
      { name: "expiresAt", type: "string | null", default: "undefined", description: "Optional ISO-8601 expiry timestamp. Renders a `secondary` badge with the formatted date, or an `outline` badge reading *Never* when omitted." },
      { name: "onDismissed", type: "() => void", description: "Fires after the user checks the acknowledgement and clicks Done. Use this to discard the raw key from parent state." },
      { name: "messages", type: "Partial<ApiKeyCreatedModalMessages>", description: "Shallow-merged message overrides for all UI copy: title, warning text, labels, button labels, copy-error fallback." },
    ],
    messages: defaultApiKeyCreatedModalMessages,
  },
  'auth-passkey-management-list': {
    props: [
      { name: "queryCredentials", type: "() => Promise<WebAuthnCredential[]>", description: "Override seam for the credential list query. Replaces the generated `useWebauthnCredentialsQuery` call entirely." },
      { name: "onRename", type: "(input: { credentialId: string; name: string }) => Promise<void>", description: "Override seam for renaming a credential. Called without a prior step-up challenge." },
      { name: "onDelete", type: "(input: { credentialId: string }) => Promise<void>", description: "Override seam for deleting a credential. Called AFTER the block has completed the `high`-tier step-up gate." },
      { name: "onSuccess", type: "(event: PasskeyManagementEvent) => void", description: "Fires on every successful rename or delete with a typed event object (`type: 'renamed' | 'deleted'`)." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped rename or delete error." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Structured notification seam — fires for every outcome including mapped error codes." },
      { name: "messages", type: "PasskeyManagementListMessageOverrides", description: "Deep-partial copy overrides. Top-level keys are UI strings; nested `errors` map accepts `RENAME_FAILED`, `DELETE_FAILED`, `UNKNOWN_ERROR`." },
      { name: "className", type: "string", description: "Extra class names applied to the outer Card element." },
    ],
    messages: defaultPasskeyManagementListMessages,
    requires: authPasskeyManagementListRequires as RequiresJson,
  },
  'auth-passkey-enroll': {
    props: [
      { name: "userId", type: "string", required: true, description: "The authenticated user's ID. Required for the begin-registration call." },
      { name: "enabled", type: "boolean", default: "auto (window.PublicKeyCredential)", description: "Set to `false` to hide the card entirely (e.g. when a feature flag is off). Defaults to auto-detecting WebAuthn support in the browser." },
      { name: "onSubmit", type: "(input: PasskeyEnrollInput) => Promise<PasskeyEnrollResult>", description: "Override seam — replaces the full begin/browser/finish ceremony. Receives `{ credentialName, userId }` and must resolve to `{ credentialId, credentialName }`." },
      { name: "onSuccess", type: "(result: PasskeyEnrollResult) => void", description: "Fires after the credential is registered successfully." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after error mapping, including `BROWSER_ABORT` when the user dismisses the native dialog." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for every outcome including the pre-prompt `browser_prompt_shown` info event." },
      { name: "beginEndpoint", type: "string", default: "'/api/auth/passkey/begin-registration'", description: "Middleware POST endpoint for begin-registration. Ignored when `onSubmit` is provided." },
      { name: "messages", type: "PasskeyEnrollMessageOverrides", description: "Shallow-partial override for UI copy and per-code error strings (`ALREADY_REGISTERED`, `CHALLENGE_FAILED`, `UNKNOWN_ERROR`)." },
    ],
    messages: defaultPasskeyEnrollMessages,
    requires: authPasskeyEnrollRequires as RequiresJson,
  },
  'auth-passkey-sign-in': {
    props: [
      { name: "onSubmit", type: "(vars: PasskeySignInVars) => Promise<PasskeySignInResult>", description: "Override seam — replaces the full begin/browser/finish ceremony. Required until backend procedures deploy." },
      { name: "variant", type: "'button' | 'icon'", default: "'button'", description: "Full-width labeled button or compact icon-only button." },
      { name: "stepUpMode", type: "boolean", default: "false", description: "Changes the button label to messages.signInButtonStepUp for re-authentication flows." },
      { name: "userId", type: "string | null", description: "Restricts the WebAuthn challenge to this user's credentials. Omit for a usernameless discoverable-credential flow." },
      { name: "conditionalUI", type: "boolean", default: "false", description: "Activates browser autofill passkey picker on mount. Automatically disabled when userId or onSubmit is provided." },
      { name: "beginEndpoint", type: "string", description: "Middleware URL for the WebAuthn begin-assertion step. Required when onSubmit is not provided." },
      { name: "finishEndpoint", type: "string", description: "Middleware URL for the WebAuthn finish-assertion step. Required when onSubmit is not provided." },
      { name: "onSuccess", type: "(result: PasskeySignInResult) => void", description: "Fires after a successful sign-in. Use to navigate or update auth state." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for success, mapped errors, and conditional-UI lifecycle events." },
      { name: "messages", type: "PasskeySignInMessageOverrides", description: "Deep-partial message overrides. Top-level keys override UI copy; nested errors map overrides backend error-code messages by UPPER_SNAKE_CASE key." },
    ],
    messages: defaultPasskeySignInMessages,
    requires: authPasskeySignInRequires as RequiresJson,
  },
  'auth-mfa-totp-enroll': {
    props: [
      { name: "onSubmit", type: "() => Promise<{ qrUrl: string; manualKey: string }>", required: true, description: "Replaces `enableTotp` — called on mount to obtain the QR URL and manual entry key. Required until backend procedures are deployed." },
      { name: "onConfirm", type: "(totpCode: string) => Promise<boolean>", required: true, description: "Replaces `confirmTotpSetup` — receives the 6-digit TOTP code. Return `false` to surface an INVALID_TOTP error." },
      { name: "onGenerateCodes", type: "() => Promise<string[]>", required: true, description: "Replaces `generateBackupCodes` — called after successful confirmation. Failure is handled gracefully; TOTP stays enabled." },
      { name: "onSuccess", type: "(result: MfaTotpEnrollResult) => void", description: "Fires when the user completes all three steps and confirms they have saved their backup codes. `result.backupCodes` is the array returned by `onGenerateCodes`." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Called whenever any step surfaces an error (setup, verification, or code generation)." },
      { name: "messages", type: "MfaTotpEnrollMessageOverrides", description: "Shallow partial override for UI copy. Override individual `errors` codes (e.g. `RATE_LIMITED`, `INVALID_TOTP`) without restating the full map." },
      { name: "className", type: "string", description: "Additional CSS class applied to the outer Card (steps 1–2) or wrapper div (step 3)." },
    ],
    messages: defaultMfaTotpEnrollMessages,
    requires: authMfaTotpEnrollRequires as RequiresJson,
  },
  'auth-mfa-totp-challenge': {
    props: [
      { name: "challengeToken", type: "string", required: true, description: "The mfa_challenge_token returned by sign_in when mfaRequired is true. Required." },
      { name: "onSubmit", type: "(vars: MfaTotpChallengeVars) => Promise<MfaChallengeResult>", description: "Primary submission seam. In v1 this is the required path — wire it to your complete_mfa_challenge implementation. Once the generated hook lands, the block can fall back to it automatically." },
      { name: "onSuccess", type: "(result: MfaChallengeResult) => void", description: "Fires after the challenge resolves with a valid session. Use it to redirect or hydrate auth state." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after any mapped error (INVALID_TOTP, EXPIRED_TOKEN, RATE_LIMITED, etc.)." },
      { name: "showTrustDevice", type: "boolean", default: "true", description: "Controls visibility of the 'Trust this device for 30 days' checkbox. Defaults to `true`." },
      { name: "mfaMethod", type: "string", default: "'totp'", description: "The mfa_method to forward to complete_mfa_challenge. Defaults to `'totp'`." },
      { name: "messages", type: "MfaTotpChallengeMessageOverrides", description: "Deep-partial message overrides. Top-level keys replace UI copy; nested `errors` keys override individual error codes so you can localize a single code without restating the whole map." },
    ],
    messages: defaultMfaTotpChallengeMessages,
    requires: authMfaTotpChallengeRequires as RequiresJson,
  },
  'auth-mfa-totp-challenge-page': {
    props: [
      { name: "onSubmit", type: "(vars: MfaTotpChallengeVars) => Promise<MfaChallengeResult>", default: "undefined (throws PROCEDURE_NOT_FOUND until procedure ships)", description: "Override seam passed through to the inner MfaTotpChallenge card. Wire before `complete_mfa_challenge` is deployed in the SDK, or for testing." },
      { name: "messages", type: "MfaTotpChallengePageMessageOverrides", description: "Partial overrides for the page's own error-state copy: `missingTokenTitle`, `missingTokenDescription`, `missingTokenCta`, `expiredTokenTitle`, `expiredTokenDescription`, `expiredTokenCta`." },
      { name: "className", type: "string", description: "Extra class names applied to the `<main>` wrapper. Useful to adjust min-height or padding when embedding in a custom shell." },
    ],
    messages: defaultMfaTotpChallengePageMessages,
  },
  'auth-mfa-totp-disable-confirm': {
    props: [
      { name: "open", type: "boolean", required: true, description: "Controlled open state of the dialog." },
      { name: "onOpenChange", type: "(open: boolean) => void", required: true, description: "Called when the dialog requests an open-state change (cancel button or overlay click)." },
      { name: "onSubmit", type: "() => Promise<void>", required: true, description: "REQUIRED mutation seam — fires after step-up succeeds. Wire to `disableTotp.mutateAsync({})` once the backend proc ships." },
      { name: "onSuccess", type: "() => void", description: "Fires after a successful disable. Use to invalidate queries or update local state." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped error with the code and display message." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for both success and error events. Wire to your toast system." },
      { name: "messages", type: "MfaTotpDisableConfirmMessageOverrides", default: "defaultMfaTotpDisableConfirmMessages", description: "Deep-partial message overrides — customize any UI copy or individual error code messages." },
    ],
    messages: defaultMfaTotpDisableConfirmMessages,
    requires: authMfaTotpDisableConfirmRequires as RequiresJson,
  },
  'auth-mfa-backup-codes-display': {
    props: [
      { name: "codes", type: "string[]", required: true, description: "The backup codes to display — passed in by the caller (e.g. from a generate_backup_codes mutation)." },
      { name: "requireConfirmation", type: "boolean", default: "true", description: "When true (default), renders an 'I have saved these codes' checkbox that must be checked before the Continue button is enabled." },
      { name: "onConfirm", type: "() => void", description: "Fires when the user clicks Continue after confirming. Use to advance to the next step in the enrolment flow." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires with kind 'success' and key 'backupCodes.confirmed' when the user confirms." },
      { name: "messages", type: "MfaBackupCodesDisplayMessageOverrides", description: "Override any UI copy: title, description, warningText, button labels, checkbox label, or error strings." },
      { name: "className", type: "string", description: "Extra class names forwarded to the outer Card element." },
    ],
    messages: defaultMfaBackupCodesDisplayMessages,
  },
  'auth-mfa-backup-codes-regenerate': {
    props: [
      { name: "open", type: "boolean", required: true, description: "Controlled open state for the dialog." },
      { name: "onOpenChange", type: "(open: boolean) => void", required: true, description: "Called when the dialog requests a close (cancel, X button, or after codes are confirmed)." },
      { name: "onSubmit", type: "() => Promise<MfaBackupCodesRegenerateResult>", required: true, description: "Required adapter seam — fires after step-up succeeds. Must resolve to `{ codes: string[] }`. BACKEND-PENDING: wire the generated `useGenerateBackupCodesMutation` once the proc ships." },
      { name: "onSuccess", type: "(result: MfaBackupCodesRegenerateResult) => void", description: "Fires after the user confirms they have saved the new codes. Always fires on the happy path." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped GraphQL error (e.g. UNKNOWN_ERROR). Always fires alongside onMessage." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for success and all mapped errors. Wire to a toast system." },
      { name: "messages", type: "MfaBackupCodesRegenerateMessageOverrides", description: "Deep-partial copy overrides. Top-level keys override UI strings; nested `errors` map accepts PROCEDURE_NOT_FOUND and UNKNOWN_ERROR keys." },
      { name: "className", type: "string", description: "Extra class names applied to the inner DialogContent element." },
    ],
    messages: defaultMfaBackupCodesRegenerateMessages,
    requires: authMfaBackupCodesRegenerateRequires as RequiresJson,
  },
  'auth-magic-link-request-card': {
    props: [
      { name: "onSubmit", type: "(vars: MagicLinkRequestVars) => Promise<void>", required: true, description: "Replace the default mutation call. Required until `request_magic_link` ships in the backend SDK; resolving transitions the card to its confirmation panel." },
      { name: "signInHref", type: "string", description: "Href for the \"Back to sign in\" link rendered in the card footer. Omit to hide the link entirely." },
      { name: "defaultEmail", type: "string", description: "Pre-fill the email field, e.g. from a `?email=` query param." },
      { name: "showBackLink", type: "boolean", default: "true", description: "Show or hide the back-to-sign-in footer link. Defaults to `true`; has no effect if `signInHref` is omitted." },
      { name: "onSuccess", type: "(vars: MagicLinkRequestVars) => void", description: "Fires after the resolved request. Use to redirect to the sent-page or emit analytics." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped error. Receives the human-readable message and error code." },
      { name: "messages", type: "MagicLinkRequestCardMessageOverrides", description: "Shallow-partial message overrides for all UI copy and the `errors` map." },
    ],
    messages: defaultMagicLinkRequestCardMessages,
    requires: authMagicLinkRequestCardRequires as RequiresJson,
  },
  'auth-email-otp-request-card': {
    props: [
      { name: "otpType", type: "'sign_in' | 'verify' | 'reset' | 'change_email'", default: "'sign_in'", description: "OTP type discriminator passed to send_email_otp." },
      { name: "defaultEmail", type: "string", description: "Pre-fill the email input (e.g. from a query param)." },
      { name: "showOtpInputInline", type: "boolean", default: "true", description: "When true, renders auth-email-otp-input inline in the code-sent state. Set false when the host handles navigation to code entry." },
      { name: "signInHref", type: "string", description: "Renders a back-to-sign-in link in the card footer when provided." },
      { name: "onSubmit", type: "(vars: EmailOtpRequestVars) => Promise<void>", description: "Required override seam — the only way to wire a real network call until send_email_otp ships in the auth SDK. Resolves void on success; throw to surface an error." },
      { name: "onSuccess", type: "(vars: { email: string }) => void", description: "Fires after the send-OTP call resolves. Use to track analytics or trigger navigation." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped error with the resolved code and message." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for success, mapped errors, and resend events." },
      { name: "messages", type: "EmailOtpRequestCardMessageOverrides", description: "Shallow-partial copy overrides. The nested errors map accepts RATE_LIMITED, CAPTCHA_FAILED, EMAIL_OTP_DISABLED, PROCEDURE_NOT_FOUND, UNKNOWN_ERROR." },
    ],
    messages: defaultEmailOtpRequestCardMessages,
    requires: authEmailOtpRequestCardRequires as RequiresJson,
  },
  'auth-email-otp-input': {
    props: [
      { name: "email", type: "string", required: true, description: "The address the OTP was dispatched to. Shown in the card description and passed to `onVerify` / `onResend`." },
      { name: "onVerify", type: "(email: string, code: string) => Promise<EmailOtpVerifyResult>", default: "throws PROCEDURE_NOT_FOUND", description: "Required until `sign_in_email_otp` ships. Wire to your generated mutation binding. Resolves the verification result; throwing surfaces the mapped error message." },
      { name: "onResend", type: "(email: string) => Promise<void>", default: "throws PROCEDURE_NOT_FOUND", description: "Required until `send_email_otp` ships. Wire to your generated resend mutation. On success the digits are cleared and the countdown timer restarts." },
      { name: "onSuccess", type: "(result: EmailOtpVerifyResult) => void", description: "Called after successful verification. Use to redirect to MFA challenge or the dashboard based on `result.mfaRequired`." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Called after any mapped error. Useful for logging or external error tracking alongside the inline alert." },
      { name: "length", type: "number", default: "6", description: "Number of OTP digit boxes. Defaults to `6`." },
      { name: "resendCooldownSeconds", type: "number", default: "60", description: "Countdown (seconds) before the resend button re-enables after a successful resend. Defaults to `60`." },
      { name: "messages", type: "EmailOtpInputMessageOverrides", description: "Shallow-partial copy overrides. `errors` is separately partial so individual error codes can be localized without restating the full map." },
    ],
    messages: defaultEmailOtpInputMessages,
    requires: authEmailOtpInputRequires as RequiresJson,
  },
  'auth-anonymous-sign-in-button': {
    props: [
      { name: "onSubmit", type: "() => Promise<AnonymousSignInResult>", required: true, description: "Override seam — required until the backend anonymous_sign_in procedure ships. Fully replaces the (pending) generated useAnonymousSignInMutation call." },
      { name: "onSuccess", type: "(result: AnonymousSignInResult) => void", description: "Fires after a resolved anonymous sign-in with the full session result." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped GraphQL error with the code and human-readable message." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for both success and error events." },
      { name: "variant", type: "'default' | 'outline' | 'ghost' | 'link'", default: "'outline'", description: "Button visual variant passed to the underlying Button primitive." },
      { name: "children", type: "React.ReactNode", description: "Custom button label; defaults to 'Continue as guest' from the message catalog." },
      { name: "credentialKind", type: "'bearer' | 'cookie'", default: "'bearer'", description: "Credential kind sent to the API." },
      { name: "rememberMe", type: "boolean", default: "false", description: "Whether to create a persistent session rather than a transient guest session." },
      { name: "messages", type: "AnonymousSignInButtonMessageOverrides", description: "Deep-partial message overrides — localize individual copy keys or a subset of error codes." },
    ],
    messages: defaultAnonymousSignInButtonMessages,
    requires: authAnonymousSignInButtonRequires as RequiresJson,
  },
  'auth-sso-setup-card': {
    props: [
      { name: "orgId", type: "string", required: true, description: "The organization to configure SSO for. Accepted now so hosts need no prop changes when backend integration arrives." },
      { name: "messages", type: "SsoSetupCardMessageOverrides", description: "Shallow-partial overrides for all UI copy strings (title, description, comingSoonHeading, comingSoonBody, protocolsSectionLabel, oidcLabel, samlLabel). Nested `errors` map accepts PROCEDURE_NOT_FOUND and UNKNOWN_ERROR codes." },
      { name: "className", type: "string", description: "Extra class names merged onto the root Card element (default sizing: `w-full max-w-sm mx-auto`)." },
    ],
    messages: defaultSsoSetupCardMessages,
  },
  'auth-sso-sign-in-card': {
    props: [
      { name: "onDomainSubmit", type: "(email: string) => Promise<SsoDomainResult>", description: "Host-wiring seam for domain lookup and SSO redirect. When omitted, the card shows a deferred-state banner." },
      { name: "defaultEmail", type: "string", description: "Pre-fills the work-email field." },
      { name: "signInHref", type: "string", description: "Renders a 'Back to sign in' link in the footer when provided." },
      { name: "onSsoDetected", type: "(result: SsoDomainResult) => void", description: "Fires when domain lookup succeeds; receives the provider id and org name." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after any mapped error (SSO_NOT_CONFIGURED, UNKNOWN_ERROR, etc.)." },
      { name: "onMessage", type: "(event: { kind: string; key: string; message?: string }) => void", description: "Notification seam — fires for success, mapped errors, and non-fatal branches." },
      { name: "messages", type: "AuthSsoSignInCardMessageOverrides", description: "Partial override of any label, placeholder, or error string." },
      { name: "className", type: "string", description: "Extra CSS class added to the root card element." },
    ],
    messages: defaultAuthSsoSignInCardMessages,
  },
  'auth-domain-verification-step': {
    props: [
      { name: "ssoProviderId", type: "string", required: true, description: "The SSO provider UUID this domain is being claimed for. Embedded in the TXT record value." },
      { name: "domain", type: "string", required: true, description: "The domain being verified (e.g. `acme.com`). Used to derive the TXT record name `_constructive-verify.<domain>`." },
      { name: "pollIntervalMs", type: "number", default: "5000", description: "Polling interval in ms (default 5000). Reserved for the v2 live-poll implementation — unused in the current stub." },
      { name: "pollTimeoutMs", type: "number", default: "300000", description: "Max poll duration in ms (default 300000). Reserved for v2 — unused in stub." },
      { name: "onVerified", type: "(ssoProviderId: string) => void", description: "Fires when the domain is successfully verified. Receives the provider ID." },
      { name: "onTimeout", type: "() => void", description: "Fires when the polling duration exceeds `pollTimeoutMs`." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after an error during the verification check." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — surface structured events to the host (toasts, snackbars, etc.)." },
      { name: "messages", type: "AuthDomainVerificationStepMessageOverrides", description: "Shallow-partial override for any UI copy: title, description, labels, status badges, deferred notice." },
      { name: "className", type: "string", description: "Extra class names applied to the root Card element." },
    ],
    messages: defaultAuthDomainVerificationStepMessages,
  },
  'org-create-card': {
    props: [
      { name: "onSubmit", type: "(input: OrgCreateInput) => Promise<OrgCreateResult>", description: "Replaces the default useCreateUserMutation call. Receives displayName, username, profilePicture and must resolve to { org: User }." },
      { name: "onSuccess", type: "(result: OrgCreateResult) => void", description: "Fires after a successful org creation with the newly created org User." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires on any submission error with a normalized code and message." },
      { name: "showLogoStep", type: "boolean", default: "true", description: "Whether to show the logo-upload step (step 2). Defaults to true." },
      { name: "defaultName", type: "string", description: "Initial value pre-filled in the organization name field." },
      { name: "messages", type: "OrgCreateCardMessageOverrides", description: "Override any default copy. Nested errors map keys are backend error codes (e.g. PERMISSION_DENIED, USERNAME_TAKEN)." },
      { name: "onMessage", type: "(event: { kind: string; key: string; message?: string }) => void", description: "Receives structured events so a host can route them to a toast system." },
      { name: "className", type: "string", description: "Additional CSS class on the outer Card element." },
    ],
    messages: defaultOrgCreateCardMessages,
    requires: orgCreateCardRequires as RequiresJson,
  },
  'org-settings-form': {
    props: [
      { name: "orgId", type: "string", required: true, description: "The organization's account ID. Used to fetch current settings via useUserQuery and passed to onDeleteSubmit." },
      { name: "onSubmit", type: "(input: OrgSettingsInput) => Promise<OrgSettingsResult>", description: "Adapter override for the settings save. Replaces useUpdateUserMutation. Receives { displayName, username, profilePicture? } and must resolve to { id, displayName, username, profilePicture }." },
      { name: "onSaveSuccess", type: "(result: OrgSettingsResult) => void", description: "Fires after a successful settings save with the resolved result." },
      { name: "onDeleteSubmit", type: "(orgId: string) => Promise<void>", description: "Primary path for org deletion. Step-up (tier 'high') is invoked inside the block before this prop fires. Required for the Delete button to be enabled." },
      { name: "onDeleteSuccess", type: "() => void", description: "Fires after the org is successfully deleted. Caller should navigate the user away from org-scoped pages." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires for every mapped error with the message and code key." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam for success toasts, mapped errors, and informational events." },
      { name: "messages", type: "OrgSettingsFormMessageOverrides", description: "Optional partial overrides for all display strings (labels, placeholders, error messages, button text)." },
      { name: "className", type: "string", description: "Additional CSS class names applied to the root wrapper element." },
    ],
    messages: defaultOrgSettingsFormMessages,
    requires: orgSettingsFormRequires as RequiresJson,
  },
  'org-members-list': {
    props: [
      { name: "orgId", type: "string", required: true, description: "The org user-id (type=organization). Passed to the default useOrgMembershipsQuery." },
      { name: "viewerIsOwner", type: "boolean", default: "false", description: "When true, the viewer can remove members and see the transfer-ownership button." },
      { name: "viewerIsAdmin", type: "boolean", default: "false", description: "When true (with viewerIsOwner false), the viewer can remove non-owner members but cannot transfer ownership." },
      { name: "adapter", type: "() => { members: OrgMember[]; isLoading: boolean; error: unknown }", description: "Override seam — replaces the useOrgMembershipsQuery call entirely. Use for testing or non-Constructive backends." },
      { name: "onRemoveMember", type: "(membershipId: string) => Promise<void>", description: "Override for the delete-membership mutation. Gates step-up (medium for members, high for admins)." },
      { name: "onRoleChange", type: "(membershipId: string, profileId: string | null) => Promise<void>", description: "Override for the role-update mutation. Shown only when roleProfiles are provided and viewer can manage." },
      { name: "onTransferOwnership", type: "(membershipId: string) => Promise<void>", description: "Backend-pending seam. When absent, the transfer button is hidden (graceful degradation)." },
      { name: "roleProfiles", type: "Array<{ id: string; label: string }>", description: "When provided, renders an inline role selector for non-owner members." },
      { name: "pageSize", type: "number", default: "25", description: "Number of members to fetch per page." },
      { name: "messages", type: "OrgMembersListMessageOverrides", description: "Deep-partial copy overrides. Top-level keys override UI strings; nested errors map keys by UPPER_SNAKE_CASE error code." },
    ],
    messages: defaultOrgMembersListMessages,
    requires: orgMembersListRequires as RequiresJson,
  },
  'org-invite-dialog': {
    props: [
      { name: "orgId", type: "string", required: true, description: "The organization's account ID. Required." },
      { name: "open", type: "boolean", description: "Whether the dialog is open. Controlled by parent." },
      { name: "onOpenChange", type: "(open: boolean) => void", description: "Called when the dialog open state should change." },
      { name: "roleProfiles", type: "Array<{ id: string; label: string }>", default: "[]", description: "Available role profiles for the role selector. If empty, the selector is hidden." },
      { name: "defaultProfileId", type: "string", description: "Default profile ID pre-selected in the role selector." },
      { name: "expiryDays", type: "number", default: "7", description: "Invite expiry in days." },
      { name: "inviteLimit", type: "number", default: "1", description: "Max uses per invite token." },
      { name: "messages", type: "OrgInviteDialogMessageOverrides", description: "Shallow-partial override for all UI copy and error messages." },
      { name: "onSubmit", type: "(input: OrgInviteInput) => Promise<OrgInviteResult>", description: "Adapter override — fully replaces useCreateOrgInviteMutation. Required for the docs preview." },
      { name: "onInviteSent", type: "(invite: OrgInviteResult) => void", description: "Fires after a successful invite creation." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped error with the resolved message and code." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam for success, errors, and informational events." },
      { name: "className", type: "string", description: "Additional CSS class names for the wrapper element." },
    ],
    messages: defaultOrgInviteDialogMessages,
    requires: orgInviteDialogRequires as RequiresJson,
  },
  'org-roles-editor': {
    props: [
      { name: "orgId", type: "string", required: true, description: "The org's user id (User.type === 'organization'). Required — used as the entityId filter on useOrgProfilesQuery and as entityId on create mutations." },
      { name: "messages", type: "OrgRolesEditorMessageOverrides", default: "defaultOrgRolesEditorMessages", description: "Deep-partial message overrides. Top-level keys replace UI copy strings; errors map keys (PROFILE_IN_USE, PERMISSION_DENIED, DUPLICATE_NAME, PROCEDURE_NOT_FOUND, UNKNOWN_ERROR) replace individual backend error messages." },
      { name: "onSubmit", type: "(vars: OrgProfileSaveVars) => Promise<OrgProfileResult | null>", description: "Replaces both create and update mutations. vars.id present = update; absent = create. Return the saved profile or null." },
      { name: "onDelete", type: "(id: string) => Promise<void>", description: "Replaces the delete mutation. Throw to surface an error in the delete confirmation dialog." },
      { name: "onProfileSaved", type: "(profileId: string) => void", description: "Fires after a successful save (create or update). Always fires regardless of whether onSubmit override is used." },
      { name: "onProfileDeleted", type: "(profileId: string) => void", description: "Fires after a successful delete. Always fires regardless of whether onDelete override is used." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after any mapped error (save or delete). Receives the mapped message and the backend error code." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for every event (success and error). Suitable for toast integrations." },
      { name: "className", type: "string", description: "Additional CSS class names applied to the outer Card element." },
    ],
    messages: defaultOrgRolesEditorMessages,
    requires: orgRolesEditorRequires as RequiresJson,
  },
  'org-app-memberships': {
    props: [
      { name: "orgId", type: "string", required: true, description: "The organization's account ID. Used as the `actorId` filter for the memberships query." },
      { name: "membershipProfiles", type: "Array<{ id: string; label: string }>", default: "[]", description: "Available app membership profiles to show in the per-row profile selector. Omit to hide the selector." },
      { name: "messages", type: "OrgAppMembershipsMessageOverrides", description: "Partial overrides for all UI copy and error messages." },
      { name: "onSubmit", type: "(vars: UpdateAppMembershipVars) => Promise<OrgAppMembership | null>", description: "Replaces the default `useUpdateAppMembershipMutation` call. Handles both approve and profile-update actions." },
      { name: "onRevoke", type: "(vars: DeleteAppMembershipVars) => Promise<OrgAppMembership | null>", description: "Replaces the default `useDeleteAppMembershipMutation` call. Only runs after step-up succeeds." },
      { name: "onSuccess", type: "(action: 'approve' | 'revoke' | 'profile-update', membershipId: string) => void", description: "Fires after a successful approve, revoke, or profile-update action." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped error (approve, revoke, or profile-update)." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for all success, error, and informational events." },
      { name: "className", type: "string", description: "Additional CSS class names applied to the outer Card element." },
    ],
    messages: defaultOrgAppMembershipsMessages,
    requires: orgAppMembershipsRequires as RequiresJson,
  },
  'org-scim-token-generation-card': {
    props: [
      { name: "orgId", type: "string", required: true, description: "The organisation's UUID — forwarded to the backend when the SCIM proc ships." },
      { name: "onSubmit", type: "(orgId: string) => Promise<ScimTokenResult>", description: "Override seam that replaces the (not-yet-generated) `useGenerateScimTokenMutation` call. When absent the block renders the deferred-state UI. When provided the Generate button becomes active." },
      { name: "onSuccess", type: "(result: ScimTokenResult) => void", description: "Fires after a successful token generation with the full `ScimTokenResult`." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped error with normalised `message` and `code` fields." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for success, errors, and revoke events." },
      { name: "messages", type: "OrgScimTokenGenerationCardMessageOverrides", description: "Deep-partial copy overrides. Top-level keys override UI strings; nested `errors` map accepts `PROCEDURE_NOT_FOUND` and `UNKNOWN_ERROR`." },
      { name: "className", type: "string", description: "Extra class names applied to the root Card element." },
    ],
    messages: defaultOrgScimTokenGenerationCardMessages,
  },
  'org-scim-connections-list': {
    props: [
      { name: "orgId", type: "string", required: true, description: "The org ID whose SCIM connections to display." },
      { name: "scimBaseUrl", type: "string", default: "undefined", description: "Base URL for the SCIM endpoint shown to admins. Rendered as `{scimBaseUrl}/scim/v2/{orgId}` — endpoint column hidden when omitted." },
      { name: "messages", type: "OrgScimConnectionsListMessageOverrides", description: "Override any UI copy string (title, description, badge label, empty-state text, error messages)." },
      { name: "onRevokeSuccess", type: "(scimProviderId: string) => void", description: "Fires when a revoke action succeeds. Activates with the override-driven revoke path." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires on any backend error. No-op in the current stub." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam for toast integration. No-op in the current stub." },
      { name: "className", type: "string", description: "Extra CSS class forwarded to the outer `<Card>` element." },
    ],
    messages: defaultScimConnectionsListMessages,
  },
  'org-scim-setup-guide': {
    props: [
      { name: "orgId", type: "string", required: true, description: "Target org ID appended to the SCIM base URL to produce the full provisioning endpoint." },
      { name: "provider", type: "'okta' | 'azure-ad' | 'jumpcloud' | 'google-workspace' | 'generic'", default: "'okta'", description: "Which IdP guide to display. Drives the provider selector, endpoint instructions, and external docs link." },
      { name: "scimBaseUrl", type: "string", description: "SCIM base URL injected into the copyable endpoint field. When omitted a `<your-scim-endpoint>` placeholder is shown." },
      { name: "messages", type: "OrgScimSetupGuideMessageOverrides", description: "Partial overrides for any UI copy string (title, section headings, button labels, banner text)." },
      { name: "onError", type: "(err: unknown) => void", description: "Fires when an unexpected error occurs, such as a clipboard write failure on the copy-endpoint action." },
      { name: "className", type: "string", description: "Extra class names applied to the root Card element." },
    ],
    messages: defaultOrgScimSetupGuideMessages,
  },
  'shell-sidebar': {
    props: [
      { name: "navItems", type: "ShellSidebarNavItem[]", required: true, description: "Nav items rendered in the middle section. Each item supports `label`, `href`, `icon`, optional `badge`, `requiredPermission`, and nested `children`." },
      { name: "topSlot", type: "ReactNode | ((collapsed: boolean) => ReactNode)", description: "Top slot — typically a UserContextSwitcher. Receives collapsed state when passed as a render prop." },
      { name: "bottomSlot", type: "ReactNode | ((collapsed: boolean) => ReactNode)", description: "Bottom slot — typically a ShellAccountMenu. Receives collapsed state when passed as a render prop." },
      { name: "hasPermission", type: "(permission: string) => boolean", description: "Client-side permission gate. Items with `requiredPermission` are hidden when this returns false. Server RLS remains the real security gate." },
      { name: "defaultCollapsed", type: "boolean", default: "false", description: "Start in icon-only collapsed mode." },
      { name: "persistCollapsed", type: "boolean", default: "true", description: "Persist collapsed state to localStorage under `persistKey`." },
      { name: "persistKey", type: "string", default: "'cnc_sidebar_collapsed'", description: "localStorage key used when `persistCollapsed` is true." },
      { name: "collapseShortcut", type: "string", default: "'mod+b'", description: "Keyboard shortcut to toggle collapsed state. `mod` resolves to Meta on macOS and Ctrl elsewhere." },
      { name: "messages", type: "ShellSidebarMessageOverrides", description: "Shallow-partial message overrides for nav aria-label and collapse/expand tooltip copy." },
    ],
    messages: defaultShellSidebarMessages,
  },
  'shell-header': {
    props: [
      { name: "logo", type: "React.ReactNode", description: "Logo or wordmark rendered at the left edge, separated from breadcrumbs by a vertical divider." },
      { name: "breadcrumbsSlot", type: "React.ReactNode", description: "Slot for a breadcrumbs component (e.g. `shell-breadcrumbs`). Fills the center-left flex region when `showBreadcrumbs` is true." },
      { name: "accountMenuSlot", type: "React.ReactNode", description: "Slot for an account-menu component pinned to the right edge." },
      { name: "showSearch", type: "boolean", default: "false", description: "Render the search input (hidden on small screens via `sm:block`)." },
      { name: "showCommandPalette", type: "boolean", default: "true", description: "Render the Cmd+K trigger button." },
      { name: "onCommandPaletteOpen", type: "() => void", description: "Fires when the Cmd+K button is clicked or the keyboard shortcut is pressed." },
      { name: "showSidebarToggle", type: "boolean", default: "true", description: "Render the hamburger toggle (visible only below the `lg` breakpoint)." },
      { name: "sidebarOpen", type: "boolean", default: "false", description: "Passed as `aria-expanded` on the hamburger — parent owns drawer state." },
      { name: "onSidebarToggle", type: "() => void", description: "Fires when the hamburger is clicked; parent updates `sidebarOpen`." },
      { name: "messages", type: "ShellHeaderMessageOverrides", description: "Partial override for aria labels, search placeholder, and the command-palette shortcut hint." },
    ],
    messages: defaultShellHeaderMessages,
  },
  'shell-breadcrumbs': {
    props: [
      { name: "segments", type: "BreadcrumbSegment[]", description: "Explicit segment list. When provided `resolveLabel` and `usePathname` are bypassed. Each segment has a `label` string and an optional `href`." },
      { name: "resolveLabel", type: "(segment: string, fullPath: string) => string | null | Promise<string | null>", description: "Consumer-provided label resolver for dynamic path segments. Return `null` to fall back to the capitalized raw segment. May be async (e.g. entity name fetch)." },
      { name: "maxVisible", type: "number", default: "4", description: "Maximum number of crumbs shown before collapsing the middle ones with an ellipsis. Click the ellipsis to expand." },
      { name: "showHome", type: "boolean", default: "true", description: "Prepend a home icon crumb as the first item." },
      { name: "homeHref", type: "string", default: "'/'", description: "Href for the home icon crumb." },
      { name: "messages", type: "ShellBreadcrumbsMessageOverrides", description: "Override any UI copy — `homeAriaLabel`, `ellipsisAriaLabel`, `navAriaLabel`, and per-code `errors`." },
      { name: "onError", type: "(err: unknown) => void", description: "Fires when an async `resolveLabel` call throws. The segment falls back to the capitalized raw value." },
      { name: "className", type: "string", description: "Extra class names on the root `<nav>` element." },
    ],
    messages: defaultShellBreadcrumbsMessages,
  },
  'shell-command-palette': {
    props: [
      { name: "commands", type: "CommandRegistryEntry[]", default: "[]", description: "Consumer-registered commands merged after built-ins. Each entry requires id, label, and onSelect; optional group, description, icon, shortcut, requiredPermission." },
      { name: "open", type: "boolean", description: "Controlled open state. When omitted the block manages open state internally via the global Mod+K listener." },
      { name: "onOpenChange", type: "(open: boolean) => void", description: "Fires whenever the palette opens or closes. Required for controlled usage." },
      { name: "trigger", type: "string", default: "'mod+k'", description: "Keyboard shortcut that opens/closes the palette." },
      { name: "onError", type: "(err: unknown) => void", description: "Fires when any command onSelect handler throws (sync or async)." },
      { name: "messages", type: "ShellCommandPaletteMessageOverrides", description: "Deep-partial overrides for search placeholder, empty state, group labels, and per-code error strings." },
      { name: "className", type: "string", description: "Extra class names applied to the CommandDialog root." },
    ],
    messages: defaultShellCommandPaletteMessages,
    requires: shellCommandPaletteRequires as RequiresJson,
  },
  'shell-notifications': {
    props: [
      { name: "items", type: "ShellNotification[]", description: "Notification rows to render. Host owns fetching. Empty/undefined renders the bell without a badge and shows the empty state." },
      { name: "onMarkRead", type: "(id: string) => void", description: "Called when the user clicks the per-item Mark as read button. Update your data layer here." },
      { name: "onMarkAllRead", type: "() => void", description: "Called when the user clicks Mark all read in the panel header." },
      { name: "onDismiss", type: "(id: string) => void", description: "Called when the user dismisses an individual notification." },
      { name: "allNotificationsHref", type: "string", default: "'/notifications'", description: "Href for the View all link in the panel footer. Default: `'/notifications'`." },
      { name: "maxVisible", type: "number", default: "20", description: "Maximum number of items rendered before the View all link. Default: `20`." },
      { name: "messages", type: "ShellNotificationsMessageOverrides", description: "Partial overrides for all copy strings (panel title, button labels, empty state, error keys)." },
    ],
    messages: defaultShellNotificationsMessages,
    requires: shellNotificationsRequires as RequiresJson,
  },
  'shell-account-menu': {
    props: [
      { name: "accountSettingsHref", type: "string", default: "'/account/settings'", description: "Link to the account settings page." },
      { name: "signOutRedirectHref", type: "string", default: "'/login'", description: "URL to navigate to after a successful sign-out." },
      { name: "showActiveContext", type: "boolean", default: "true", description: "Show the active context label (org name or 'Personal') below the user's name in the dropdown header." },
      { name: "messages", type: "ShellAccountMenuMessageOverrides", description: "Override any label, aria string, or error message." },
      { name: "onSignOutSuccess", type: "() => void", description: "Fires after sign-out succeeds and before window.location navigation. Use to clear stores." },
      { name: "onError", type: "(err: { message: string; code: string }) => void", description: "Fires after a mapped sign-out error." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", description: "Notification seam — fires for both success and error events." },
      { name: "className", type: "string", description: "Extra CSS class applied to the outermost wrapper." },
    ],
    messages: defaultShellAccountMenuMessages,
    requires: shellAccountMenuRequires as RequiresJson,
  },
  'user-context-switcher': {
    props: [
      { name: "currentUser", type: "UserContextMembership['user']", default: "undefined", description: "Pre-fetched personal-account user. When provided, the `useCurrentUserQuery` network call is skipped." },
      { name: "activeContextId", type: "string", default: "undefined", description: "Currently active context ID (controlled). If unset, personal account is considered active." },
      { name: "onContextSwitch", type: "(user: UserContextMembership['user']) => void", default: "undefined", description: "Callback after context switch completes. Receives the new active User." },
      { name: "onSwitchSubmit", type: "(orgId: string | null) => Promise<void>", default: "undefined", description: "Adapter override replacing useSwitchContext's default path. Required while the switch_context backend procedure is pending." },
      { name: "showCreateOrgLink", type: "boolean", default: "true", description: "Show 'Create new org' footer link." },
      { name: "onCreateOrgClick", type: "() => void", default: "undefined", description: "Fires when user clicks 'Create new org'." },
      { name: "showRoleChip", type: "boolean", default: "true", description: "Show role chip next to org entries." },
      { name: "messages", type: "UserContextSwitcherMessageOverrides", default: "undefined", description: "Override any display string in the component." },
      { name: "onError", type: "(err: unknown) => void", default: "undefined", description: "Fires after a mapped error." },
      { name: "onMessage", type: "(event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void", default: "undefined", description: "Notification seam — fires for success, mapped errors, and branches." },
      { name: "className", type: "string", default: "undefined", description: "Additional CSS classes for the trigger button." },
    ],
    messages: defaultUserContextSwitcherMessages,
    requires: userContextSwitcherRequires as unknown as RequiresInput,
  },
};

export const SHOWCASE_SLUGS = new Set(Object.keys(SHOWCASE));
