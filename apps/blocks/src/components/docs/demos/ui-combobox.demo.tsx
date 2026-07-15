'use client';

import { useState } from 'react';

import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from '@constructive-io/ui/combobox';

import { Demo } from '@/components/docs/showcase-kit';

type Region = { value: string; label: string };

const REGIONS: Region[] = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU West (Ireland)' },
  { value: 'eu-central-1', label: 'EU Central (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
];

export function BlockDemo() {
  const [value, setValue] = useState<Region | null>(REGIONS[0]);

  return (
    <Demo>
      <div className="w-full max-w-md space-y-3">
        <Combobox items={REGIONS} value={value} onValueChange={setValue}>
          <ComboboxInput placeholder="Select a region..." showClear />
          <ComboboxPopup>
            <ComboboxEmpty>No region found.</ComboboxEmpty>
            <ComboboxList>
              {(item: Region) => (
                <ComboboxItem key={item.value} value={item}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </Combobox>
        <p className="text-sm text-muted-foreground">
          Region: <span className="font-medium text-foreground">{value?.label ?? 'none'}</span>
        </p>
      </div>
    </Demo>
  );
}
