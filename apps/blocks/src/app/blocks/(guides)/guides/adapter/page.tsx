/**
 * How-to: Wire a GraphQL adapter (Diátaxis how-to — goal-oriented recipe).
 *
 * Implement the host runtime contract so installed blocks reach the host's
 * generated SDK. Grounded in the real seam: every namespace exposes
 * `configure({ adapter })`; `BlocksRuntime` (src/blocks/runtime/blocks-runtime.tsx)
 * is the batteries-included path; a custom `GraphQLAdapter` mirrors the shape of
 * its internal `BearerFetchAdapter`, and `preview-provider.tsx` shows the
 * configure()+QueryClient pairing a custom path needs.
 *
 * Server component: DocPage (client) → DocSection (server) → CodeBlock (async).
 */

import type { Metadata } from 'next';

import { CodeBlock } from '@/components/docs/code-block';
import { DocPage } from '@/components/docs/doc-page';
import { DocSection } from '@/components/docs/doc-section';
import { DocLink, InlineCode, proseCls, ResultCallout } from '@/components/docs/prose';
import { GUIDES } from '@/lib/docs/guides-meta';
import { getAdjacent } from '@/lib/docs/registry';
import { OG_IMAGE, withBase } from '@/lib/site';

const meta = GUIDES.find((g) => g.slug === 'adapter');
const HREF = meta?.href ?? '/blocks/guides/adapter';
const TITLE = meta?.title ?? 'Wire a GraphQL adapter';
const DESCRIPTION =
  meta?.description ?? 'Implement the host runtime contract so blocks reach your application’s generated SDK.';

export default function AdapterGuidePage() {
  const { prev, next } = getAdjacent(HREF);
  return (
    <DocPage title={TITLE} description={DESCRIPTION} prev={prev} next={next}>
      <p className={proseCls}>
        Every data block calls a generated React-Query hook that runs through one configured adapter. Provide that
        adapter once and every block reaches your endpoint with your auth. You have two ways: mount the
        batteries-included <InlineCode>BlocksRuntime</InlineCode>, or implement a custom{' '}
        <InlineCode>GraphQLAdapter</InlineCode>.
      </p>

      <DocSection
        title="1. Make the generated SDK resolve"
        intro="Blocks import their hook from @/generated/<namespace>. Generate the auth (and admin) SDK and alias @/generated/* to it, or installed blocks will not compile. This is part of the one-time host setup."
      >
        <CodeBlock
          lang="json"
          filename="tsconfig.json"
          code={`{
  "compilerOptions": {
    "paths": {
      "@/generated/auth": ["./src/generated/auth"],
      "@/generated/admin": ["./src/generated/admin"]
    }
  }
}`}
        />
        <p className="text-pretty mt-3 text-caption text-muted-foreground">
          Full host checklist: <DocLink href="/blocks/getting-started">Getting started</DocLink>.
        </p>
      </DocSection>

      <DocSection
        title="2. Mount BlocksRuntime (the default path)"
        intro="BlocksRuntime is the one wiring point: it builds a Bearer-fetch adapter from your endpoint env, calls each namespace's configure(), and provides a shared QueryClient. Mount it once at the app root."
      >
        <CodeBlock
          lang="tsx"
          filename="app/providers.tsx"
          code={`'use client';
import { BlocksRuntime } from '@/blocks/runtime/blocks-runtime';
import { tokenManager } from '@/lib/auth/token-manager';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BlocksRuntime namespaces={['auth', 'admin']} getToken={() => tokenManager.getAccessToken()}>
      {children}
    </BlocksRuntime>
  );
}`}
        />
        <p className={`mt-4 ${proseCls}`}>
          Set the endpoint per namespace. Note the <InlineCode>_GRAPHQL_</InlineCode> segment — that exact name is what
          the runtime reads.
        </p>
        <div className="mt-3">
          <CodeBlock
            lang="bash"
            filename=".env.local"
            code={`NEXT_PUBLIC_AUTH_GRAPHQL_ENDPOINT=https://api.example.com/graphql
NEXT_PUBLIC_ADMIN_GRAPHQL_ENDPOINT=https://api.example.com/graphql`}
          />
        </div>
      </DocSection>

      <DocSection
        title="3. Or implement a custom adapter"
        intro="Need a different transport — extra headers, request batching, a non-Constructive backend? Implement GraphQLAdapter. execute() receives the query document and variables and returns a { ok, data, errors } envelope; getEndpoint() reports the URL."
      >
        <CodeBlock
          lang="ts"
          filename="lib/my-adapter.ts"
          code={`import type { GraphQLAdapter, QueryResult } from '@/generated/auth';

export class MyAdapter implements GraphQLAdapter {
  constructor(
    private readonly endpoint: string,
    private readonly getToken: () => string | null,
  ) {}

  async execute<T>(document: string, variables?: Record<string, unknown>): Promise<QueryResult<T>> {
    const token = this.getToken();
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: \`Bearer \${token}\` } : {}),
      },
      body: JSON.stringify({ query: document, variables: variables ?? {} }),
    });
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (!res.ok || json.errors?.length) {
      return { ok: false, data: null, errors: json.errors ?? [{ message: res.statusText }] };
    }
    return { ok: true, data: json.data as T, errors: undefined };
  }

  getEndpoint(): string {
    return this.endpoint;
  }
}`}
        />
      </DocSection>

      <DocSection
        title="4. Configure it with a QueryClient"
        intro="Register your adapter with each namespace during render — before any block mounts — and keep a QueryClientProvider above the tree, since blocks instantiate their hook at render time. This is exactly what this site's preview provider does to run blocks offline."
      >
        <CodeBlock
          lang="tsx"
          filename="app/providers.tsx"
          code={`'use client';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configure as configureAuth } from '@/generated/auth';
import { configure as configureAdmin } from '@/generated/admin';
import { MyAdapter } from '@/lib/my-adapter';
import { tokenManager } from '@/lib/auth/token-manager';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    const adapter = new MyAdapter('https://api.example.com/graphql', () => tokenManager.getAccessToken());
    configureAuth({ adapter });
    configureAdmin({ adapter });
    return new QueryClient();
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}`}
        />
      </DocSection>

      <ResultCallout>
        Drop in any data block and its generated hook resolves against your endpoint — no fetch code and no GraphQL
        strings in the block. The reasoning behind the seam lives in{' '}
        <DocLink href="/blocks/concepts/runtime-contract">The runtime contract</DocLink>.
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
