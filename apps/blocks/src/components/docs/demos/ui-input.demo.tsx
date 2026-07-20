'use client';

import { useState } from 'react';

import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicInputDemo() {
  return (
    <Demo>
      <div className="grid w-full max-w-sm gap-1.5">
        <Label htmlFor="input-name">Display name</Label>
        <Input id="input-name" name="displayName" autoComplete="organization" placeholder="Acme Inc." />
      </div>
    </Demo>
  );
}

export function ControlledInputDemo() {
  const [name, setName] = useState('Acme Inc.');

  return (
    <Demo>
      <div className="grid w-full max-w-sm gap-1.5">
        <Label htmlFor="input-controlled-name">Organization name</Label>
        <Input id="input-controlled-name" value={name} onValueChange={setName} />
        <p className="text-pretty text-sm text-muted-foreground">Current value: {name || 'Empty'}</p>
      </div>
    </Demo>
  );
}

export function InputStatesDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="input-email">Email</Label>
          <Input
            id="input-email"
            name="email"
            type="email"
            autoComplete="email"
            aria-describedby="input-email-error"
            aria-invalid="true"
            defaultValue="name@"
          />
          <p id="input-email-error" className="text-pretty text-sm text-destructive">
            Enter a valid email address.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="input-database-id">Database ID</Label>
          <Input id="input-database-id" defaultValue="db_prod_a1b2c3" disabled />
        </div>
      </div>
    </Demo>
  );
}

export function InputSizesDemo() {
  return (
    <Demo>
      <div className="grid w-full max-w-sm gap-3">
        <Input size="sm" aria-label="Small input" placeholder="Small" />
        <Input size="default" aria-label="Default input" placeholder="Default" />
        <Input size="lg" aria-label="Large input" placeholder="Large" />
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <InputStatesDemo />;
}
