import { Badge } from '@constructive-io/ui/badge';
import { Field } from '@constructive-io/ui/field';
import { MultiSelect } from '@constructive-io/ui/multi-select';

import { SinkCard } from './sink-card';

const OPTIONS = [
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'Design', value: 'design' },
  { label: 'Docs', value: 'docs' },
  { label: 'Bug', value: 'bug' },
];

const TAGS = ['urgent', 'v2.1', 'customer'];

export function LabelsCard() {
  return (
    <SinkCard title="Labels" contentClassName="flex flex-col gap-4">
      <Field label="Applies to">
        <MultiSelect
          options={OPTIONS}
          defaultValue={['frontend', 'design', 'bug']}
          onValueChange={() => {}}
          placeholder="Select labels"
          maxCount={3}
        />
      </Field>
      <div className="flex flex-wrap gap-1.5">
        {TAGS.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
    </SinkCard>
  );
}
