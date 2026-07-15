'use client';

import { useState } from 'react';

import { Label } from '@constructive-io/ui/label';
import { Switch } from '@constructive-io/ui/switch';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [rls, setRls] = useState(true);
  const [realtime, setRealtime] = useState(false);

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-lg border bg-background p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="sw-rls" className="text-base">
              Row-level security
            </Label>
            <span className="text-sm text-muted-foreground">Enforce access policies on every query.</span>
          </div>
          <Switch id="sw-rls" checked={rls} onCheckedChange={setRls} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="sw-realtime" className="text-base">
              Realtime
            </Label>
            <span className="text-sm text-muted-foreground">Stream changes to subscribed clients.</span>
          </div>
          <Switch id="sw-realtime" checked={realtime} onCheckedChange={setRealtime} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="sw-locked" className="text-base">
              Point-in-time recovery
            </Label>
            <span className="text-sm text-muted-foreground">Available on the Scale plan.</span>
          </div>
          <Switch id="sw-locked" disabled />
        </div>
      </div>
    </Demo>
  );
}
