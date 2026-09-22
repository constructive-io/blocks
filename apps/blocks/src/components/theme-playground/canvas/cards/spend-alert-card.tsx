'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Field, FieldDescription, FieldLabel } from '@constructive-io/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';
import { Slider } from '@constructive-io/ui/slider';
import { Textarea } from '@constructive-io/ui/textarea';

import { SinkCard } from './sink-card';

const REGIONS = {
  'us-east-1': 'US East (us-east-1)',
  'eu-central-1': 'EU Central (eu-central-1)',
  'ap-southeast-2': 'AP Southeast (ap-southeast-2)',
};

export function SpendAlertCard() {
  const [threshold, setThreshold] = useState(2500);

  return (
    <SinkCard
      title="Spend alert"
      description="Notify when monthly spend crosses a threshold."
      action={
        <Button variant="ghost" size="icon-sm" aria-label="Dismiss">
          <X aria-hidden />
        </Button>
      }
      contentClassName="flex flex-col gap-4"
      footer={
        <>
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
          <Button size="sm" className="ml-auto">
            Save alert
          </Button>
        </>
      }
    >
      <Field label="Billing region">
        <Select defaultValue="eu-central-1" items={REGIONS}>
          <SelectTrigger aria-label="Billing region">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(REGIONS).map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field orientation="vertical">
        <div className="flex items-baseline justify-between">
          <FieldLabel>Threshold</FieldLabel>
          <span className="text-sm font-medium tabular-nums">${threshold.toLocaleString()}</span>
        </div>
        <Slider
          value={threshold}
          onValueChange={(value) => setThreshold(value as number)}
          min={0}
          max={10000}
          step={100}
          aria-label="Spend threshold"
        />
        <FieldDescription>Alerts at 80% and 100%.</FieldDescription>
      </Field>
      <Field label="Note to finance">
        <Textarea defaultValue="Include the staging project in the total." rows={2} />
      </Field>
    </SinkCard>
  );
}
