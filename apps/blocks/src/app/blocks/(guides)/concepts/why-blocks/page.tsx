/**
 * Why blocks — Diátaxis Explanation (understanding-oriented).
 *
 * The value proposition: a block is a full-stack, data-wired leaf, not a
 * primitive. Understanding-oriented prose only — no step-by-step. The "how" lives
 * in the Tutorial (`getting-started`) and the How-to guides; this page is about
 * why the model is shaped the way it is. Grounded in the real reference block
 * (`src/blocks/auth/sign-in-card`) and the registry build (`apps/registry`).
 */

import type { Metadata } from 'next';

import { CodeBlock } from '@/components/docs/code-block';
import { DocPage } from '@/components/docs/doc-page';
import { DocSection } from '@/components/docs/doc-section';
import { DocLink, InlineCode, Prose } from '@/components/docs/prose';
import { GUIDES } from '@/lib/docs/guides-meta';
import { getAdjacent } from '@/lib/docs/registry';
import { OG_IMAGE, withBase } from '@/lib/site';

const meta = GUIDES.find((g) => g.slug === 'why-blocks');
const HREF = meta?.href ?? '/blocks/concepts/why-blocks';
const TITLE = meta?.title ?? 'Why blocks';
const DESCRIPTION =
  meta?.description ??
  'Most registries ship a component’s shape and leave the data path to you. A block ships both — the markup and its binding to your generated SDK.';

export default function WhyBlocksPage() {
  const { prev, next } = getAdjacent(HREF);
  return (
    <DocPage title={TITLE} description={DESCRIPTION} prev={prev} next={next}>
      <DocSection title="The gap a primitive leaves">
        <Prose>
          <p>
            A component registry usually gives you a shape. It hands you a button, a dialog, a form — the markup, the
            styles, the accessible behavior — and stops at the edge of the network. The shape is the easy part. The hard
            part is everything behind it.
          </p>
          <p>
            Take a sign-in form. The shape is two inputs and a button. What you actually write is the mutation, the
            pending state, the error mapping, the success branch, the field validation, the “your email isn’t verified
            yet” path, the MFA hand-off. That is the work. A shape-only registry ships the{' '}
            <strong className="font-medium text-foreground">20%</strong> that was never the problem and leaves you the{' '}
            <strong className="font-medium text-foreground">80%</strong> that was.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="A block is a full-stack leaf">
        <Prose>
          <p>
            A block closes that gap. It is a copy-in React component whose data path is already wired to your
            application’s generated SDK. It calls a generated React Query hook —{' '}
            <InlineCode>useSignInMutation</InlineCode>, <InlineCode>useEmailsQuery</InlineCode>, and so on — imported
            from <InlineCode>@/generated/&lt;namespace&gt;</InlineCode>. There is no <InlineCode>fetch</InlineCode>, no
            GraphQL document string, no query client to thread through, and no hardcoded URL anywhere in the file.
          </p>
        </Prose>
        <div className="mt-5">
          <CodeBlock
            lang="tsx"
            code={`import { useSignInMutation } from '@/generated/auth';

// The hook IS the data path — typed, cached, bound to your SDK.
const signIn = useSignInMutation({ selection: { fields: { result: { select: { accessToken: true } } } } });
const data = await signIn.mutateAsync({ input: { email, password } });

// No fetch. No GraphQL string. No URL. No provider mounted here.`}
          />
        </div>
        <Prose>
          <p className="text-pretty mt-5">
            The result is a leaf that already does the full job. The{' '}
            <DocLink href="/blocks/auth/sign-in-card">sign-in card</DocLink> validates input, maps the server’s error
            codes to copy you can override, branches on unverified and MFA-required states, and renders the loading and
            error UI inline. You install one thing and the surface works end to end.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="It’s yours after install">
        <Prose>
          <p>
            A block is copy-in, not a dependency. The shadcn CLI lands the source in your working tree. From that moment
            it is your file — read it, edit it, fork it, delete the half you don’t need. It is not a black box you
            import and hope holds at runtime.
          </p>
          <p>
            That matters because the data path is exactly the code you most often need to bend. When the binding lives
            in source you own, bending it is an edit, not an escape hatch. The registry’s job is to give you a correct,
            complete starting point — not to keep owning the code after you’ve taken it.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="Seams, not forks">
        <Prose>
          <p>
            Owning the source doesn’t mean editing it is the only way to change behavior. Every block exposes seams. The
            data path has an override — <InlineCode>onSubmit</InlineCode> — that fully replaces the generated-hook call,
            so the same block runs against a non-Constructive backend without a fork. Notifications have seams too:{' '}
            <InlineCode>onSuccess</InlineCode>, <InlineCode>onError</InlineCode>, and <InlineCode>onMessage</InlineCode>{' '}
            always fire, so you wire toasts, redirects, or analytics from the outside.
          </p>
          <p>
            The default is the wired hook, so a block works the moment you install it. The seams are there for the day
            your app needs something the default didn’t assume. You reach for a fork last, not first.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="Built on a foundation you can use directly">
        <Prose>
          <p>
            Blocks aren’t monoliths. Each one composes the same{' '}
            <DocLink href="/blocks/ui/button">UI foundation</DocLink> — buttons, cards, inputs, overlays from{' '}
            <InlineCode>@constructive-io/ui</InlineCode> — plus small foundation libraries like{' '}
            <DocLink href="/blocks/lib/auth-errors">auth-errors</DocLink> and shared form primitives. Installing a block
            pulls that graph in with it.
          </p>
          <p>
            Because the foundation is in the registry too, nothing about a block is hidden from you. You can install a
            primitive on its own, read how a block uses it, and stay inside one coherent system whether you’re
            assembling from parts or dropping in a finished surface.
          </p>
          <p>
            That’s the whole argument. When the data path is the hard part, shipping only the shape isn’t generosity —
            it’s handing back the easy 20%. Blocks ship the 80%, and leave it in your hands.
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
