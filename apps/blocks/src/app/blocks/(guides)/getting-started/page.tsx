/**
 * Getting started — the Diátaxis TUTORIAL. One guaranteed-correct happy path:
 * add the @constructive namespace, install the UI foundation, point the host's
 * generated SDK at your API, mount the runtime, install your first block, and
 * render it. By the end the sign-in card is live in a Next.js app, wired to the
 * host's generated SDK.
 *
 * The generated SDK is a host prerequisite — blocks BIND to @/generated/<ns>,
 * they don't generate it — so step 3 grounds it as one-time setup and points to
 * the adapter how-to + runtime-contract concept rather than inventing a codegen
 * command.
 *
 * Authored as JSX (not Markdown) so each step is a real <DocSection> whose <h2>
 * carries an anchor id the layout's <Toc> can scan and scroll-spy. Snippets are
 * server-highlighted via <CodeBlock>; every command, path, and prop below is
 * grounded in real registry/runtime source (components.json, blocks-runtime,
 * the auth/sign-in-card block).
 */

import type { Metadata } from 'next';

import { CodeBlock } from '@/components/docs/code-block';
import { DocPage } from '@/components/docs/doc-page';
import { DocSection } from '@/components/docs/doc-section';
import { InstallField } from '@/components/docs/install-field';
import { DocLink, InlineCode, proseCls } from '@/components/docs/prose';
import { GUIDES } from '@/lib/docs/guides-meta';
import { getAdjacent } from '@/lib/docs/registry';
import { OG_IMAGE, withBase } from '@/lib/site';

const meta = GUIDES.find((g) => g.slug === 'getting-started');
const HREF = meta?.href ?? '/blocks/getting-started';
const TITLE = meta?.title ?? 'Getting started';
const DESCRIPTION =
  meta?.description ??
  'Configure the @constructive registry namespace, provide the host runtime contract, and install your first block.';

const COMPONENTS_JSON = `{
  "registries": {
    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"
  }
}`;

const NEXT_CONFIG = `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@constructive-io/ui'],
};

export default nextConfig;`;

const GLOBALS_CSS = `@import "tailwindcss";
@import "@constructive-io/ui/globals.css";
@source "../node_modules/@constructive-io/ui/dist";`;

const PROVIDERS_TSX = `'use client';

import type { ReactNode } from 'react';

import { BlocksRuntime } from '@/blocks/runtime/blocks-runtime';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BlocksRuntime namespaces={['auth']} getToken={() => localStorage.getItem('accessToken')}>
      {children}
    </BlocksRuntime>
  );
}`;

const SIGN_IN_PAGE_TSX = `'use client';

import { useRouter } from 'next/navigation';

import { SignInCard } from '@/blocks/auth/sign-in-card/sign-in-card';

export default function SignInPage() {
  const router = useRouter();
  return (
    <SignInCard
      showRememberMe
      forgotPasswordHref="/auth/forgot-password"
      signUpHref="/auth/sign-up"
      onSuccess={(result) => {
        if (result?.mfaRequired) return; // hand off to your MFA step
        router.push('/');
      }}
    />
  );
}`;

