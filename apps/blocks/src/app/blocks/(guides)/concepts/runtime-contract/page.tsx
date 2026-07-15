/**
 * The runtime contract — Diátaxis Explanation (understanding-oriented).
 *
 * The host adapter/SDK binding that makes copy-in full-stack blocks possible: a
 * block ships its hook call but not the wiring; the host provides one runtime
 * (`blocks-runtime`) once, and every block resolves against it. The same seam is
 * why this site's previews run offline. Understanding-oriented prose only — no
 * step-by-step (the setup steps live in `getting-started`). Grounded in
 * `src/blocks/runtime/blocks-runtime.tsx`, `preview-provider.tsx`,
 * `docs-mock-adapter.ts`, and the generated `@/generated/<ns>` SDK.
 */

import type { Metadata } from 'next';

import { CodeBlock } from '@/components/docs/code-block';
import { DocPage } from '@/components/docs/doc-page';
import { DocSection } from '@/components/docs/doc-section';
import { DocLink, InlineCode, Prose } from '@/components/docs/prose';
import { GUIDES } from '@/lib/docs/guides-meta';
import { getAdjacent } from '@/lib/docs/registry';
import { OG_IMAGE, withBase } from '@/lib/site';

const meta = GUIDES.find((g) => g.slug === 'runtime-contract');
const HREF = meta?.href ?? '/blocks/concepts/runtime-contract';
const TITLE = meta?.title ?? 'The runtime contract';
const DESCRIPTION =
  meta?.description ??
  'A block ships its hook call, not its wiring. The host provides one runtime once, and every block — yours or shipped — resolves against it.';

export default function RuntimeContractPage() {
  const { prev, next } = getAdjacent(HREF);
  return (
    <DocPage title={TITLE} description={DESCRIPTION} prev={prev} next={next}>
      <DocSection title="What a block assumes">
        <Prose>
          <p>
            A data block does one data thing: it imports a generated hook from{' '}
            <InlineCode>@/generated/&lt;namespace&gt;</InlineCode> and calls it. It never mounts a provider, never calls{' '}
            <InlineCode>configure()</InlineCode> or <InlineCode>getClient()</InlineCode>, and never reads an auth token.
            Those are deliberate omissions. A leaf that wired its own client would fight every other leaf for control of
            the app’s data layer.
          </p>
          <p>
            So a block assumes a contract is already in place above it: a query client in context, its SDK namespace
            configured, and auth attached to outgoing requests. Give it that environment and it just works. The contract
            is the price of keeping each block a leaf — and it’s paid exactly once.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="One wiring point at the root">
        <Prose>
          <p>
            That contract has a name: <InlineCode>blocks-runtime</InlineCode>. You mount it once, near the root of your
            app, and it’s the only place this wiring lives. Every data block declares it as a dependency, so installing
            a block pulls the runtime in with it — you don’t go looking for it.
          </p>
          <p>
            It does three things and nothing else. It provides one shared query client — reusing the host’s existing
            provider if there is one, mounting its own if not, because two clients is the failure mode it exists to
            prevent. It calls each namespace’s generated <InlineCode>configure()</InlineCode>, pointing it at that
            namespace’s <InlineCode>NEXT_PUBLIC_&lt;NS&gt;_GRAPHQL_ENDPOINT</InlineCode>. And it attaches auth through a
            host-supplied <InlineCode>getToken</InlineCode>, read fresh on every request and sent as a Bearer header.
          </p>
        </Prose>
        <div className="mt-5">
          <CodeBlock
            lang="tsx"
            filename="app/providers.tsx"
            code={`import { BlocksRuntime } from '@/blocks/runtime/blocks-runtime';

// The entire contract, in one mount. Everything below it is a leaf.
<BlocksRuntime namespaces={['auth', 'admin']} getToken={() => tokenManager.getAccessToken()}>
  {children}
</BlocksRuntime>`}
          />
        </div>
        <Prose>
          <p className="mt-5">
            This page is about <em>why</em> the contract is shaped this way, not how to install it — the{' '}
            <DocLink href="/blocks/getting-started">getting-started</DocLink> tutorial covers the actual setup,
            including the environment variables and the auth pieces a block can’t ship for you.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="The adapter seam">
        <Prose>
          <p>
            Underneath, the binding is one small seam. Each generated SDK exposes{' '}
            <InlineCode>configure(&#123; adapter &#125;)</InlineCode>, and the SDK doesn’t care how a request travels —
            it just calls <InlineCode>adapter.execute(document, variables)</InlineCode> and reads back a typed result.
            The runtime supplies a Bearer-fetch adapter that reads the token on every call.
          </p>
          <p>
            “Every call” is the important part. A static header captured once at <InlineCode>configure()</InlineCode>{' '}
            time would go stale the moment a user logs in, refreshes, or logs out. Reading{' '}
            <InlineCode>getToken()</InlineCode> per request keeps the token honest across the whole session. And because
            the seam is just an adapter, the same blocks run against anything that can answer an operation — swap the
            adapter, keep the blocks. Putting that in practice — the default runtime or a custom adapter — is the{' '}
            <DocLink href="/blocks/guides/adapter">Wire a GraphQL adapter</DocLink> how-to.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="Why the previews here run offline">
        <Prose>
          <p>
            This site is the proof. Every live preview on these pages is a block running with no backend, and it works
            because the docs are themselves a host honoring the same contract. The preview provider mirrors{' '}
            <InlineCode>blocks-runtime</InlineCode> exactly — it mounts a query client and calls the same{' '}
            <InlineCode>configure()</InlineCode> — but hands the SDK a mock adapter instead of a fetch one.
          </p>
          <p>
            That mock matches each operation by the field name in its GraphQL document and returns canned fixtures;
            unmatched operations resolve empty, so a block falls back to its own default state rather than throwing.
            Zero network, real blocks. If the contract leaked — if a block reached past the adapter to its own fetch or
            its own client — these previews couldn’t exist. They do, which is the seam working.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="The override seam, one layer up">
        <Prose>
          <p>
            There’s a second seam above the adapter. Each block exposes an override — <InlineCode>onSubmit</InlineCode>{' '}
            and its siblings — that replaces the generated-hook call entirely, taking the same inputs and returning the
            same shape. The two seams answer different questions. The adapter makes a block <em>type</em>{' '}
            backend-agnostic: every instance in your app speaks to whatever the runtime points at. The override makes a
            single block <em>instance</em> backend-agnostic: this one form posts somewhere else, without disturbing the
            rest.
          </p>
          <p>
            Together that’s the whole trick. One contract at the root, a swappable adapter beneath it, and a
            per-instance override on top — and every block, the ones you wrote and the ones you installed, runs the same
            way. For where those blocks come from and how they ship, see the{' '}
            <DocLink href="/blocks/concepts/architecture">architecture</DocLink>.
          </p>
        </Prose>
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
