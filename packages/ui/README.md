# @constructive-io/ui

A modern React component library built on [Base UI](https://base-ui.com/) primitives and [Tailwind CSS v4](https://tailwindcss.com/).

## Installation

```bash
npm install @constructive-io/ui
# or
pnpm add @constructive-io/ui
```

### Peer Dependencies

The root barrel exports the complete component library, so its runtime peers are
required (modern npm and pnpm releases install them automatically). If your
package manager does not auto-install peers, add them explicitly:

```bash
pnpm add @base-ui/react @internationalized/date @remixicon/react \
  @use-gesture/react @xyflow/react cmdk lucide-react match-sorter motion \
  react react-aria-components react-dom react-hook-form \
  react-resizable-panels sonner tailwindcss vaul
```

`JsonInput` lazily loads the optional `react-ace` and `ace-builds` peers; install
those two only when using the JSON editor.

## Setup

### 1. Import the Tailwind CSS theme

Import the package stylesheet once from your application stylesheet. It includes
Tailwind v4 and scans the package's published component output automatically:

```css
/* app.css or globals.css */
@import "@constructive-io/ui/globals.css";
```

### 2. Add CSS Variables

The imported stylesheet includes the default design tokens. Define the same
variables after the import when your application needs to override them:

```css
@import "@constructive-io/ui/globals.css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.3211 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.3211 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.3211 0 0);
  --primary: oklch(0.688 0.1754 245.6151);
  --primary-foreground: oklch(0.979 0.021 166.113);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.55 0.2 25);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.871 0.006 286.286);
  --ring: oklch(0.871 0.006 286.286);
  --radius: 0.5rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 2px);
  --radius-xl: calc(var(--radius) + 6px);
}

@layer base {
  * {
    @apply border-border/60 outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## Usage

Import components individually for tree-shaking:

```tsx
import { Button } from '@constructive-io/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@constructive-io/ui/card';
import { Input } from '@constructive-io/ui/input';

function App() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Email" type="email" />
        <Button>Continue</Button>
      </CardContent>
    </Card>
  );
}
```

## Components

### Layout
- Card, Separator, Tabs, Collapsible, ScrollArea, Resizable

### Forms
- Button, Input, Textarea, Checkbox, Switch, Select, RadioGroup, Label, Progress

### Feedback
- Alert, Badge, Skeleton, Toast

### Overlay
- Dialog, AlertDialog, Sheet, Drawer, Popover, Tooltip, DropdownMenu

### Data
- Table, Pagination, Avatar, Breadcrumb

### Advanced
- Command, Combobox, Autocomplete, MultiSelect, Stack, Calendar

## Variants

Components use [CVA](https://cva.style/) for variant management:

```tsx
// Button variants
<Button variant="default">Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>

// Button sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>

// Card variants
<Card variant="default">Default shadow</Card>
<Card variant="elevated">Prominent shadow</Card>
<Card variant="flat">No shadow</Card>
<Card variant="interactive">Hover lift effect</Card>
```

## Dark Mode

Add the `dark` class to enable dark mode:

```tsx
<html className="dark">
  {/* Components automatically use dark theme */}
</html>
```

## TypeScript

Full TypeScript support with exported types:

```tsx
import type { ButtonProps } from '@constructive-io/ui/button';

const MyButton = (props: ButtonProps) => <Button {...props} />;
```

## Styling

All components use `data-slot` attributes for styling hooks:

```css
/* Target specific component parts */
[data-slot="card-header"] {
  /* custom styles */
}

[data-slot="button"] {
  /* custom styles */
}
```

## Development

```bash
# Install dependencies
pnpm install

# Run Storybook
pnpm sb

# Build package
pnpm build

# Type check
pnpm lint:types
```

## License

MIT
