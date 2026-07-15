/**
 * Design & motion — Diátaxis Explanation (understanding-oriented).
 *
 * The calm visual system and the motion philosophy behind it: elevation via a
 * paired surface/shadow ladder (not borders or color), one accent, a compressed
 * type scale, and motion that answers "why". Understanding-oriented prose only —
 * no step-by-step. Grounded in `src/app/globals.css` (the token system) and
 * RESEARCH §3 (the emilkowalski motion standards). The one CodeBlock mirrors the
 * real motion tokens in `globals.css`.
 */

import type { Metadata } from 'next';

import { CodeBlock } from '@/components/docs/code-block';
import { DocPage } from '@/components/docs/doc-page';
import { DocSection } from '@/components/docs/doc-section';
import { DocLink, InlineCode, Prose } from '@/components/docs/prose';
import { GUIDES } from '@/lib/docs/guides-meta';
import { getAdjacent } from '@/lib/docs/registry';
import { OG_IMAGE, withBase } from '@/lib/site';

const meta = GUIDES.find((g) => g.slug === 'design-and-motion');
const HREF = meta?.href ?? '/blocks/concepts/design-and-motion';
const TITLE = meta?.title ?? 'Design & motion';
const DESCRIPTION =
  meta?.description ??
  'The system is calm on purpose: elevation from shadow, one accent, a compressed scale, and motion that carries information rather than decoration.';

export default function DesignAndMotionPage() {
  const { prev, next } = getAdjacent(HREF);
  return (
    <DocPage title={TITLE} description={DESCRIPTION} prev={prev} next={next}>
      <DocSection title="Calm by construction">
        <Prose>
          <p>
            The look is near-monochrome and dark-first. The canvas is a cool charcoal; surfaces and text are neutral.
            The only chromatic color in the whole interface is a single accent —{' '}
            <strong className="font-medium text-foreground">Constructive blue</strong> — and it earns its place by being
            rare: a focus ring, the active nav row, a link, a “new” dot. When one color means “pay attention,” attention
            is cheap to direct.
          </p>
          <p>
            What you won’t find is decoration standing in for hierarchy. No gradients, no glow, no second accent
            competing for the eye. Light mode exists and stays functional, but the system was tuned in the dark, where
            restraint shows up fastest.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="Elevation is shadow, not chrome">
        <Prose>
          <p>
            Depth is carried by shadow, not by outlines. The system defines an eight-step surface ladder paired
            one-to-one with a shadow ladder: <InlineCode>bg-surface-3</InlineCode> goes with{' '}
            <InlineCode>shadow-surface-3</InlineCode>, and so on up. A card reads as lifted because of the soft, layered
            shadow beneath it — not because a heavy border boxes it in.
          </p>
          <p>
            Borders still exist, but as hairlines. A border is the foreground color mixed roughly twelve percent into
            transparency, used faint — a quiet seam between regions, not a frame around them. The result is surfaces
            that feel placed in space rather than drawn on a page.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="A compressed scale">
        <Prose>
          <p>
            Type runs small and dense. <strong className="font-medium text-foreground">13px is the workhorse</strong> —
            navigation, body copy, table cells, inputs all live there. Page titles step up to 28px, section headings to
            16px, and captions down to 12 and 11 for badges. It’s all Geist; weight and size do the hierarchy, never a
            third typeface.
          </p>
          <p>
            Small type rewards small habits. Headings balance so they don’t leave a lonely last word; body wraps pretty;
            numbers in tables use tabular figures so columns line up. Tight density and generous whitespace aren’t
            opposites here — the type is compact so the space around it can be open.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="Motion is information">
        <Prose>
          <p>
            Motion follows one rule: every animation has to answer <em>why</em>. Spatial continuity, a state change,
            feedback for an action, or softening a jarring jump — those are reasons. “It looks cool” is not, and on a
            frequent element it’s a cost. So the test comes before the animation: an action you take dozens of times a
            day, or trigger from the keyboard, gets <strong className="font-medium text-foreground">no</strong> motion;
            a modal or drawer you open occasionally can afford a little.
          </p>
          <p>
            The mechanics fall out of that. Animate only <InlineCode>transform</InlineCode> and{' '}
            <InlineCode>opacity</InlineCode>, never layout properties — those are smooth and cheap; width and margin are
            neither. Entrances ease out; interaction feedback stays under 200ms so the interface never feels like it’s
            waiting on itself. And reduced-motion is honored as the framework means it: fewer and gentler, not zero —
            opacity and color stay, movement drops.
          </p>
        </Prose>
      </DocSection>

      <DocSection title="Tokens, not magic numbers">
        <Prose>
          <p>
            Consistency here isn’t willpower, it’s tokens. Durations and easing curves are CSS variables, and every
            component consumes them — <InlineCode>var(--ease-out)</InlineCode>,{' '}
            <InlineCode>duration-[var(--dur)]</InlineCode> — instead of hand-picking a number. Three duration tiers and
            a small set of strong curves cover the whole interface, so motion is reviewable in one place rather than
            scattered across files.
          </p>
        </Prose>
        <div className="mt-5">
          <CodeBlock
            lang="css"
            filename="globals.css"
            code={`/* Strong curves — built-in easings are too weak; never ease-in on UI. */
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);    /* enter / exit */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);   /* on-screen move / morph */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);    /* drawers / sheets */

/* "Bigger thing moves, slower spring" — three tiers, nothing in between. */
--dur-fast: 120ms;  /* hover, focus, taps */
--dur:      160ms;  /* dropdowns, tabs, accordion */
--dur-slow: 240ms;  /* dialogs, drawers, stepped flows */`}
          />
        </div>
        <Prose>
          <p className="mt-5">
            Calm isn’t the absence of design — it’s the discipline of it. The same restraint shapes the blocks you
            install: they inherit these tokens, so a surface dropped into your app reads the way the rest of it does.
            Retune those tokens for your brand and every block follows — that recipe is{' '}
            <DocLink href="/blocks/guides/theming">Theme to your brand</DocLink>. For why those blocks carry their data
            path with them, see <DocLink href="/blocks/concepts/why-blocks">why blocks</DocLink>.
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
