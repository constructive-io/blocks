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

export function BasicCheckboxDemo() {
  return (
    <Demo>
      <div className="flex items-center gap-2">
        <Checkbox id="checkbox-terms" name="terms" required />
        <Label htmlFor="checkbox-terms">Accept the terms of service</Label>
      </div>
    </Demo>
  );
}

export function ControlledCheckboxDemo() {
  const [checked, setChecked] = useState(true);

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <div className="flex items-center gap-2">
          <Checkbox id="checkbox-notifications" checked={checked} onCheckedChange={setChecked} />
          <Label htmlFor="checkbox-notifications">Email notifications</Label>
        </div>
        <p className="text-pretty text-sm text-muted-foreground">
          Notifications are {checked ? 'enabled' : 'disabled'}.
        </p>
      </div>
    </Demo>
  );
}

export function CheckboxGroupDemo() {
  const [checked, setChecked] = useState<Record<string, boolean>>({ read: true, write: true });
  const selectedCount = SCOPES.filter((scope) => checked[scope.id]).length;
  const allChecked = selectedCount === SCOPES.length;

  return (
    <Demo>
      <fieldset className="flex w-full max-w-sm flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">API key scopes</legend>
        <div className="flex items-center gap-2">
          <Checkbox
            id="scope-all"
            checked={allChecked}
            indeterminate={selectedCount > 0 && !allChecked}
            onCheckedChange={(value) =>
              setChecked(Object.fromEntries(SCOPES.map((scope) => [scope.id, value === true])))
            }
          />
          <Label htmlFor="scope-all">Select all scopes</Label>
        </div>

        <div className="ml-6 flex flex-col gap-2.5">
          {SCOPES.map((scope) => (
            <div key={scope.id} className="flex items-center gap-2">
              <Checkbox
                id={`scope-${scope.id}`}
                checked={!!checked[scope.id]}
                onCheckedChange={(value) =>
                  setChecked((previous) => ({ ...previous, [scope.id]: value === true }))
                }
              />
              <Label htmlFor={`scope-${scope.id}`}>{scope.label}</Label>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Checkbox id="scope-billing" disabled />
            <Label htmlFor="scope-billing">Manage billing (owner only)</Label>
          </div>
        </div>
      </fieldset>
    </Demo>
  );
}

export function BlockDemo() {
  return <CheckboxGroupDemo />;
}
