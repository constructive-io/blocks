'use client';

import { useState } from 'react';

import { Checkbox } from '@constructive-io/ui/checkbox';
import { Label } from '@constructive-io/ui/label';

import { Demo } from '@/components/docs/showcase-kit';

const SCOPES = [
  { id: 'read', label: 'Read records' },
  { id: 'write', label: 'Write records' },
  { id: 'manage', label: 'Manage schema' },
];

export function BlockDemo() {
  const [checked, setChecked] = useState<Record<string, boolean>>({ read: true, write: true });

  const selectedCount = SCOPES.filter((s) => checked[s.id]).length;
  const allChecked = selectedCount === SCOPES.length;

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="scope-all"
            checked={allChecked}
            indeterminate={selectedCount > 0 && !allChecked}
            onCheckedChange={(value) =>
              setChecked(Object.fromEntries(SCOPES.map((s) => [s.id, value === true])))
            }
          />
          <Label htmlFor="scope-all" className="font-medium">
            API key scopes
          </Label>
        </div>

        <div className="ml-6 flex flex-col gap-2.5">
          {SCOPES.map((scope) => (
            <div key={scope.id} className="flex items-center gap-2">
              <Checkbox
                id={`scope-${scope.id}`}
                checked={!!checked[scope.id]}
                onCheckedChange={(value) =>
                  setChecked((prev) => ({ ...prev, [scope.id]: value === true }))
                }
              />
              <Label htmlFor={`scope-${scope.id}`}>{scope.label}</Label>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Checkbox id="scope-billing" disabled />
            <Label htmlFor="scope-billing" className="text-muted-foreground">
              Manage billing (owner only)
            </Label>
          </div>
        </div>
      </div>
    </Demo>
  );
}
