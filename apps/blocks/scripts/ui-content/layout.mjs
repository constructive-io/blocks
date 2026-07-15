/**
 * ui-content — Layout family.
 *
 * Per-item docs content for the `ui` category pages. See ./index.mjs for the
 * full contract. `intro: null` / `usage: null` means "not yet authored" — the
 * generator skips the page and the parity test fails until it is filled in.
 */

export const ITEMS = {
  'portal': {
    tier: 'lean',
    intro: `Portal is the overlay layering infrastructure every floating component renders into. Mount one \`PortalRoot\` at the root of your app and dialogs, sheets, popovers, and toasts all portal into it on a shared, predictable z-index ladder — so a popover opened inside a modal stacks above that modal instead of behind it.`,
    usage: `import { PortalRoot, useRootPortalContainer } from '@constructive-io/ui/portal';

// Mount once at the root of your app, after your page content:
export default function RootLayout({ children }) {
  return (
    <body>
      {children}
      <PortalRoot />
    </body>
  );
}

// Inside a custom overlay, read the container to portal into it:
function MyFloatingThing() {
  const container = useRootPortalContainer();
  // pass \`container\` to your portal / floating primitive
  return null;
}`,
    parts: [
      { name: 'PortalRoot', description: 'Fixed, full-viewport container that every overlay portals into. Render it once at the root of the app.' },
      { name: 'useRootPortalContainer', description: 'Returns the portal-root element (or null before mount) so custom overlays can portal into the shared layer.' },
      { name: 'ModalPortalScope', description: 'Wraps modal content so nested floating elements (popovers, dropdowns) get the elevated z-index and correct nesting.' },
      { name: 'useFloatingOverlayPortalProps', description: 'Centralized portal + z-index policy a floating overlay applies to render in the right layer.' },
    ],
  },
  'scroll-area': {
    tier: 'showcase',
    intro: `Styled, cross-browser scroll container with a slim overlay scrollbar that fades in on hover and scroll.`,
    usage: `import { ScrollArea } from '@constructive-io/ui/scroll-area';

<ScrollArea className="h-72 w-full rounded-md border">
  <div className="p-4">
    {/* tall content */}
  </div>
</ScrollArea>`,
    props: [
      { name: 'scrollFade', type: 'boolean', default: 'false', description: 'Fade content out toward the edges that can scroll further.' },
      { name: 'scrollbarGutter', type: 'boolean', default: 'false', description: 'Reserve gutter space so content does not shift when the scrollbar appears.' },
    ],
  },
  'tabs': {
    tier: 'showcase',
    intro: `Switch between sibling panels in the same space — account vs. password, overview vs. analytics.`,
    usage: `import { Tabs, TabsList, TabsTrigger, TabsContent } from '@constructive-io/ui/tabs';

<Tabs defaultValue="account" className="w-[400px]">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">Account settings…</TabsContent>
  <TabsContent value="password">Password settings…</TabsContent>
</Tabs>`,
    parts: [
      { name: 'Tabs', description: 'Root container holding the selected value (\`defaultValue\` / \`value\` + \`onValueChange\`, \`orientation\`).' },
      { name: 'TabsList', description: 'Row (or column) of triggers.' },
      { name: 'TabsTrigger', description: 'Clickable tab; \`value\` ties it to a panel, supports \`disabled\`.' },
      { name: 'TabsContent', description: 'Panel shown when its \`value\` is active.' },
    ],
  },
  'collapsible': {
    tier: 'showcase',
    intro: `Shows and hides a section of content behind a trigger, with a smooth height animation.`,
    usage: `import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  CollapsibleIcon,
} from '@constructive-io/ui/collapsible';

<Collapsible className="w-[350px] rounded-lg border">
  <CollapsibleTrigger className="px-4 py-3">
    <span>Click to expand</span>
    <CollapsibleIcon />
  </CollapsibleTrigger>
  <CollapsibleContent innerClassName="border-t px-4">
    Hidden content goes here.
  </CollapsibleContent>
</Collapsible>`,
    parts: [
      { name: 'Collapsible', description: 'Root; manages open state (\`defaultOpen\`, or \`open\` + \`onOpenChange\`).' },
      { name: 'CollapsibleTrigger', description: 'Button that toggles the panel; supports \`asChild\` to render your own element.' },
      { name: 'CollapsibleContent', description: 'Animated panel (alias of \`CollapsiblePanel\`); \`innerClassName\` styles the inner padding wrapper.' },
      { name: 'CollapsibleIcon', description: 'Chevron that rotates automatically when the panel opens.' },
    ],
  },
  'resizable': {
    tier: 'showcase',
    intro: `Drag-to-resize split layouts — master/detail panes, side-by-side editors, an inspector you can widen.`,
    usage: `import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@constructive-io/ui/resizable';

<ResizablePanelGroup direction="horizontal" className="rounded-lg border">
  <ResizablePanel defaultSize={50}>One</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize={50}>Two</ResizablePanel>
</ResizablePanelGroup>`,
    parts: [
      { name: 'ResizablePanelGroup', description: 'Container for the split; \`direction\` is \`horizontal\` or \`vertical\`.' },
      { name: 'ResizablePanel', description: 'A pane; \`defaultSize\`, \`minSize\`, \`maxSize\` are percentages.' },
      { name: 'ResizableHandle', description: 'Draggable divider; \`withHandle\` shows a visible grip.' },
    ],
  },
  'flow-zoom-panel': {
    tier: 'lean',
    intro: `FlowZoomPanel is a compact zoom-in / zoom-out / fit-view control cluster for React Flow canvases. Drop it inside a \`ReactFlow\` and it wires straight into the canvas viewport — handy for diagram editors and the org-chart. It reads the canvas through React Flow's context, so it must render inside a \`ReactFlow\` provider.`,
    usage: `import { FlowZoomPanel } from '@constructive-io/ui/flow-zoom-panel';
import { ReactFlow } from '@xyflow/react';

<ReactFlow nodes={nodes} edges={edges}>
  <FlowZoomPanel position="bottom-right" />
</ReactFlow>`,
    props: [
      { name: 'position', type: `PanelPosition`, default: `'bottom-right'`, description: 'Corner of the canvas to dock the controls.' },
      { name: 'fitViewOptions', type: `FitViewOptions`, default: '—', description: 'Options forwarded to the canvas fit-view call.' },
      { name: 'fitViewIcon', type: `React.ReactNode`, default: 'focus icon', description: 'Custom icon for the fit-view button.' },
    ],
  },
};
