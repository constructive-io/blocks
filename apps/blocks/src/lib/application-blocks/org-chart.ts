import type { ApplicationBlockDoc } from './types';

export const orgChartBlock: ApplicationBlockDoc = {
  name: 'org-chart',
  title: 'Org Chart',
  description:
    'An interactive organization chart on the workspace canvas: automatic top-down layout, pan and zoom, folding teams, a details panel, and drag-to-reassign with a keyboard alternative.',
  previewDescription:
    'Select a person to see their manager and reports, fold a team away, or drag a card onto a new manager and watch the preview wire follow.',
  previewHeight: 740,
  whenToUse: [
    'Use Org Chart when reporting relationships are central to understanding or managing an organization.',
    'Use a table or tree when dense scanning, bulk editing, or keyboard-only hierarchy management is the primary task.',
  ],
  usage: {
    description:
      'Pass either controlled edges or defaultEdges. The component owns viewport and selection behavior while the host owns persistence and application workflows.',
    example: `'use client';

import {
  OrgChart,
  type OrgChartEdge
} from '@/components/ui/org-chart';

const reportingLines: OrgChartEdge[] = [
  {
    id: 'alex',
    parentId: null,
    displayName: 'Alex Morgan',
    positionTitle: 'Chief Executive Officer',
    avatarUrl: null
  },
  {
    id: 'sam',
    parentId: 'alex',
    displayName: 'Sam Rivera',
    positionTitle: 'VP of Product',
    avatarUrl: null
  }
];

type ReportingLineInput = Readonly<{
  personId: string;
  managerId: string;
  positionTitle?: string | null;
}>;

type CompanyOrgChartProps = Readonly<{
  saveReportingLine: (
    reportingLine: ReportingLineInput
  ) => void | Promise<void>;
  openPositionEditor: (personId: string) => void;
  openRemovalConfirmation: (personId: string) => void;
}>;

export function CompanyOrgChart({
  saveReportingLine,
  openPositionEditor,
  openRemovalConfirmation
}: CompanyOrgChartProps) {
  return (
    <OrgChart
      defaultEdges={reportingLines}
      onReparent={(personId, managerId, preserve) =>
        saveReportingLine({
          personId,
          managerId,
          positionTitle: preserve.positionTitle
        })
      }
      onEditNode={(person) => openPositionEditor(person.id)}
      onRemoveNode={(person) => openRemovalConfirmation(person.id)}
    />
  );
}`,
  },
  state: {
    title: 'Hierarchy and interaction state',
    description:
      'Use edges when the host owns the current hierarchy. Use defaultEdges for optimistic local reparenting, and persist each accepted move through onReparent.',
  },
  composition: [
    'The workspace canvas (shared with Agents Builder) owns pan, pinch, wheel, and keyboard zoom; the block lays flat reporting edges out as a tidy top-down tree and draws bezier wires between cards. More than eight reports without a team of their own stack in columns of up to eight under their manager instead of running in one row.',
    'Selecting a person highlights their reporting chain and opens a details panel with their manager, direct reports, and actions; folded teams show a stacked card edge and the team size.',
    'Node menus delegate editing and removal to the host, so the chart never assumes a router, form system, or destructive-action policy.',
    'Loading and empty states are built in, while success and error messaging remain injectable through observer callbacks.',
  ],
  accessibility: [
    'Keep every displayName and positionTitle meaningful because the same labels identify node actions and reporting relationships.',
    'The chart is an ARIA tree: Tab into it, move between people with the arrow keys (inside a stacked column, Up and Down move through the column and Left and Right move between columns), press Enter for details, and use Change manager to reassign without dragging.',
    'Confirm removal in the host workflow before changing data; the node menu reports intent and does not delete records itself.',
  ],
  api: [
    {
      name: 'edges / defaultEdges',
      type: 'OrgChartEdge[]',
      behavior:
        'Chooses controlled or uncontrolled hierarchy state. Supply exactly one of these properties.',
    },
    {
      name: 'editable',
      type: 'boolean',
      behavior:
        'Enables dragging and node actions. Defaults to true.',
    },
    {
      name: 'isLoading',
      type: 'boolean',
      behavior:
        'Replaces the chart with a bounded loading surface while hierarchy data is pending.',
    },
    {
      name: 'onReparent',
      type: '(childId, newParentId, preserve) => void | Promise<void>',
      behavior:
        'Persists a valid reporting-line change. Uncontrolled mode reverts its optimistic move when the promise rejects.',
    },
    {
      name: 'onAddToChart / onEditNode / onRemoveNode',
      type: 'Callbacks',
      behavior:
        'Delegates creation, editing, and removal workflows without coupling the chart to dialogs or routing.',
    },
    {
      name: 'onReparentSuccess / onReparentError',
      type: 'Observer callbacks',
      behavior:
        'Lets the host present localized feedback for accepted and rejected reporting-line changes.',
    },
    {
      name: 'showDetails / onSelectNode',
      type: 'boolean / (node | null) => void',
      behavior:
        'Shows the built-in details panel for the selected person (default true), and reports selection so a host can render its own panel instead.',
    },
    {
      name: 'defaultCollapsedIds',
      type: 'string[]',
      behavior:
        'People whose teams start folded away, useful for large organizations.',
    },
    {
      name: 'className',
      type: 'string',
      behavior:
        'Adds layout classes to the chart container; use a height utility to replace the default 600-pixel canvas.',
    },
  ],
};
