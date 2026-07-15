/**
 * How-to: Use with your auth (Diátaxis how-to — goal-oriented recipe).
 *
 * Wire the auth blocks to the host's session and routing. Grounded in the real
 * sign-in-card surface (src/blocks/auth/sign-in-card/sign-in-card.tsx):
 *   - onSuccess ALWAYS fires after a resolved sign-in (incl. mfaRequired /
 *     unverified) and carries the full result → routing belongs there.
 *   - forgotPasswordHref / signUpHref render plain links when set.
 *   - onMessage fires 'warning' for mfaRequired + emailNotVerified, 'error' for
 *     mapped failures; onError covers hard failures.
 *   - onSubmit fully replaces the default useSignInMutation call (portability).
 *
 * Server component: DocPage (client) → DocSection (server) → CodeBlock (async).
 */

import type { Metadata } from 'next';

import { CodeBlock } from '@/components/docs/code-block';
import { DocPage } from '@/components/docs/doc-page';
import { DocSection } from '@/components/docs/doc-section';
import { InstallField } from '@/components/docs/install-field';
import { DocLink, InlineCode, proseCls, ResultCallout } from '@/components/docs/prose';
import { GUIDES } from '@/lib/docs/guides-meta';
import { getAdjacent } from '@/lib/docs/registry';
import { OG_IMAGE, withBase } from '@/lib/site';

const meta = GUIDES.find((g) => g.slug === 'auth');
const HREF = meta?.href ?? '/blocks/guides/auth';
const TITLE = meta?.title ?? 'Use with your auth';
const DESCRIPTION =
  meta?.description ??
  'Wire the auth blocks to your app’s session and routing — redirect on success, persist the token, branch on MFA.';

export default function AuthGuidePage() {
  const { prev, next } = getAdjacent(HREF);
  return (
    <DocPage title={TITLE} description={DESCRIPTION} prev={prev} next={next}>
      <p className={proseCls}>
        The auth blocks own the form and the API call; your app owns the session and the router. They meet at a few
        callback props. This wires the sign-in card to your routes and token store.
      </p>

      <DocSection
        title="1. Install the block and the runtime"
        intro="Add the sign-in card, and make sure BlocksRuntime is mounted so the block can reach your endpoint. Here we only wire the host seams on top of it."
      >
        <InstallField url="@constructive/auth-sign-in-card" />
        <p className="text-pretty mt-3 text-caption text-muted-foreground">
          Runtime not mounted yet? See <DocLink href="/blocks/guides/adapter">Wire a GraphQL adapter</DocLink>. Full
          prop reference: <DocLink href="/blocks/auth/sign-in-card">sign-in-card</DocLink>.
        </p>
      </DocSection>

      <DocSection
        title="2. Persist the token and route on success"
        intro="onSuccess fires after every resolved sign-in and receives the full result. Because it also fires for mfaRequired and unverified accounts, make routing decisions here by branching on the result — store the access token only on a clean sign-in."
      >
        <CodeBlock
          lang="tsx"
          filename="app/sign-in/page.tsx"
          code={`'use client';
import { useRouter } from 'next/navigation';
import { SignInCard } from '@/blocks/auth/sign-in-card/sign-in-card';

export default function SignInPage() {
  const router = useRouter();
  return (
    <SignInCard
      onSuccess={(result) => {
        if (result.mfaRequired) return router.push('/mfa');
        if (result.isVerified === false) return router.push('/verify-email');
        // Clean sign-in: store the token where your getToken reads it, then route on.
        if (result.accessToken) saveSession(result.accessToken);
        router.push('/dashboard');
      }}
    />
  );
}`}
        />
        <p className="text-pretty mt-3 text-caption text-muted-foreground">
          <InlineCode>saveSession</InlineCode> is your own token store — the same one{' '}
          <InlineCode>BlocksRuntime</InlineCode>’s <InlineCode>getToken</InlineCode> reads, so every later block request
          is authenticated.
        </p>
      </DocSection>

      <DocSection
        title="3. Point the auxiliary links at your routes"
        intro="forgotPasswordHref and signUpHref render as plain links when set. Pass your route paths; omit a prop to hide that link entirely."
      >
        <CodeBlock
          lang="tsx"
          code={`<SignInCard
  signUpHref="/sign-up"
  forgotPasswordHref="/forgot-password"
  onSuccess={(result) => {
    /* route as in step 2 */
  }}
/>`}
        />
      </DocSection>

      <DocSection
        title="4. Surface errors and notifications"
        intro="onError fires after a mapped failure with a code and message. onMessage is the notification seam — it fires 'warning' for mfaRequired and emailNotVerified and 'success' on a clean sign-in. Use it for toasts; keep navigation in onSuccess so the two never race."
      >
        <CodeBlock
          lang="tsx"
          code={`<SignInCard
  onError={(err) => toast.error(err.message)}      // err.code, err.message
  onMessage={(e) => {
    if (e.kind === 'success') toast.success(e.message);
    if (e.kind === 'warning') toast.warning(e.message); // mfaRequired / emailNotVerified
  }}
  onSuccess={(result) => {
    /* navigation lives here */
  }}
/>`}
        />
      </DocSection>

      <DocSection
        title="5. Swap the backend (optional)"
        intro="onSubmit fully replaces the default useSignInMutation call with your own async function, keeping the block portable to any backend. It receives the same vars and must return the same result shape."
      >
        <CodeBlock
          lang="tsx"
          code={`<SignInCard
  onSubmit={async ({ email, password, rememberMe, credentialKind }) => {
    const session = await myAuth.signIn(email, password);
    return {
      id: session.id,
      userId: session.userId,
      accessToken: session.token,
      accessTokenExpiresAt: session.expiresAt,
      isVerified: true,
      totpEnabled: false,
      mfaRequired: false,
      mfaChallengeToken: null,
    };
  }}
  onSuccess={(result) => {
    /* same routing as step 2 */
  }}
/>`}
        />
      </DocSection>

      <ResultCallout>
        Your sign-in route authenticates against your backend, stores the session your other blocks read, and sends each
        user to the right next step. Installing the whole capability instead? See the{' '}
        <DocLink href="/blocks/flows/authentication/email-password">Email + password</DocLink> flow.
      </ResultCallout>
    </DocPage>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase(HREF) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: withBase(HREF), images: [OG_IMAGE] },
};