export default function GettingStartedPage() {
  const { prev, next } = getAdjacent(HREF);
  return (
    <DocPage title={TITLE} description={DESCRIPTION} prev={prev} next={next}>
      <p className={proseCls}>
        By the end of this page the <InlineCode>auth-sign-in-card</InlineCode> block is rendering in a Next.js app,
        signing users in against your API through your generated SDK. Work through the steps in order — every command
        and config below is real. You need a Next.js app on Tailwind v4 and the shadcn CLI (
        <InlineCode>npx shadcn@latest</InlineCode>); the data block also binds to your app’s generated Constructive SDK,
        a one-time host prerequisite grounded in step 3.
      </p>

      <DocSection
        id="add-the-namespace"
        title="1. Add the registry namespace"
        intro="Map the @constructive namespace once so every install command on this site resolves."
      >
        <div className="space-y-4">
          <p className={proseCls}>
            Every block here installs as <InlineCode>@constructive/&lt;block&gt;</InlineCode>. Add the namespace to your
            project’s <InlineCode>components.json</InlineCode>:
          </p>
          <CodeBlock lang="json" filename="components.json" code={COMPONENTS_JSON} />
          <p className={proseCls}>
            That is the only registry setup. The shadcn CLI now resolves{' '}
            <InlineCode>@constructive/&lt;block&gt;</InlineCode> to the hosted registry.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="ui-foundation"
        title="2. Install the UI foundation"
        intro="Blocks import their primitives from @constructive-io/ui. Install it as a real dependency, then let Next transpile it and Tailwind scan its source."
      >
        <div className="space-y-4">
          <p className={proseCls}>
            Add <InlineCode>@constructive-io/ui</InlineCode> as a dependency:
          </p>
          <CodeBlock lang="bash" code="pnpm add @constructive-io/ui" />
          <p className={proseCls}>
            Then transpile it and point Tailwind at its source — without the <InlineCode>@source</InlineCode> line,
            dialogs, menus, and popovers render unstyled because Tailwind never sees their class names:
          </p>
          <CodeBlock lang="ts" filename="next.config.ts" code={NEXT_CONFIG} />
          <CodeBlock lang="css" filename="app/globals.css" code={GLOBALS_CSS} />
        </div>
      </DocSection>

      <DocSection
        id="generated-sdk"
        title="3. Provide the generated SDK"
        intro="Data blocks bind to your generated Constructive SDK — they do not ship it. Make it resolve at @/generated/<namespace>, then point it at your API."
      >
        <div className="space-y-4">
          <p className={proseCls}>
            Every data block calls a generated React-Query hook from{' '}
            <InlineCode>@/generated/&lt;namespace&gt;</InlineCode> — for the sign-in card,{' '}
            <InlineCode>useSignInMutation</InlineCode> from <InlineCode>@/generated/auth</InlineCode>. That SDK is your
            app’s, produced by your Constructive GraphQL codegen and aliased to <InlineCode>@/generated/*</InlineCode>.
            It is a one-time host prerequisite — neither a block nor the runtime generates it for you.
          </p>
          <p className={proseCls}>Then set the endpoint the runtime reads for that namespace:</p>
          <CodeBlock
            lang="bash"
            filename=".env.local"
            code="NEXT_PUBLIC_AUTH_GRAPHQL_ENDPOINT=https://your-api.example.com/graphql"
          />
          <p className={proseCls}>
            Aliasing <InlineCode>@/generated/*</InlineCode> in your <InlineCode>tsconfig.json</InlineCode> is covered in{' '}
            <DocLink href="/blocks/guides/adapter">Wire a GraphQL adapter</DocLink>; for why blocks bind to the host SDK
            this way, see <DocLink href="/blocks/concepts/runtime-contract">the runtime contract</DocLink>.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="mount-the-runtime"
        title="4. Mount the runtime"
        intro="BlocksRuntime is the one wiring point: it configures every namespace and shares a QueryClient so blocks never touch providers or endpoints. Mount it once at your app root."
      >
        <div className="space-y-4">
          <InstallField url="@constructive/blocks-runtime" />
          <CodeBlock lang="tsx" filename="app/providers.tsx" code={PROVIDERS_TSX} />
          <p className={proseCls}>
            Render <InlineCode>&lt;Providers&gt;</InlineCode> around your app in your root layout the usual way.{' '}
            <InlineCode>getToken</InlineCode> may return <InlineCode>null</InlineCode> when nobody is signed in —
            expected; the runtime simply omits the auth header. For the full contract — what it configures, extra
            namespaces, step-up, passkeys — see{' '}
            <DocLink href="/blocks/concepts/runtime-contract">the runtime contract</DocLink>.
          </p>
          <p className="text-caption text-muted-foreground">
            You can skip this explicit install — the runtime ships automatically with your first block in the next step.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="install-a-block"
        title="5. Install your first block"
        intro="Add the sign-in card with the standard shadcn CLI."
      >
        <div className="space-y-4">
          <InstallField url="@constructive/auth-sign-in-card" />
          <p className={proseCls}>
            This copies the block’s source into your project and pulls in anything it declares as a dependency
            (including <InlineCode>blocks-runtime</InlineCode>). The source is yours to edit afterward.
          </p>
        </div>
      </DocSection>

      <DocSection id="render-it" title="6. Render it" intro="Drop the block into a page and sign in.">
        <div className="space-y-4">
          <p className={proseCls}>
            Import <InlineCode>SignInCard</InlineCode> and render it. Through the runtime you mounted, it calls{' '}
            <InlineCode>useSignInMutation</InlineCode> against your API:
          </p>
          <CodeBlock lang="tsx" filename="app/(auth)/sign-in/page.tsx" code={SIGN_IN_PAGE_TSX} />
          <p className={proseCls}>
            Sign in with a valid account: the card validates input, calls your API, surfaces server errors inline, and
            routes home on success. That is the whole loop — the block is wired and yours to restyle.
          </p>
        </div>
      </DocSection>

      <DocSection
        id="next"
        title="Where to go next"
        intro="One block works. Here is where the rest of the registry lives."
      >
        <ul className="space-y-2.5">
          <li className={proseCls}>
            Install a whole capability at once with a{' '}
            <DocLink href="/blocks/flows/authentication/email-password">flow</DocLink> — it lists the database modules
            to provision and every block for that capability in one command.
          </li>
          <li className={proseCls}>
            Make a block match your design with the <DocLink href="/blocks/guides/theming">theming guide</DocLink>.
          </li>
          <li className={proseCls}>
            Pick any block in the sidebar for its reference page — props, the messages it ships, and the SDK operations
            it requires.
          </li>
        </ul>
      </DocSection>
    </DocPage>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase(HREF) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: withBase(HREF), images: [OG_IMAGE] },
};
