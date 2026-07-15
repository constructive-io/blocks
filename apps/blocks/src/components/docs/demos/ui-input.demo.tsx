'use client';

import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="in-name">Display name</Label>
          <Input id="in-name" placeholder="Acme Inc." />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="in-email">Email</Label>
          <Input id="in-email" type="email" aria-invalid placeholder="name@example.com" />
          <p className="text-sm text-destructive">Enter a valid email address.</p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="in-id">Database ID</Label>
          <Input id="in-id" defaultValue="db_prod_a1b2c3" disabled />
        </div>

        <div className="flex items-end gap-2">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="in-small">Small</Label>
            <Input id="in-small" size="sm" placeholder="Compact" />
          </div>
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="in-large">Large</Label>
            <Input id="in-large" size="lg" placeholder="Prominent" />
          </div>
        </div>
      </div>
    </Demo>
  );
}
