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

import {
  ConstructiveConsoleKit,
  type ConstructiveTenantDatabase
} from '@/blocks/console-kit/constructive';

type TenantEndpoint = Readonly<{
  apiId: string | null;
  url: string | null;
  routable: boolean;
}>;

type TenantManifest = Readonly<{
  database: Readonly<{ id: string; name: string }>;
  endpoints: Readonly<Record<
    'data' | 'auth' | 'admin' | 'billing' | 'storage' | 'notifications',
    TenantEndpoint
  >>;
  tableAllowlist: readonly string[];
}>;

function routed(endpoint: TenantEndpoint) {
  return endpoint.routable && endpoint.apiId && endpoint.url
    ? { id: endpoint.apiId, url: endpoint.url }
    : undefined;
}

export function ApplicationConsole({ tenant }: Readonly<{ tenant: TenantManifest }>) {
  const database: ConstructiveTenantDatabase = {
    id: tenant.database.id,
    name: tenant.database.name,
    endpoints: {
      data: routed(tenant.endpoints.data),
      auth: routed(tenant.endpoints.auth),
      admin: routed(tenant.endpoints.admin),
      billing: routed(tenant.endpoints.billing),
      storage: routed(tenant.endpoints.storage),
      notifications: routed(tenant.endpoints.notifications)
    },
    tableAllowlist: tenant.tableAllowlist
  };

  return <ConstructiveConsoleKit database={database} />;
}`;

const ENDPOINT_RESOLVER_EXAMPLE = `resolveEndpoint: ({ databaseId, kind }) => ({
  id: \`\${databaseId}:\${kind}\`,
  url: endpointDirectory.graphqlUrl(databaseId, kind)
})`;

const CSRF_PROVIDER_EXAMPLE = `import {
  ConstructiveConsoleKit,
  type ConstructiveTenantDatabase
} from '@/blocks/console-kit/constructive';
import type { ConsoleCsrfTokenProvider } from '@/blocks/console-runtime';

const csrfTokenProvider: ConsoleCsrfTokenProvider = async ({ databaseId, operation }) => {
  const response = await fetch('/api/constructive/auth/csrf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ databaseId, operation })
  });
  if (!response.ok) throw new Error('CSRF bootstrap failed.');
  const payload = await response.json() as { csrfToken: string };
  return payload.csrfToken;
};

export function HardenedTenantConsole({
  database
}: Readonly<{ database: ConstructiveTenantDatabase }>) {
  return (
    <ConstructiveConsoleKit
      database={database}
      csrfTokenProvider={csrfTokenProvider}
    />
  );
}`;

const EMAIL_VERIFICATION_EXAMPLE = `'use client';

import * as React from 'react';

import {
  ConstructiveConsoleKit,
  type ConstructiveTenantDatabase
} from '@/blocks/console-kit/constructive';

type VerificationCredential = Readonly<{ emailId: string; token: string }>;

export function VerificationConsole({
  database
}: Readonly<{ database: ConstructiveTenantDatabase }>) {
  const [credential, setCredential] =
    React.useState<VerificationCredential | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const emailId = fragment.get('email_id');
    const token = fragment.get('verification_token');
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search
    );
    setCredential(emailId && token ? { emailId, token } : null);
    setReady(true);
  }, []);

  if (!ready) return null;
  return (
    <ConstructiveConsoleKit
      database={database}
      verificationEmailId={credential?.emailId}
      verificationToken={credential?.token}
    />
  );
}`;

export default function ConsoleKitPage() {
  return (
    <article className="registry-page">
      <header className="mb-10 max-w-3xl">
        <p className="registry-eyebrow">Application kit</p>
        <h1 className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]">
          Console Kit for Next.js
        </h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {DESCRIPTION} Pass the secret-free tenant descriptor returned by
          provisioning; the first-party wrapper handles standalone auth,
          capability discovery, endpoint-scoped requests, and pack adapters.
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
              Start from the provisioned tenant contract
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              The canonical seeder manifest supplies the database ID, routable
              semantic endpoints, and exact application table allowlist. Keep
              credentials on the user side of the sign-in form; the descriptor
              itself is safe to pass from a server component to the client.
              A blank data-only tenant has no auth endpoint, so pass a host-owned
              database-scoped session for that tenant. Console Kit verifies the
              session database ID before using it and opens the Data feature
              without manufacturing anonymous authority.
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {[
              {
                title: 'Endpoints',
                badge: 'six semantic kinds',
                body: 'Pass only routable data, auth, admin, billing, storage, and notifications endpoints from the tenant manifest.'
              },
              {
                title: 'Session',
                badge: 'standalone default',
                body: 'The first-party wrapper scopes in-memory and browser session state to the database, then resolves a fresh token per request.'
              },
              {
                title: 'Adapters',
                badge: 'first-party included',
                body: 'Constructive adapters discover operations before enabling actions; use the lower-level ConsoleKit only for a custom provider.'
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
              Use the lower-level Console Kit endpoint resolver for embedded or
              non-Constructive providers. Endpoint fallback stays opt-in, so an
              admin operation cannot silently cross onto the data endpoint.
            </p>
            <CodeBlock className="mt-3" label="Dynamic endpoint resolution">
              {ENDPOINT_RESOLVER_EXAMPLE}
            </CodeBlock>
          </div>

          <div className="mt-6 max-w-3xl">
            <h3 className="text-sm font-medium text-foreground">
              Bootstrap CSRF for hardened auth
            </h3>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              When a tenant enables{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                require_csrf_for_auth
              </code>
              , pass an async token provider. Its host endpoint creates a
              short-lived anonymous session with a cryptographically random
              secret through a trusted backend connection and returns that
              secret once; Console Kit sends it only as the auth mutation&apos;s{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                csrfToken
              </code>
              . Constructive consumes the anonymous session after successful
              authentication, so the provider must mint a fresh token for each
              attempt and must never cache it in browser storage. The current
              backend revision still needs its anonymous-session bootstrap and
              generated revocation query fixed before this secure toggle can
              complete end to end.
            </p>
            <CodeBlock
              className="mt-3"
              label="Hardened auth token provider"
              language="tsx"
            >
              {CSRF_PROVIDER_EXAMPLE}
            </CodeBlock>
          </div>

          <div className="mt-6 max-w-3xl">
            <h3 className="text-sm font-medium text-foreground">
              Complete email verification in the host route
            </h3>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Unverified signed-in accounts can send a fresh verification
              email from Account security. Your verification route reads the{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                email_id
              </code>{' '}
              and{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                verification_token
              </code>{' '}
              values from a URL fragment and passes them to Console Kit; the auth
              adapter calls{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                verifyEmail
              </code>{' '}
              using the freshly delivered credential, including from a fresh signed-out
              browser. After sign-in, Console Kit reloads the account so the
              verified state is authoritative. Console Kit binds its send action
              to the signed-in account&apos;s loaded primary email, but the stock
              backend mutation is not owner-bound; direct GraphQL callers need
              the backend hardening documented below. Treat the token as a
              credential: generate or rewrite the public link so these values
              follow the URL&apos;s <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">#</code>,
              which keeps them out of the HTTP request, then scrub the fragment
              before mounting Console Kit.
            </p>
            <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground">
              Email delivery and link routing are separate deployment
              contracts. The stock local SMTP configuration currently emits{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                https://localhost/verify-email
              </code>{' '}
              without the Blocks development port. The live proof validates
              delivery, moves the extracted values through a client-only URL
              fragment, scrubs that fragment, deletes the token-bearing Mailpit
              message, and consumes the credential through
              its integration route. It does not claim that the stock link is
              directly clickable; production hosts must configure or rewrite
              the public verification URL to their own fragment-based route.
            </p>
            <CodeBlock
              className="mt-3"
              label="app/verify-email/verification-console.tsx"
              language="tsx"
            >
              {EMAIL_VERIFICATION_EXAMPLE}
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
