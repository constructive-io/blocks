/**
 * ui-content — Core family.
 *
 * Per-item docs content for the `ui` category pages. See ./index.mjs for the
 * full contract. `intro: null` / `usage: null` means "not yet authored" — the
 * generator skips the page and the parity test fails until it is filled in.
 */

export const ITEMS = {
  'button': {
    tier: 'showcase',
    intro: `The primary action trigger — a click that submits a form, opens a dialog, or runs a mutation.`,
    usage: `import { Button } from '@constructive-io/ui/button';

export function Example() {
  return <Button>Create database</Button>;
}`,
    props: [
      {
        name: 'variant',
        type: `'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive' | 'destructive-outline'`,
        default: `'default'`,
        description: 'Semantic variant — primary action, secondary, outline, ghost, link, or destructive.',
      },
      {
        name: 'size',
        type: `'default' | 'xs' | 'sm' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-lg'`,
        default: `'default'`,
        description: 'Height and padding. The `icon` sizes render a square button for a single glyph.',
      },
      {
        name: 'asChild',
        type: `boolean`,
        default: `false`,
        description: 'Merge the button styling onto the single child element instead of rendering a `button` — use it to style a link.',
      },
      { name: 'disabled', type: `boolean`, default: `false`, description: 'Dims the button and blocks interaction.' },
    ],
  },
  'badge': {
    tier: 'showcase',
    intro: `A small inline pill for status, counts, or labels — tag a row \`active\`, \`3 members\`, or a plan name.`,
    usage: `import { Badge } from '@constructive-io/ui/badge';

export function Example() {
  return <Badge variant="success">Active</Badge>;
}`,
    props: [
      {
        name: 'variant',
        type: `'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info' | 'error'`,
        default: `'default'`,
        description: 'Color treatment. The `success` / `warning` / `info` / `error` tints are tuned for status.',
      },
      { name: 'size', type: `'default' | 'sm' | 'lg'`, default: `'default'`, description: 'Text size and padding.' },
    ],
  },
  'label': {
    tier: 'showcase',
    intro: `A caption for a form control — pair it with an input via \`htmlFor\` so clicking the text focuses the field.`,
    usage: `import { Label } from '@constructive-io/ui/label';

export function Example() {
  return <Label htmlFor="org-name">Organization name</Label>;
}`,
    props: [
      {
        name: 'htmlFor',
        type: `string`,
        description: 'The `id` of the control this label describes — wires up click-to-focus and accessibility.',
      },
    ],
  },
  'skeleton': {
    tier: 'showcase',
    intro: `A pulsing placeholder shown while content loads — shape it like the eventual rows or cards so the layout stays steady.`,
    usage: `import { Skeleton } from '@constructive-io/ui/skeleton';

export function Example() {
  return <Skeleton className="h-4 w-48" />;
}`,
    props: [
      {
        name: 'className',
        type: `string`,
        description: 'Sets the size and shape — give it a width, height, and rounding to match the content it stands in for.',
      },
    ],
  },
  'card': {
    tier: 'showcase',
    intro: `A bordered surface that groups related content into stat tiles, settings panels, or list items with a consistent frame.`,
    usage: `import { Card, CardHeader, CardTitle, CardContent } from '@constructive-io/ui/card';

export function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Production database</CardTitle>
      </CardHeader>
      <CardContent>Connected · 12 tables</CardContent>
    </Card>
  );
}`,
    props: [
      {
        name: 'variant',
        type: `'default' | 'elevated' | 'flat' | 'ghost' | 'interactive'`,
        default: `'default'`,
        description: 'Shadow and border treatment. `interactive` adds a hover lift for clickable cards.',
      },
    ],
    parts: [
      { name: 'CardHeader', description: 'Top region; holds the title, description, and an optional action.' },
      { name: 'CardTitle', description: 'The card heading.' },
      { name: 'CardDescription', description: 'Muted supporting text under the title.' },
      { name: 'CardAction', description: 'A control pinned to the top-right of the header.' },
      { name: 'CardContent', description: 'The main body of the card.' },
      { name: 'CardFooter', description: 'Bottom region, typically for actions.' },
    ],
  },
  'separator': {
    tier: 'showcase',
    intro: `A thin rule that divides content — between sections of a panel or inline between meta items.`,
    usage: `import { Separator } from '@constructive-io/ui/separator';

export function Example() {
  return <Separator />;
}`,
    props: [
      {
        name: 'orientation',
        type: `'horizontal' | 'vertical'`,
        default: `'horizontal'`,
        description: 'Direction of the rule. Vertical separators need a parent height to render against.',
      },
    ],
  },
  'alert': {
    tier: 'showcase',
    intro: `A callout for an inline message right in the layout — a tip, a warning, or an error summary.`,
    usage: `import { Alert, AlertTitle, AlertDescription } from '@constructive-io/ui/alert';

export function Example() {
  return (
    <Alert>
      <AlertTitle>Changes saved</AlertTitle>
      <AlertDescription>Your schema is now live.</AlertDescription>
    </Alert>
  );
}`,
    props: [
      {
        name: 'variant',
        type: `'default' | 'destructive'`,
        default: `'default'`,
        description: 'Use `destructive` to signal an error or a risky outcome.',
      },
    ],
    parts: [
      { name: 'AlertTitle', description: 'The short headline of the callout.' },
      { name: 'AlertDescription', description: 'The body text of the callout.' },
    ],
  },
  'unlink-button': {
    tier: 'showcase',
    intro: `A compact icon button for detaching a linked record — clearing a relation field or removing a row from a join.`,
    usage: `import { UnlinkButton } from '@constructive-io/ui/unlink-button';

export function Example() {
  return <UnlinkButton onUnlink={() => {}} aria-label="Unlink owner" />;
}`,
    props: [
      { name: 'onUnlink', type: `() => void`, required: true, description: 'Called when the button is pressed.' },
      { name: 'isUnlinking', type: `boolean`, default: `false`, description: 'Swaps the icon for a spinner and disables the button.' },
      { name: 'variant', type: `'ghost' | 'destructive'`, default: `'ghost'`, description: 'Visual emphasis of the button.' },
      { name: 'size', type: `'xs' | 'sm'`, default: `'xs'`, description: 'Button footprint.' },
    ],
  },
};
