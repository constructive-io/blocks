'use client';

import { useState } from 'react';

import {
  OrgChart,
  type OrgChartEdge,
  type OrgChartNodeData,
} from '@/components/ui/org-chart';

const orgPerson = (
  id: string,
  parentId: string | null,
  displayName: string,
  positionTitle: string,
): OrgChartEdge => ({ id, parentId, displayName, positionTitle, avatarUrl: null });

const ORG_CHART_EDGES: OrgChartEdge[] = [
  orgPerson('alex', null, 'Alex Morgan', 'Chief Executive Officer'),
  orgPerson('maya', 'alex', 'Maya Chen', 'VP of Product'),
  orgPerson('theo', 'alex', 'Theo Brooks', 'VP of Engineering'),
  orgPerson('rosa', 'alex', 'Rosa Alvarez', 'Head of Operations'),
  orgPerson('jordan', 'maya', 'Jordan Lee', 'Design Lead'),
  orgPerson('priya', 'maya', 'Priya Natarajan', 'Product Manager'),
  orgPerson('cass', 'theo', 'Cass Taylor', 'Platform Lead'),
  orgPerson('devon', 'theo', 'Devon Park', 'Applications Lead'),
  orgPerson('ines', 'cass', 'Inès Moreau', 'Site Reliability Engineer'),
  orgPerson('kofi', 'cass', 'Kofi Mensah', 'Database Engineer'),
  orgPerson('lena', 'devon', 'Lena Fischer', 'Frontend Engineer'),
  orgPerson('omar', 'devon', 'Omar Haddad', 'Mobile Engineer'),
  orgPerson('sam', 'rosa', 'Sam Rivera', 'People Partner'),
  orgPerson('noa', 'rosa', 'Noa Levi', 'Finance Manager'),
];

export function OrgChartPreview() {
  const [message, setMessage] = useState(
    'Select a person, fold a team, or drag a card onto a new manager.',
  );

  function personName(person: OrgChartNodeData) {
    return person.displayName ?? 'This person';
  }

  return (
    <div
      className="flex h-full min-h-[640px] w-full flex-col gap-3 p-3 sm:p-4"
      data-slot="application-block-showcase-canvas"
    >
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h1 className="text-sm font-medium tracking-tight">Northstar Labs</h1>
        <p className="text-xs text-muted-foreground tabular-nums">
          {ORG_CHART_EDGES.length} people
        </p>
      </div>

      <OrgChart
        className="min-h-0 flex-1"
        defaultEdges={ORG_CHART_EDGES}
        defaultCollapsedIds={['rosa']}
        onAddToChart={() => setMessage('Add-person workflow requested.')}
        onEditNode={(person) =>
          setMessage(`Edit requested for ${personName(person)}.`)
        }
        onRemoveNode={(person) =>
          setMessage(`Removal confirmation requested for ${personName(person)}.`)
        }
        onReparentSuccess={(child, parent) =>
          setMessage(`${child} now reports to ${parent}.`)
        }
        onReparentError={setMessage}
      />

      <p
        className="min-h-5 px-1 text-pretty text-xs text-muted-foreground"
        role="status"
      >
        {message}
      </p>
    </div>
  );
}
