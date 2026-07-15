/**
 * ui-content — Subsystems family.
 *
 * Per-item docs content for the `ui` category pages. See ./index.mjs for the
 * full contract. `intro: null` / `usage: null` means "not yet authored" — the
 * generator skips the page and the parity test fails until it is filled in.
 */

export const ITEMS = {
  'sonner': {
    tier: 'showcase',
    intro: `The \`Toaster\` host you mount once so toasts can appear anywhere. Pair it with the \`toast\` helpers to fire messages.`,
    usage: `import { Toaster } from '@constructive-io/ui/sonner';

// Mount once, e.g. in your root layout:
export default function RootLayout({ children }) {
  return (
    <body>
      {children}
      <Toaster />
    </body>
  );
}`,
    props: [
      { name: 'theme', type: `'light' | 'dark' | 'system'`, default: `'system'`, description: 'Toaster theme; pass from your app theme context.' },
      { name: 'position', type: `'top-center' | 'bottom-right' | …`, default: `'bottom-right'`, description: 'Corner the toasts stack in.' },
    ],
  },
  'stack': {
    // Flipped showcase -> lean: CardStackViewport is `fixed inset-0` and portals
    // into `#portal-root`, so a live demo escapes the bordered preview stage and
    // covers the whole docs page (capturing scroll/clicks). There is no contained
    // / inline mode. Usage snippet documents it instead of an infeasible demo.
    tier: 'lean',
    intro: `Stack is a navigation-style card manager: an iOS-like stack of cards you push and pop to drill into nested detail — schemas, then tables, then a field editor — with gestures and animation. Mount \`CardStackProvider\` around a \`CardStackViewport\`, then call \`push\` from \`useCardStack\` or from the \`card\` prop injected into each card to navigate.`,
    usage: `import {
  CardStackProvider,
  CardStackViewport,
  useCardStack,
  type CardComponent,
} from '@constructive-io/ui/stack';

const DetailCard: CardComponent<{ id: string }> = ({ id, card }) => (
  <button onClick={() => card.push({ id: \`child:\${id}\`, title: 'Child', Component: DetailCard, props: { id } })}>
    Open child
  </button>
);

function StackExample() {
  return (
    <CardStackProvider initial={[{ id: 'root', title: 'Root', Component: DetailCard, props: { id: 'root' } }]}>
      <CardStackViewport />
    </CardStackProvider>
  );
}`,
    parts: [
      { name: 'CardStackProvider', description: 'Holds the stack state; \`initial\` seeds the first cards, \`layoutMode\` is \`cascade\` or \`side-by-side\`.' },
      { name: 'CardStackViewport', description: 'Renders the visible cards with peek, backdrop, and gestures.' },
      { name: 'useCardStack', description: 'Imperative API: \`push\`, \`pop\`, \`popTo\`, \`replaceTop\`, \`reset\`, and read helpers.' },
      { name: 'CardComponent', description: 'Type for a card; receives a \`card\` prop with \`push\`, \`close\`, \`setTitle\`, and more.' },
      { name: 'StackHeader', description: 'Default per-card header (title, description, close); override via the viewport.' },
    ],
  },
  'toast': {
    tier: 'showcase',
    intro: `The \`toast\` helper functions that fire notifications. Requires a \`Toaster\` mounted somewhere in the tree.`,
    usage: `import { toast } from '@constructive-io/ui/toast';

toast.success({ message: 'Database created', description: 'production-db is ready.' });
toast.error({ message: 'Save failed', description: 'Check your connection and try again.' });
toast.info({ message: 'Heads up', description: 'A new version is available.' });
toast.warning({ message: 'Approaching quota', description: 'You are at 90% of your row limit.' });`,
    parts: [
      { name: 'toast.success', description: 'Green success toast.' },
      { name: 'toast.error', description: 'Destructive toast; long descriptions get a "View details" dialog with copy.' },
      { name: 'toast.info', description: 'Neutral/primary informational toast.' },
      { name: 'toast.warning', description: 'Amber cautionary toast.' },
    ],
  },
  'org-chart': {
    tier: 'lean',
    intro: `OrgChart is a data-driven organizational chart built on React Flow: a hierarchical tree with drag-to-reparent, zoom controls, and per-node actions. Drive it from a flat list of parent/child edges, in either uncontrolled mode (it manages and reverts optimistically) or controlled mode (you own the edges). It is lean here because it pulls in the React Flow canvas.`,
    usage: `import { OrgChart, type OrgChartEdge } from '@constructive-io/ui/org-chart';

<OrgChart
  defaultEdges={edges}
  onReparent={async (childId, newParentId) => {
    await api.updateReportingLine(childId, newParentId);
  }}
  onEditNode={(node) => openEditDialog(node)}
  onRemoveNode={(node) => confirmRemove(node)}
/>`,
    props: [
      { name: 'defaultEdges', type: 'OrgChartEdge[]', default: '—', description: 'Uncontrolled edges; the chart manages and reverts on failure.' },
      { name: 'edges', type: 'OrgChartEdge[]', default: '—', description: 'Controlled edges; you update them yourself in \`onReparent\`.' },
      { name: 'onReparent', type: '(childId, newParentId) => Promise<void> | void', default: '—', description: 'Called when a node is dragged to a new parent.' },
      { name: 'onEditNode', type: '(node: OrgChartNodeData) => void', default: '—', description: 'Per-node edit action.' },
      { name: 'onRemoveNode', type: '(node: OrgChartNodeData) => void', default: '—', description: 'Per-node remove action.' },
    ],
  },
};
