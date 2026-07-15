# OrgChart Component

A data-driven organizational chart built on React Flow. Renders a hierarchical tree with drag-to-reparent, zoom controls, and per-node actions (edit, remove). Supports both **uncontrolled** (component manages state) and **controlled** (consumer manages state) modes.

## Installation

The component is part of `@constructive-io/ui`. It requires `@xyflow/react` as a peer dependency:

```bash
pnpm add @xyflow/react
```

## Uncontrolled (default)

The simplest usage. The component manages edge state internally and handles reparent optimistically. If `onReparent` throws, it reverts.

```tsx
import { OrgChart, type OrgChartEdge } from '@constructive-io/ui/org-chart';

function MyOrgChart({ edges }: { edges: OrgChartEdge[] }) {
  return (
    <OrgChart
      defaultEdges={edges}
      onReparent={async (childId, newParentId) => {
        // Component already updated visually — just persist to server.
        // If this throws, the component reverts automatically.
        await api.updateReportingLine(childId, newParentId);
      }}
      onEditNode={(nodeData) => { /* open edit dialog */ }}
      onRemoveNode={(nodeData) => { /* open confirmation */ }}
    />
  );
}
```

When `defaultEdges` changes externally (e.g. server refetch), the component syncs its internal state.

## Controlled

For full control over edge state, pass `edges` instead. The component renders what you give it — you must update edges yourself in `onReparent`.

```tsx
function MyOrgChart() {
  const [edges, setEdges] = useState<OrgChartEdge[]>(initialEdges);

  return (
    <OrgChart
      edges={edges}
      onReparent={async (childId, newParentId) => {
        // You must update edges yourself
        setEdges(prev => prev.map(e =>
          e.id === childId ? { ...e, parentId: newParentId } : e
        ));
      }}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultEdges` | `OrgChartEdge[]` | - | Uncontrolled mode. Component manages state internally with optimistic reparent. |
| `edges` | `OrgChartEdge[]` | - | Controlled mode. Consumer owns edge state. Mutually exclusive with `defaultEdges`. |
| `isLoading` | `boolean` | `false` | Shows a loading spinner instead of the chart. |
| `editable` | `boolean` | `true` | Enables drag-to-reparent, node menus (edit/remove), and the add button in empty state. |
| `onReparent` | `(childId, newParentId, preserve) => void \| Promise<void>` | - | Called on reparent. In uncontrolled mode, component updates first — if this throws, it reverts. |
| `onAddToChart` | `() => void` | - | Called when the "Add First Member" button is clicked (empty state). |
| `onEditNode` | `(nodeData: OrgChartNodeData) => void` | - | Called when "Edit Position" is selected from a node's dropdown menu. |
| `onRemoveNode` | `(nodeData: OrgChartNodeData) => void` | - | Called when "Remove from Chart" is selected from a node's dropdown menu. |
| `onReparentSuccess` | `(childName, parentName) => void` | - | Toast callback on successful reparent. |
| `onReparentError` | `(message) => void` | - | Toast callback on reparent failure or circular chain detection. |

## Data Shape

Both `edges` and `defaultEdges` expect an array of `OrgChartEdge`:

```ts
interface OrgChartEdge {
  id: string;                    // person ID
  parentId: string | null;       // who they report to (null = root)
  displayName: string | null;
  avatarUrl: string | null;
  positionTitle: string | null;
}
```

Each edge represents one person in the chart. A root node has `parentId: null`. The component handles multiple roots (laid out side by side).

## Exports

```tsx
import {
  OrgChart,
  type OrgChartProps,
  type OrgChartEdge,
  type OrgChartNodeData,
} from '@constructive-io/ui/org-chart';
```

Layout, context, and sub-components are internal — consumers only need the main component and its data types.

## Integration Example (apps/admin)

In `apps/admin`, the component uses uncontrolled mode with GraphQL hooks. The chart updates optimistically on drag; `onReparent` persists to the server. When TanStack Query refetches, `defaultEdges` updates and the chart syncs.

```tsx
import { OrgChart as OrgChartUI } from '@constructive-io/ui/org-chart';

function OrgChart({ orgId, actorId, canManage }) {
  const { apiEdges, isLoading } = useOrgChartData({ orgId }); // returns OrgChartEdge[]

  return (
    <OrgChartUI
      defaultEdges={apiEdges}
      isLoading={isLoading}
      editable={canManage}
      onReparent={async (childId, newParentId) => {
        await updateReportingLine(childId, newParentId);
      }}
      onReparentSuccess={(child, parent) => toast.success({ message: `${child} now reports to ${parent}` })}
      onReparentError={(msg) => toast.error({ message: msg })}
    />
  );
}
```

## Features

- **Hierarchical tree layout** — automatic positioning with subtree centering
- **Multi-root support** — multiple root nodes laid out side by side
- **Drag-to-reparent** — drag a node onto another to change reporting line
- **Circular chain detection** — prevents dropping a node onto its own descendant
- **Zoom controls** — zoom in/out and fit-to-view buttons
- **Node actions** — per-node dropdown menu with edit and remove options
- **Empty state** — clean empty state with call-to-action
- **Permission-based** — `editable` toggles all editing features

## Peer Dependencies

- `react` ^18.0.0 || ^19.0.0
- `@xyflow/react` ^12.0.0
- `@remixicon/react` ^4.0.0 (optional, for zoom icons)
- `lucide-react` ^0.400.0 (optional, for node menu icons)
