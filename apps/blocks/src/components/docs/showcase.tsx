'use client';

/**
 * showcase — live, interactive previews for the showcased blocks.
 *
 * Each block mounts inside a <PreviewFrame>, which supplies the QueryClient and
 * the docs mock adapter (via PreviewProvider). Mutation blocks always get an
 * `onSubmit` override so the preview never touches a real backend; an outcome
 * toggle drives the success vs error path through that seam. The step-up and
 * emails-query blocks resolve against the mock adapter directly.
 *
 * Embedded in the generated MDX as `<BlockShowcase slug="…" />`.
 * Docs harness only — never imported by block source.
 */

import { Suspense, type ComponentType } from 'react';

import { ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { PreviewFrame } from './preview-frame';
import { UI_DEMOS } from './showcase-ui';

type DemoModule = { BlockDemo: ComponentType };

// Keep every import path literal: Next uses these call sites to emit one
// deterministic chunk per demo while the registry itself stays small.
const demo = (load: () => Promise<DemoModule>): ComponentType =>
  dynamic(() => load().then((module) => module.BlockDemo), { loading: () => null });

// Exported so the landing bento grid can mount the same live demos directly
// (without the PreviewFrame chrome). The reference pages reach these through
// <ComponentPreview> → <BlockShowcase>.
export const DEMOS: Record<string, ComponentType> = {
  chat: demo(() => import('./demos/chat.demo')),
  'schema-builder': demo(() => import('./demos/schema-builder.demo')),
  'auth-sign-in-card': demo(() => import('./demos/auth-sign-in-card.demo')),
  'auth-sign-up-card': demo(() => import('./demos/auth-sign-up-card.demo')),
  'auth-forgot-password-card': demo(() => import('./demos/auth-forgot-password-card.demo')),
  'auth-reset-password-card': demo(() => import('./demos/auth-reset-password-card.demo')),
  'auth-sign-out-button': demo(() => import('./demos/auth-sign-out-button.demo')),
  'auth-step-up-dialog': demo(() => import('./demos/auth-step-up-dialog.demo')),
  'use-step-up': demo(() => import('./demos/use-step-up.demo')),
  'auth-account-emails-list': demo(() => import('./demos/auth-account-emails-list.demo')),
  'user-avatar': demo(() => import('./demos/user-avatar.demo')),
  'auth-sign-in-page': demo(() => import('./demos/auth-sign-in-page.demo')),
  'auth-sign-up-page': demo(() => import('./demos/auth-sign-up-page.demo')),
  'auth-forgot-password-page': demo(() => import('./demos/auth-forgot-password-page.demo')),
  'auth-reset-password-page': demo(() => import('./demos/auth-reset-password-page.demo')),
  'auth-verify-email-page': demo(() => import('./demos/auth-verify-email-page.demo')),
  'auth-verify-email-banner': demo(() => import('./demos/auth-verify-email-banner.demo')),
  'auth-cross-origin-link': demo(() => import('./demos/auth-cross-origin-link.demo')),
  'auth-social-buttons': demo(() => import('./demos/auth-social-buttons.demo')),
  'auth-social-providers-grid': demo(() => import('./demos/auth-social-providers-grid.demo')),
  'auth-invitation-acceptance-card': demo(() => import('./demos/auth-invitation-acceptance-card.demo')),
  'auth-invitation-acceptance-page': demo(() => import('./demos/auth-invitation-acceptance-page.demo')),
  'auth-account-deletion-confirm-page': demo(() => import('./demos/auth-account-deletion-confirm-page.demo')),
  'auth-magic-link-sent-page': demo(() => import('./demos/auth-magic-link-sent-page.demo')),
  'auth-magic-link-callback-page': demo(() => import('./demos/auth-magic-link-callback-page.demo')),
  'auth-account-profile-card': demo(() => import('./demos/auth-account-profile-card.demo')),
  'auth-account-security-card': demo(() => import('./demos/auth-account-security-card.demo')),
  'auth-account-danger-card': demo(() => import('./demos/auth-account-danger-card.demo')),
  'auth-account-sessions-list': demo(() => import('./demos/auth-account-sessions-list.demo')),
  'auth-account-api-keys-list': demo(() => import('./demos/auth-account-api-keys-list.demo')),
  'auth-account-connected-accounts': demo(() => import('./demos/auth-account-connected-accounts.demo')),
  'auth-account-phones-list': demo(() => import('./demos/auth-account-phones-list.demo')),
  'auth-account-settings-page': demo(() => import('./demos/auth-account-settings-page.demo')),
  'auth-change-password-form': demo(() => import('./demos/auth-change-password-form.demo')),
  'auth-api-key-create-dialog': demo(() => import('./demos/auth-api-key-create-dialog.demo')),
  'auth-api-key-created-modal': demo(() => import('./demos/auth-api-key-created-modal.demo')),
  'auth-passkey-management-list': demo(() => import('./demos/auth-passkey-management-list.demo')),
  'auth-passkey-enroll': demo(() => import('./demos/auth-passkey-enroll.demo')),
  'auth-passkey-sign-in': demo(() => import('./demos/auth-passkey-sign-in.demo')),
  'auth-mfa-totp-enroll': demo(() => import('./demos/auth-mfa-totp-enroll.demo')),
  'auth-mfa-totp-challenge': demo(() => import('./demos/auth-mfa-totp-challenge.demo')),
  'auth-mfa-totp-challenge-page': demo(() => import('./demos/auth-mfa-totp-challenge-page.demo')),
  'auth-mfa-totp-disable-confirm': demo(() => import('./demos/auth-mfa-totp-disable-confirm.demo')),
  'auth-mfa-backup-codes-display': demo(() => import('./demos/auth-mfa-backup-codes-display.demo')),
  'auth-mfa-backup-codes-regenerate': demo(() => import('./demos/auth-mfa-backup-codes-regenerate.demo')),
  'auth-magic-link-request-card': demo(() => import('./demos/auth-magic-link-request-card.demo')),
  'auth-email-otp-request-card': demo(() => import('./demos/auth-email-otp-request-card.demo')),
  'auth-email-otp-input': demo(() => import('./demos/auth-email-otp-input.demo')),
  'auth-anonymous-sign-in-button': demo(() => import('./demos/auth-anonymous-sign-in-button.demo')),
  'auth-sso-setup-card': demo(() => import('./demos/auth-sso-setup-card.demo')),
  'auth-sso-sign-in-card': demo(() => import('./demos/auth-sso-sign-in-card.demo')),
  'auth-domain-verification-step': demo(() => import('./demos/auth-domain-verification-step.demo')),
  'org-create-card': demo(() => import('./demos/org-create-card.demo')),
  'org-settings-form': demo(() => import('./demos/org-settings-form.demo')),
  'org-members-list': demo(() => import('./demos/org-members-list.demo')),
  'org-invite-dialog': demo(() => import('./demos/org-invite-dialog.demo')),
  'org-roles-editor': demo(() => import('./demos/org-roles-editor.demo')),
  'org-app-memberships': demo(() => import('./demos/org-app-memberships.demo')),
  'org-scim-token-generation-card': demo(() => import('./demos/org-scim-token-generation-card.demo')),
  'org-scim-connections-list': demo(() => import('./demos/org-scim-connections-list.demo')),
  'org-scim-setup-guide': demo(() => import('./demos/org-scim-setup-guide.demo')),
  'shell-sidebar': demo(() => import('./demos/shell-sidebar.demo')),
  'shell-header': demo(() => import('./demos/shell-header.demo')),
  'shell-breadcrumbs': demo(() => import('./demos/shell-breadcrumbs.demo')),
  'shell-command-palette': demo(() => import('./demos/shell-command-palette.demo')),
  'shell-notifications': demo(() => import('./demos/shell-notifications.demo')),
  'shell-account-menu': demo(() => import('./demos/shell-account-menu.demo')),
  'user-context-switcher': demo(() => import('./demos/user-context-switcher.demo')),
  // ui foundation demos (ui-<name> slugs) — authored in ./demos/ui-*.demo.tsx,
  // aggregated by ./showcase-ui.tsx.
  ...UI_DEMOS,
};

export function BlockShowcase({ slug, onReset }: { slug: string; onReset?: (reset: () => void) => void }) {
  const DemoComponent = DEMOS[slug];
  if (!DemoComponent) {
    // Calm degrade (unmapped slug): one quiet card, one way forward.
    return (
      <div className="not-prose rounded-xl border border-border/60 bg-card p-6 shadow-surface-1">
        <p className="text-[13px] text-muted-foreground">
          No live preview is registered for <code className="font-mono text-foreground">{slug}</code>.
        </p>
        <Link
          href="/blocks"
          className="mt-3 inline-flex items-center gap-1 text-[13px] text-primary outline-none transition-colors hover:text-primary/80 focus-visible:underline"
        >
          Browse the block registry
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  return (
    // The card, tabs, and preview well live in <ComponentPreview>; this frame is
    // just the mount boundary. `onReset` re-homes the reset control into that
    // header (see PreviewFrame).
    <PreviewFrame onReset={onReset}>
      {/* Suspense boundary: some blocks (e.g. reset-password-card) call
          useSearchParams() internally, which must be wrapped for static export. */}
      <Suspense fallback={null}>
        <DemoComponent />
      </Suspense>
    </PreviewFrame>
  );
}
