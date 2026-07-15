'use client';

import { Checkbox } from '@constructive-io/ui/checkbox';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="org-name">Organization name</Label>
          <Input id="org-name" placeholder="Acme Inc." />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="api-email">
            Billing email <span className="text-destructive">*</span>
          </Label>
          <Input id="api-email" type="email" placeholder="billing@acme.com" />
          <p className="text-sm text-muted-foreground">Receipts and usage alerts are sent here.</p>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="accept-terms" />
          <Label htmlFor="accept-terms">I accept the terms of service</Label>
        </div>
      </div>
    </Demo>
  );
}
