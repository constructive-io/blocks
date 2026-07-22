import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@constructive-io/ui/badge';

import { CodeBlock } from '@/components/docs/code-block';
import { registryAdd } from '@/lib/install-mode';
import { OG_IMAGE, withBase } from '@/lib/site';

const TITLE = 'Console Kit for Next.js';
const DESCRIPTION =
  'A full-page, route-neutral Constructive application console composed from the app shell and seven feature packs.';

const CONSOLE_EXAMPLE = `'use client';

import { ConsoleKit } from '@/blocks/console-kit/console-kit';
import type { ConsoleKitConfig } from '@/blocks/console-kit/console-kit-contracts';

const config = {
  databaseId,
  endpoints: {
    data: { id: 'tenant-data', url: dataGraphqlUrl },
    auth: { id: 'tenant-auth', url: authGraphqlUrl },
    admin: { id: 'tenant-admin', url: adminGraphqlUrl }
  },
  session: {
    mode: 'embedded',
    getSnapshot: sessionStore.getSnapshot,
    subscribe: sessionStore.subscribe,
    getAccessToken: ({ endpoint, signal }) =>
      tokenBroker.getAccessToken({ endpoint, signal })
  },
  adapters: {
    auth: authAdapter,
    users: usersAdapter,
    organizations: organizationsAdapter,
    storage: storageAdapter,
    billing: billingAdapter,
    notifications: notificationsAdapter
  },
  routes: {
    activeFeature,
    getFeatureHref: (feature) => \`/console/\${feature}\`,
    onNavigate: (feature) => router.push(\`/console/\${feature}\`),
    renderLink: ({ href, ...props }) => <Link href={href} {...props} />
  }
} satisfies ConsoleKitConfig;

export function ApplicationConsole() {
  return <ConsoleKit config={config} />;
}`;

const ENDPOINT_RESOLVER_EXAMPLE = `resolveEndpoint: ({ databaseId, kind }) => ({
  id: \`\${databaseId}:\${kind}\`,
  url: endpointDirectory.graphqlUrl(databaseId, kind)
})`;

