'use client';

import { useState } from 'react';

import { Label } from '@constructive-io/ui/label';
import { Slider } from '@constructive-io/ui/slider';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicSliderDemo() {
  return (
    <Demo>
      <div className="w-full max-w-sm">
        <Slider aria-label="Spend threshold" defaultValue={40} />
      </div>
    </Demo>
  );
}

export function ControlledSliderDemo() {
  const [value, setValue] = useState(60);

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="slider-pool">Connection pool size</Label>
          <span className="text-sm tabular-nums text-muted-foreground">{value}</span>
        </div>
        <Slider
          id="slider-pool"
          aria-label="Connection pool size"
          min={0}
          max={200}
          value={value}
          onValueChange={(v) => setValue(v as number)}
        />
      </div>
    </Demo>
  );
}

export function SliderFieldDemo() {
  const [value, setValue] = useState(75);

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg border bg-background p-5">
        <div className="flex items-center justify-between">
          <Label htmlFor="slider-threshold" className="font-medium">
            Alert threshold
          </Label>
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[12px] tabular-nums">{value}%</span>
        </div>
        <Slider
          id="slider-threshold"
          aria-label="Alert threshold"
          value={value}
          onValueChange={(v) => setValue(v as number)}
        />
        <p className="text-sm text-muted-foreground">
          Notify the on-call channel when monthly compute spend passes {value}% of budget.
        </p>
      </div>
    </Demo>
  );
}

export function RangeSliderDemo() {
  const [range, setRange] = useState([20, 80]);

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label id="slider-range-label">Autoscaling window</Label>
          <span className="text-sm tabular-nums text-muted-foreground">
            {range[0]} – {range[1]} CU
          </span>
        </div>
        <Slider
          aria-labelledby="slider-range-label"
          min={0}
          max={100}
          value={range}
          onValueChange={(v) => setRange(v as number[])}
        />
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <SliderFieldDemo />;
}
