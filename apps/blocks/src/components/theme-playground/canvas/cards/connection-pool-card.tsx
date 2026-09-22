'use client';

import { useState } from 'react';
import { Gauge, Hourglass, Timer, Waves } from 'lucide-react';

import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@constructive-io/ui/item';
import { Slider } from '@constructive-io/ui/slider';
import { Switch } from '@constructive-io/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@constructive-io/ui/toggle-group';

import { SinkCard } from './sink-card';

type Scene = 'balanced' | 'burst' | 'night' | 'maintenance';

const SCENES: Record<Scene, [number, number, number, number]> = {
  balanced: [40, 30, 60, 45],
  burst: [80, 15, 30, 20],
  night: [20, 60, 90, 60],
  maintenance: [10, 5, 15, 10],
};

const CONTROLS = [
  { key: 'pool', title: 'Pool size', icon: Waves },
  { key: 'idle', title: 'Idle timeout', icon: Hourglass },
  { key: 'statement', title: 'Statement timeout', icon: Timer },
  { key: 'lifetime', title: 'Max lifetime', icon: Gauge },
] as const;

export function ConnectionPoolCard() {
  const [enabled, setEnabled] = useState(true);
  const [scene, setScene] = useState<Scene>('balanced');
  const [values, setValues] = useState<number[]>(SCENES.balanced);

  return (
    <SinkCard
      title="Connection pool"
      description="PgBouncer · transaction mode"
      action={
        <Switch checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} aria-label="Enable connection pool" />
      }
      contentClassName="flex flex-col gap-4"
    >
      <ToggleGroup
        value={[scene]}
        onValueChange={(next) => {
          const id = next[0] as Scene | undefined;
          if (!id) return;
          setScene(id);
          setValues(SCENES[id]);
        }}
        variant="outline"
        spacing={1}
        disabled={!enabled}
        className="flex-wrap"
        aria-label="Pool scene"
      >
        <ToggleGroupItem value="balanced">Balanced</ToggleGroupItem>
        <ToggleGroupItem value="burst">Burst</ToggleGroupItem>
        <ToggleGroupItem value="night">Night</ToggleGroupItem>
        <ToggleGroupItem value="maintenance">Maintenance</ToggleGroupItem>
      </ToggleGroup>
      <ItemGroup className={enabled ? undefined : 'pointer-events-none opacity-64'}>
        {CONTROLS.map((control, index) => (
          <Item key={control.key} variant="outline" size="sm">
            <ItemMedia variant="icon">
              <control.icon aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{control.title}</ItemTitle>
            </ItemContent>
            <ItemActions className="flex-1">
              <Slider
                value={values[index]}
                onValueChange={(v) => setValues((prev) => prev.map((p, i) => (i === index ? (v as number) : p)))}
                disabled={!enabled}
                aria-label={control.title}
                className="w-full"
              />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </SinkCard>
  );
}
