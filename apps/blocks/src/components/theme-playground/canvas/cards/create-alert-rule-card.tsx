import { Button } from '@constructive-io/ui/button';
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@constructive-io/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';

import { SinkCard } from './sink-card';

const METRIC_ITEMS = {
  'p95-latency': 'p95 latency',
  'error-rate': 'Error rate',
  'cpu-usage': 'CPU usage',
  'disk-free': 'Disk free',
};

export function CreateAlertRuleCard() {
  return (
    <SinkCard
      title="Create alert rule"
      contentClassName="flex flex-col gap-3"
      footer={
        <>
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
          <Button size="sm" className="ml-auto">
            Create rule
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input defaultValue="p95 latency > 200 ms" aria-label="Rule name" />
      </Field>
      <Field label="Metric">
        <Select defaultValue="p95-latency" items={METRIC_ITEMS}>
          <SelectTrigger aria-label="Metric">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(METRIC_ITEMS).map(([id, label]) => (
              <SelectItem key={id} value={id}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Threshold">
        <InputGroup>
          <InputGroupInput defaultValue="200" inputMode="numeric" aria-label="Threshold" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>ms</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <Field label="Notify">
        <Input defaultValue="#ops-alerts" aria-label="Notification channel" />
      </Field>
    </SinkCard>
  );
}
