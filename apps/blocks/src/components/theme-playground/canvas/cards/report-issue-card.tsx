import { Button } from '@constructive-io/ui/button';
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';
import { Textarea } from '@constructive-io/ui/textarea';

import { SinkCard } from './sink-card';

const AREAS = {
  migrations: 'Migrations',
  api: 'API',
  console: 'Console',
  billing: 'Billing',
};

const SEVERITIES = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function ReportIssueCard() {
  return (
    <SinkCard
      title="Report an issue"
      description="Help us fix it faster."
      contentClassName="flex flex-col gap-3"
      footer={
        <>
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
          <Button size="sm" className="ml-auto">
            Submit report
          </Button>
        </>
      }
    >
      <Field label="Title">
        <Input defaultValue="Migration hangs on index rebuild" aria-label="Issue title" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Area">
          <Select defaultValue="migrations" items={AREAS}>
            <SelectTrigger aria-label="Area">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(AREAS).map((id) => (
                <SelectItem key={id} value={id}>
                  {id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Severity">
          <Select defaultValue="high" items={SEVERITIES}>
            <SelectTrigger aria-label="Severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(SEVERITIES).map((id) => (
                <SelectItem key={id} value={id}>
                  {id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          defaultValue="The migration to add a partial index on orders stalls at ~80% and never completes."
          rows={3}
          aria-label="Issue description"
        />
      </Field>
    </SinkCard>
  );
}
