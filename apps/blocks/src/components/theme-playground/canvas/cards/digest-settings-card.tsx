import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Checkbox } from '@constructive-io/ui/checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@constructive-io/ui/field';

import { SinkCard } from './sink-card';

const DIGESTS = [
  { id: 'deploy-summaries', title: 'Deploy summaries', description: 'A digest after each deploy.', on: true },
  { id: 'weekly-usage', title: 'Weekly usage report', description: 'Credits and compute, Mondays.', on: true },
  {
    id: 'security-advisories',
    title: 'Security advisories',
    description: 'Cannot be disabled.',
    on: true,
    disabled: true,
  },
  { id: 'product-updates', title: 'Product updates', description: 'New blocks and features.', on: false },
];

export function DigestSettingsCard() {
  return (
    <SinkCard
      title="Email digests"
      contentClassName="flex flex-col gap-3"
      footer={
        <Button size="sm" className="ml-auto">
          Save
        </Button>
      }
    >
      {DIGESTS.map((digest) => (
        <Field key={digest.id} orientation="horizontal" className="items-start">
          <Checkbox id={digest.id} defaultChecked={digest.on} disabled={digest.disabled} aria-label={digest.title} />
          <FieldContent>
            <FieldLabel htmlFor={digest.id} className="flex items-center gap-2 text-[13px]">
              {digest.title}
              {digest.disabled ? <Badge variant="secondary">Required</Badge> : null}
            </FieldLabel>
            <FieldDescription className="text-[12px]">{digest.description}</FieldDescription>
          </FieldContent>
        </Field>
      ))}
    </SinkCard>
  );
}
