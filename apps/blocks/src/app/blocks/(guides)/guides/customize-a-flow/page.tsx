/**
 * How-to: Customize a flow (Diátaxis how-to — goal-oriented recipe).
 *
 * Install a flow's capability bundle, then adapt the blocks it gives you.
 * Grounded in the real flow manifest (scripts/flows-content.mjs → src/flows/
 * flows.json) and the generated flow reference page:
 *   - email-password uses the auth:email preset; its exact install/wire snippets
 *     come straight from the manifest's howto.{install,wire,usage}.
 *   - a flow page renders Provision / Install / Wire / Usage sections plus a
 *     Backend module list and (for non-GA flows) a contract of constraints +
 *     known backend limitations — e.g. the api-keys accessLevel enum.
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

const meta = GUIDES.find((g) => g.slug === 'customize-a-flow');
const HREF = meta?.href ?? '/blocks/guides/customize-a-flow';
const TITLE = meta?.title ?? 'Customize a flow';
const DESCRIPTION =
  meta?.description ?? 'Install a flow’s capability bundle, then adapt the blocks it gives you to your app.';

export default function CustomizeFlowGuidePage() {
  const { prev, next } = getAdjacent(HREF);
  return (
    <DocPage title={TITLE} description={DESCRIPTION} prev={prev} next={next}>
      <p className={proseCls}>
        A flow bundles one capability — the database modules to provision, the GraphQL operations it makes live, and the
        blocks that wire the UI. After install the source is yours. This adapts the{' '}
        <DocLink href="/blocks/flows/authentication/email-password">Email + password</DocLink> flow to your app.
      </p>

      <DocSection
        title="1. Provision the flow's backend"
        intro="Each flow names a backend preset and the modules it installs. Provision them onto your database before the blocks can resolve their operations — the flow page lists the exact modules under Backend."
      >
        <CodeBlock
          lang="bash"
          code={`# Email + password uses the auth:email preset (flow page → Backend).
pgpm install`}
        />
      </DocSection>

      <DocSection
        title="2. Install the flow's blocks"
        intro="A flow installs as one command — every block for the capability at once. Map the @constructive namespace first if you have not (see Getting started)."
      >
        <InstallField url="@constructive/auth-sign-in-card @constructive/auth-sign-up-card @constructive/auth-sign-out-button @constructive/auth-sign-in-page @constructive/auth-sign-up-page" />
      </DocSection>

      <DocSection
        title="3. Wire the runtime once"
        intro="Every block in a flow shares the same runtime. Mount BlocksRuntime for the flow's namespace at the app root; nothing in the flow needs per-block wiring beyond this."
      >
        <CodeBlock
          lang="tsx"
          filename="app/providers.tsx"
          code={`import { BlocksRuntime } from '@/blocks/runtime/blocks-runtime';
import { tokenManager } from '@/lib/auth/token-manager';

// Mount once at the app root so every auth block resolves its hook.
<BlocksRuntime namespaces={['auth']} getToken={() => tokenManager.getAccessToken()}>
  {children}
</BlocksRuntime>`}
        />
      </DocSection>

      <DocSection
        title="4. Adapt the composition"
        intro="The installed source is yours. Keep the blocks you need, drop the rest, and customize each through its props — copy via messages, routing via href props and onSuccess. Here the flow's full-page sign-in is swapped for the card on your own layout."
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
      signUpHref="/sign-up"
      forgotPasswordHref="/forgot-password"
      messages={{ title: 'Welcome back', submitLabel: 'Continue' }}
      onSuccess={(result) => {
        if (result.mfaRequired) return router.push('/mfa');
        router.push('/dashboard');
      }}
    />
  );
}`}
        />
        <p className="text-pretty mt-3 text-caption text-muted-foreground">
          Need a related capability — social sign-in, password reset? Each is its own flow with its own backend; browse
          the others in the sidebar.
        </p>
      </DocSection>

      <DocSection
        title="5. Honor the flow's contract"
        intro="Before shipping, read the flow page. Non-GA flows list constraints and known backend limitations — accepted enum values, server-side gates, operations not deployed yet. Build to those, not around them."
      >
        <p className={proseCls}>
          For example, the <DocLink href="/blocks/flows/account-session/api-keys">API keys</DocLink> flow accepts only{' '}
          <InlineCode>accessLevel</InlineCode> of <InlineCode>&apos;read_only&apos;</InlineCode> or{' '}
          <InlineCode>&apos;full_access&apos;</InlineCode> — any other value fails at runtime, so constrain your UI to
          the documented set.
        </p>
      </DocSection>

      <ResultCallout>
        You installed a whole capability with one command and reshaped it into your app — same backend contract, your
        UI.
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