export default function ConsoleKitPage() {
  return (
    <article className="registry-page">
      <header className="mb-10 max-w-3xl">
        <p className="registry-eyebrow">Application kit</p>
        <h1 className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]">
          Console Kit for Next.js
        </h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {DESCRIPTION} It owns the console composition and discovery lifecycle,
          while your app keeps control of endpoint resolution, identity, routing,
          and provider-specific operations.
        </p>
      </header>

      <div className="flex flex-col gap-12 lg:gap-14">
        <section aria-labelledby="console-install-heading">
          <div className="mb-4 max-w-3xl">
            <h2
              id="console-install-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Install the full console
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              One registry item installs the Console Kit, all seven feature
              packs, its modular Zustand store, the runtime and catalog
              contracts, and the shadcn Base UI app shell dependency graph.
            </p>
          </div>
          <CodeBlock label="shadcn CLI">
            {registryAdd('console-kit-nextjs')}
          </CodeBlock>
        </section>

        <section aria-labelledby="console-host-contract-heading">
          <div className="mb-4 max-w-3xl">
            <h2
              id="console-host-contract-heading"
              className="text-lg font-semibold tracking-tight"
            >
              The host owns three boundaries
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              The kit does not read environment globals or create a singleton
              GraphQL client. Its configuration makes every deployment-specific
              boundary explicit, which keeps tenant changes and token rotation
              observable to the runtime.
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {[
              {
                title: 'Endpoints',
                badge: 'data · auth · admin',
                body: 'Pass a map for fixed deployments or resolve each endpoint from databaseId and endpoint kind at runtime.'
              },
              {
                title: 'Session',
                badge: 'embedded · standalone',
                body: 'Expose a subscribable identity snapshot and resolve a fresh access token for every endpoint request.'
              },
              {
                title: 'Adapters',
                badge: 'resources · actions',
                body: 'Bind feature-pack props to provider-specific loaders and mutations without moving authorization into the UI.'
              }
            ].map((boundary) => (
              <div
                key={boundary.title}
                className="rounded-xl border border-border/60 bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-foreground">
                    {boundary.title}
                  </h3>
                  <Badge variant="outline">{boundary.badge}</Badge>
                </div>
                <p className="mt-2 text-pretty text-xs leading-5 text-muted-foreground">
                  {boundary.body}
                </p>
              </div>
            ))}
          </div>

          <CodeBlock
            className="mt-4"
            label="app/console/application-console.tsx"
            language="tsx"
          >
            {CONSOLE_EXAMPLE}
          </CodeBlock>

          <div className="mt-4 max-w-3xl">
            <p className="text-pretty text-sm leading-7 text-muted-foreground">
              Use an endpoint resolver when URLs depend on the selected
              database or deployment. Endpoint fallback is intentionally opt-in,
              so an admin operation cannot silently cross onto the data endpoint.
            </p>
            <CodeBlock className="mt-3" label="Dynamic endpoint resolution">
              {ENDPOINT_RESOLVER_EXAMPLE}
            </CodeBlock>
          </div>
        </section>

        <section aria-labelledby="console-store-heading">
          <div className="mb-4 max-w-3xl">
            <h2
              id="console-store-heading"
              className="text-lg font-semibold tracking-tight"
            >
              One store, modular slices
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Each Console Kit instance creates one Zustand vanilla store and
              composes navigation, runtime, and adapter slices into it. The
              store is scoped to the mounted console, so server renders and
              multiple consoles cannot leak identity or navigation state across
              instances. Pass a pre-created store only when the host needs to
              subscribe to or test console state directly.
            </p>
          </div>
          <CodeBlock label="Optional host-owned store" language="tsx">
            {`const [consoleStore] = React.useState(() =>
  createConsoleKitStore('data')
);

return <ConsoleKit config={config} store={consoleStore} />;`}
          </CodeBlock>
        </section>

        <section aria-labelledby="console-meta-heading">
          <div className="mb-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="console-meta-heading"
                className="text-lg font-semibold tracking-tight"
              >
                Metadata is a compatibility gate
              </h2>
              <Badge variant="info">_meta 2026-07</Badge>
            </div>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Before loading data-backed features, the runtime checks standard
              GraphQL introspection and Constructive&apos;s versioned{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                _meta
              </code>{' '}
              response. This release accepts contract version{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                2026-07
              </code>{' '}
              only; unversioned or incompatible metadata stops feature loading
              instead of guessing at table and mutation shapes.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4">
            <ol className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Preflight',
                  body: 'Resolve the data endpoint and read a fresh token from the active session.'
                },
                {
                  title: 'Discover',
                  body: 'Load the _meta contract plus GraphQL root operations, types, and input objects.'
                },
                {
                  title: 'Expose',
                  body: 'Show application tables and feature navigation only when their required contract is present.'
                }
              ].map((step, index) => (
                <li key={step.title} className="min-w-0">
                  <span className="font-mono text-xs text-primary">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-1.5 text-sm font-medium text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="console-shell-heading">
          <div className="mb-4 max-w-3xl">
            <h2
              id="console-shell-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Route-neutral app shell
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Console Kit composes the Constructive App Shell, App Bar, and the
              shadcn Base UI Sidebar. The shell renders typed navigation,
              breadcrumbs, brand, account actions, search, and action slots, but
              links remain plain anchors until your host supplies a Next.js or
              other framework renderer.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <CodeBlock label="Install the shell without Console Kit">
              {`${registryAdd('app-shell')}\n${registryAdd('app-bar')}`}
            </CodeBlock>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="text-sm font-medium text-foreground">
                Compose only what you need
              </h3>
              <p className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">
                Use the shell directly for a custom application, install a
                focused pack for one workflow, or start with Console Kit when
                you want the complete discovery and navigation layer.
              </p>
              <Link
                href="/blocks/features"
                className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-primary outline-none underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Browse feature packs
              </Link>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase('/blocks/console-kit') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: withBase('/blocks/console-kit'),
    images: [OG_IMAGE]
  }
};
