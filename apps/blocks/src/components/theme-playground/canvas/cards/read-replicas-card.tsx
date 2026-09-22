'use client';

import { useState } from 'react';

import { Slider } from '@constructive-io/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@constructive-io/ui/toggle-group';

import { SinkCard } from './sink-card';

const PRESETS = ['0', '1', '2', '4'];

export function ReadReplicasCard() {
  const [replicas, setReplicas] = useState(2);

  return (
    <SinkCard title="Read replicas" description="eu-central-1" contentClassName="flex flex-col gap-4">
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {replicas} {replicas === 1 ? 'replica' : 'replicas'}
      </p>
      <Slider
        value={replicas}
        onValueChange={(value) => setReplicas(value as number)}
        min={0}
        max={4}
        step={1}
        aria-label="Read replica count"
      />
      <ToggleGroup
        value={[String(replicas)]}
        onValueChange={(values) => {
          const next = (values as string[]).at(-1);
          if (next !== undefined) setReplicas(Number(next));
        }}
        spacing={4}
        aria-label="Replica presets"
        className="w-full"
      >
        {PRESETS.map((preset) => (
          <ToggleGroupItem key={preset} value={preset} size="sm" className="flex-1">
            {preset}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-[12px] text-muted-foreground">Adds ~$48/mo per replica</p>
    </SinkCard>
  );
}
