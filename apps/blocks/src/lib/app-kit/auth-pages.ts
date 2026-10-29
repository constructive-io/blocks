import type { ApplicationBlockDoc } from '../application-blocks';

export const AUTH_PAGES_DOC: ApplicationBlockDoc = {
  name: 'auth-pages',
  title: 'Auth Pages',
  description:
    'Sign-in, sign-up, check-email, verify-email, forgot-password, and reset-password panels with a page layout. Each panel validates its fields, shows pending and failure states, and hands the result to injected handlers, so it works with any router and any auth backend.',
  previewDescription:
    'Switch between the six panels, submit with a bad email to see field errors, sign in with the password wrong-password or sign up as taken@example.com to see a refusal, and follow the footer links between panels.',
  previewHeight: 760,
  whenToUse: [
    'Use Auth Pages for the public account screens of an app: signing in, creating an account, confirming an email address, and recovering a password.',
    'Use the Auth feature pack when the console already owns the auth policy and actions and you want the entry panel and account view wired to them.',
  ],
  usage: {
    description:
      'Render one panel per route inside AuthLayout and pass your auth calls as handlers that answer { ok: true } or { ok: false, message }. The panels own validation, pending, and result states; the host owns routing, sessions, tokens, and the backend.',
    example: `'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  AuthLayout,
  type AuthLinkComponent,
  type AuthResult,
  SignInPanel,
  VerifyEmailPanel
} from '@/components/ui/auth-pages';

type AuthCalls = Readonly<{
  signIn: (credentials: {
    email: string;
    password: string;
    rememberMe: boolean;
  }) => Promise<AuthResult>;
  verifyEmail: (token: string) => Promise<AuthResult>;
}>;

const RouterLink: AuthLinkComponent = ({ href, className, children }) => (
  <Link className={className} href={href}>
    {children}
  </Link>
);

const brand = { name: 'Acme', href: '/' };

export function SignInPage({ auth }: Readonly<{ auth: AuthCalls }>) {
  const router = useRouter();

  return (
    <AuthLayout brand={brand} linkComponent={RouterLink}>
      <SignInPanel
        links={{ signUp: '/sign-up', forgotPassword: '/forgot-password' }}
        onSubmit={async (credentials) => {
          const result = await auth.signIn(credentials);
          if (result.ok) router.push('/app');
          return result;
        }}
      />
    </AuthLayout>
  );
}

export function VerifyEmailPage({
  auth,
  token
}: Readonly<{ auth: AuthCalls; token: string }>) {
  return (
    <AuthLayout brand={brand} linkComponent={RouterLink}>
      <VerifyEmailPanel
        links={{ continue: '/app', signIn: '/sign-in' }}
        onVerify={() => auth.verifyEmail(token)}
      />
    </AuthLayout>
  );
}`,
  },
  state: {
    title: 'Validation, pending, and results',
    description:
      'Every form checks its fields before calling the handler: a required email with a basic shape check (trimmed before it is sent), a required password, the minimum length on sign-up and reset, and a matching confirmation on reset. While a handler runs, the submit button is disabled and only one call runs at a time. { ok: false, message } shows the message in an alert; a handler that throws shows “Something went wrong. Try again.” and never the raw error. On { ok: true }, sign-up shows the check-email state for the address, forgot-password says a link is on its way if the account exists, reset-password offers sign-in, and sign-in leaves navigation to the host.',
  },
  composition: [
    'Built from the same card, field, input group, checkbox, alert, and button primitives as the Auth feature pack, so the public pages match the console’s entry panel.',
    'Pass linkComponent once on AuthLayout and every panel inside it uses it; a panel’s own linkComponent wins. Without one, links are plain anchors, and a link is left out when its href is not given.',
    'title, description, and notice let a host rename a panel or explain why the person is there, such as a session that ended. Field labels and validation messages are fixed English copy.',
    'EmailInput and PasswordInput are exported for other credential forms, such as a change-password dialog.',
  ],
  accessibility: [
    'Field errors set aria-invalid and aria-describedby on their input, and focus moves to the first invalid field.',
    'A refused or failed call is announced as an alert, and focus returns to the field nearest the action so the person can correct it.',
    'When a result replaces a form (check email, password updated, email verified), focus moves to the new heading so it is read out.',
    'The show/hide password button has a label and aria-pressed; email addresses read left to right on right-to-left pages, and long addresses and translated copy wrap instead of overflowing.',
  ],
  api: [
    {
      name: 'SignInPanel',
      type: 'onSubmit({ email, password, rememberMe }), links?: { signUp, forgotPassword }, defaultEmail?',
      behavior:
        'Email, password, and “Keep me signed in on this device”. On { ok: true } the button stays down as “Signed in” while the host navigates.',
    },
    {
      name: 'SignUpPanel',
      type: 'onSubmit({ email, password }), links?: { signIn }, passwordMinLength? (8)',
      behavior: 'Creates an account and never expects a session: on { ok: true } it shows the check-email state for the address.',
    },
    {
      name: 'CheckEmailPanel',
      type: 'email?, onResend?(), links?: { signIn }',
      behavior: 'Tells the person to confirm their address, then sign in with their password. onResend adds a resend button.',
    },
    {
      name: 'VerifyEmailPanel',
      type: 'onVerify(), links?: { signIn, continue }',
      behavior:
        'Calls onVerify exactly once on mount, even under StrictMode, then shows the verified state with a link onward or the failure with “Try again”.',
    },
    {
      name: 'ForgotPasswordPanel',
      type: 'onSubmit({ email }), links?: { signIn }',
      behavior: 'On { ok: true } says a reset link is on its way if an account exists for the address, so it never reveals which accounts exist.',
    },
    {
      name: 'ResetPasswordPanel',
      type: 'onSubmit({ password }), links?: { signIn }, passwordMinLength? (8)',
      behavior: 'New password and confirmation; a short or mismatched entry is a field error. On { ok: true } it offers sign-in.',
    },
    {
      name: 'AuthLayout',
      type: 'children, brand?: { name, logo?, href? }, footer?, linkComponent?',
      behavior: 'A centred column on the page background with the brand above the card and a muted footer below, from 320px phones to desktop.',
    },
    {
      name: 'Every panel',
      type: 'title?, description?, notice?: { tone, message }, linkComponent?, className?',
      behavior: 'title and description replace the first state’s copy; notice shows an info, success, or error alert above the form.',
    },
    {
      name: 'AuthResult',
      type: '{ ok: true } | { ok: false; message: string }',
      behavior: 'What every handler returns, directly or from a promise. The message is shown to the person as written.',
    },
  ],
};
