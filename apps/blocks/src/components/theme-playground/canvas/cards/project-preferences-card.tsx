'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Field, FieldContent, FieldDescription, FieldTitle } from '@constructive-io/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';
import { Switch } from '@constructive-io/ui/switch';

import { SinkCard } from './sink-card';

const REGIONS = {
  'eu-central-1': 'EU Central (eu-central-1)',
  'us-east-1': 'US East (us-east-1)',
  'ap-southeast-2': 'AP Southeast (ap-southeast-2)',
};

export function ProjectPreferencesCard() {
  const [playground, setPlayground] = useState(false);
  const [digest, setDigest] = useState(true);

  return (
    <SinkCard
      title="Project preferences"
      description="Defaults for new environments."
      action={
        <Button variant="ghost" size="icon-sm" aria-label="Close">
          <X aria-hidden />
        </Button>
      }
      contentClassName="flex flex-col gap-4"
      footer={
        <>
          <Button variant="outline" size="sm">
            Reset
          </Button>
          <Button size="sm" className="ml-auto">
            Save preferences
          </Button>
        </>
      }
    >
      <Field label="Default region">
        <Select defaultValue="eu-central-1" items={REGIONS}>
          <SelectTrigger aria-label="Default region">
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
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>Public GraphQL playground</FieldTitle>
          <FieldDescription>Allow unauthenticated schema introspection.</FieldDescription>
        </FieldContent>
        <Switch
          checked={playground}
          onCheckedChange={(v) => setPlayground(v === true)}
          aria-label="Public GraphQL playground"
        />
      </Field>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>Weekly digest</FieldTitle>
          <FieldDescription>Usage, spend and incident summary every Monday.</FieldDescription>
        </FieldContent>
        <Switch checked={digest} onCheckedChange={(v) => setDigest(v === true)} aria-label="Weekly digest" />
      </Field>
    </SinkCard>
  );
}
