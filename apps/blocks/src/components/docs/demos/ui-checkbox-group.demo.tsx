'use client';

import { useState } from 'react';

import { Checkbox } from '@constructive-io/ui/checkbox';
import { CheckboxGroup } from '@constructive-io/ui/checkbox-group';
import { Label } from '@constructive-io/ui/label';

import { Demo } from '@/components/docs/showcase-kit';

const EVENTS = [
  { value: 'insert', label: 'Row inserted' },
  { value: 'update', label: 'Row updated' },
  { value: 'delete', label: 'Row deleted' },
  { value: 'schema', label: 'Schema changed' },
];

export function BlockDemo() {
  const [value, setValue] = useState<string[]>(['insert', 'update']);

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div>
          <h3 className="text-sm font-medium">Webhook events</h3>
          <p className="text-sm text-muted-foreground">Choose which changes trigger a delivery.</p>
        </div>
        <CheckboxGroup value={value} onValueChange={setValue}>
          {EVENTS.map((event) => (
            <div key={event.value} className="flex items-center gap-2">
              <Checkbox id={`evt-${event.value}`} name="events" value={event.value} />
              <Label htmlFor={`evt-${event.value}`}>{event.label}</Label>
            </div>
          ))}
        </CheckboxGroup>
        <p className="text-sm text-muted-foreground">
          Subscribed: {value.length > 0 ? value.join(', ') : 'none'}
        </p>
      </div>
    </Demo>
  );
}
