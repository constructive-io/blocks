import { Cloud, Database, HardDrive } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@constructive-io/ui/item';
import { Radio, RadioGroup } from '@constructive-io/ui/radio-group';

import { SinkCard } from './sink-card';

const DESTINATIONS = [
  { value: 's3', icon: Cloud, title: 'Amazon S3', description: 'Your own bucket, full control.' },
  { value: 'gcs', icon: HardDrive, title: 'Google Cloud Storage', description: 'Bring your GCP bucket.' },
  { value: 'managed', icon: Database, title: 'Constructive managed', description: 'We hold snapshots for 30 days.' },
];

export function BackupDestinationCard() {
  return (
    <SinkCard
      title="Backup destination"
      description="Where nightly snapshots are written."
      contentClassName="flex flex-col gap-3"
      footer={
        <>
          <Button variant="outline" size="sm">
            Test connection
          </Button>
          <Button size="sm" className="ml-auto">
            Save
          </Button>
        </>
      }
    >
      <RadioGroup defaultValue="s3" className="flex flex-col gap-2" aria-label="Backup destination">
        {DESTINATIONS.map((destination) => (
          <Item
            key={destination.value}
            variant="outline"
            size="sm"
            className="has-[[data-checked]]:border-ring/60 has-[[data-checked]]:bg-accent/50"
          >
            <ItemMedia variant="icon">
              <destination.icon aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{destination.title}</ItemTitle>
              <ItemDescription>{destination.description}</ItemDescription>
            </ItemContent>
            <Radio value={destination.value} aria-label={destination.title} />
          </Item>
        ))}
      </RadioGroup>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Bucket">
          <Input defaultValue="acme-prod-backups" aria-label="Bucket" />
        </Field>
        <Field label="Prefix">
          <Input defaultValue="snapshots/" aria-label="Prefix" />
        </Field>
      </div>
    </SinkCard>
  );
}
