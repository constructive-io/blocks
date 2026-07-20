'use client';

import { useState } from 'react';

import { Label } from '@constructive-io/ui/label';
import { Switch } from '@constructive-io/ui/switch';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicSwitchDemo() {
  return (
    <Demo>
      <div className="flex items-center gap-3">
        <Switch id="switch-notifications" defaultChecked />
        <Label htmlFor="switch-notifications">Email notifications</Label>
      </div>
    </Demo>
  );
}

export function ControlledSwitchDemo() {
  const [checked, setChecked] = useState(true);

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="switch-controlled-realtime">Realtime updates</Label>
          <Switch id="switch-controlled-realtime" checked={checked} onCheckedChange={setChecked} />
        </div>
        <p className="text-pretty text-sm text-muted-foreground">
          Realtime updates are {checked ? 'on' : 'off'}.
        </p>
      </div>
    </Demo>
  );
}

export function SwitchSettingsDemo() {
  const [rls, setRls] = useState(true);
  const [realtime, setRealtime] = useState(false);

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-lg border bg-background p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="switch-rls">Row-level security</Label>
            <span id="switch-rls-description" className="text-sm text-muted-foreground">
              Enforce access policies on every query.
            </span>
          </div>
          <Switch
            id="switch-rls"
            checked={rls}
            onCheckedChange={setRls}
            aria-describedby="switch-rls-description"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="switch-realtime">Realtime</Label>
            <span id="switch-realtime-description" className="text-sm text-muted-foreground">
              Stream changes to subscribed clients.
            </span>
          </div>
          <Switch
            id="switch-realtime"
            checked={realtime}
            onCheckedChange={setRealtime}
            aria-describedby="switch-realtime-description"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="switch-locked">Point-in-time recovery</Label>
            <span id="switch-locked-description" className="text-sm text-muted-foreground">
              Available on the Scale plan.
            </span>
          </div>
          <Switch id="switch-locked" disabled aria-describedby="switch-locked-description" />
        </div>
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <SwitchSettingsDemo />;
}
