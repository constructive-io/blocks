'use client';

import { Fragment, useCallback, useMemo, useState } from 'react';

import {
  AuthLayout,
  type AuthLinkComponent,
  type AuthResult,
  CheckEmailPanel,
  ForgotPasswordPanel,
  ResetPasswordPanel,
  SignInPanel,
  SignUpPanel,
  VerifyEmailPanel,
} from '@/components/ui/auth-pages';
import { Segmented } from '@/components/ui/workspace-kit';

type Panel = 'sign-in' | 'sign-up' | 'check-email' | 'verify-email' | 'forgot-password' | 'reset-password';

const PANELS: { value: Panel; label: string }[] = [
  { value: 'sign-in', label: 'Sign in' },
  { value: 'sign-up', label: 'Sign up' },
  { value: 'check-email', label: 'Check email' },
  { value: 'verify-email', label: 'Verify' },
  { value: 'forgot-password', label: 'Forgot' },
  { value: 'reset-password', label: 'Reset' },
];

const PANEL_BY_HREF = new Map<string, Panel>(PANELS.map((panel) => [`/${panel.value}`, panel.value]));

const INTRO = 'Try the password wrong-password, or sign up as taken@example.com, to see how a refusal looks.';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function BrandLogo() {
  return (
    <svg className="size-full bg-primary p-1.5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M4 18 12 5l8 13Z" strokeLinejoin="round" />
    </svg>
  );
}

export function AuthPagesPreview() {
  const [panel, setPanel] = useState<Panel>('sign-in');
  // Remounts the panel on every switch, so a finished state (check email, password updated) starts over.
  const [visit, setVisit] = useState(0);
  const [message, setMessage] = useState(INTRO);

  // Setters only, so the memoized `PreviewLink` can call it.
  const show = useCallback((next: Panel) => {
    setPanel(next);
    setVisit((count) => count + 1);
    setMessage(INTRO);
  }, []);

  // Footer links switch panels here, as `#/<path>` so the static page never
  // points outside the site's base path; a host passes its router link instead.
  const PreviewLink = useMemo<AuthLinkComponent>(
    () =>
      function PreviewLink({ href, className, children }) {
        return (
          <a
            className={className}
            href={`#${href}`}
            onClick={(event) => {
              event.preventDefault();
              const target = PANEL_BY_HREF.get(href);
              if (target) {
                show(target);
              } else {
                setMessage(`The host would navigate to ${href}.`);
              }
            }}
          >
            {children}
          </a>
        );
      },
    [show],
  );

  const respond = async (result: AuthResult, hostAction?: string): Promise<AuthResult> => {
    await wait(700);
    setMessage(result.ok ? (hostAction ?? 'The host would carry on.') : `The handler answered: ${result.message}`);
    return result;
  };

  const content = (() => {
    switch (panel) {
      case 'sign-in':
        return (
          <SignInPanel
            links={{ forgotPassword: '/forgot-password', signUp: '/sign-up' }}
            onSubmit={({ email, password, rememberMe }) =>
              respond(
                password === 'wrong-password' ? { ok: false, message: 'That email and password do not match.' } : { ok: true },
                `The host would start a ${rememberMe ? 'long-lived' : 'browser'} session for ${email} and go to /app.`,
              )
            }
          />
        );
      case 'sign-up':
        return (
          <SignUpPanel
            links={{ signIn: '/sign-in' }}
            onSubmit={({ email }) =>
              respond(
                email === 'taken@example.com' ? { ok: false, message: 'An account with that email already exists. Sign in instead.' } : { ok: true },
                `The host would create the account and email a confirmation link to ${email}.`,
              )
            }
          />
        );
      case 'check-email':
        return (
          <CheckEmailPanel
            email="ada@example.com"
            links={{ signIn: '/sign-in' }}
            onResend={() => respond({ ok: true }, 'The host would send another confirmation email.')}
          />
        );
      case 'verify-email':
        return (
          <VerifyEmailPanel
            links={{ continue: '/app', signIn: '/sign-in' }}
            onVerify={() => respond({ ok: true }, 'The host would confirm the token from the link and mark the address verified.')}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordPanel
            links={{ signIn: '/sign-in' }}
            onSubmit={({ email }) => respond({ ok: true }, `If ${email} has an account, the host would email it a reset link.`)}
          />
        );
      case 'reset-password':
        return (
          <ResetPasswordPanel
            links={{ signIn: '/sign-in' }}
            onSubmit={() => respond({ ok: true }, 'The host would save the new password for the reset token in the link.')}
          />
        );
    }
  })();

  return (
    <div className="flex h-dvh min-h-[640px] w-full flex-col" data-slot="application-block-showcase-canvas">
      <div className="shrink-0 overflow-x-auto border-b border-border bg-background px-3 py-2">
        <Segmented
          className="mx-auto w-max min-w-full sm:min-w-0"
          label="Auth panel"
          onChange={show}
          options={PANELS}
          value={panel}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <AuthLayout
          brand={{ name: 'Acme', logo: <BrandLogo /> }}
          className="min-h-0 flex-1"
          footer="By continuing you agree to the Terms and the Privacy Policy."
          linkComponent={PreviewLink}
        >
          <Fragment key={`${panel}-${visit}`}>{content}</Fragment>
        </AuthLayout>
      </div>
      <p
        aria-live="polite"
        className="shrink-0 truncate border-t border-border bg-background px-3 py-1.5 text-xs text-muted-foreground"
        role="status"
      >
        {message}
      </p>
    </div>
  );
}
