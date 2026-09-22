import { Button } from '@constructive-io/ui/button';
import { Checkbox } from '@constructive-io/ui/checkbox';
import { CheckboxGroup } from '@constructive-io/ui/checkbox-group';
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';

import { SinkCard } from './sink-card';

const OPTIONS = [
  { id: 'sink-rls', label: 'Enable row-level security', checked: true },
  { id: 'sink-api', label: 'Generate API surface', checked: true },
  { id: 'sink-audit', label: 'Track row history', checked: false },
];

export function CreateTableCard() {
  return (
    <SinkCard title="Create table" contentClassName="flex flex-col gap-4">
      <Field label="Table name" htmlFor="sink-table-name">
        <Input id="sink-table-name" placeholder="public.orders" />
      </Field>
      <CheckboxGroup aria-label="Table options" className="flex flex-col gap-2">
        {OPTIONS.map((option) => (
          <Label key={option.id} className="flex items-center gap-2 text-xs font-normal">
            <Checkbox id={option.id} defaultChecked={option.checked} />
            {option.label}
          </Label>
        ))}
      </CheckboxGroup>
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="flex-1">
          Create
        </Button>
        <Button size="sm" variant="ghost">
          Cancel
        </Button>
      </div>
    </SinkCard>
  );
}
