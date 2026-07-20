'use client';

import { Checkbox } from '@constructive-io/ui/checkbox';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicLabelDemo() {
  return (
    <Demo>
      <div className="grid w-full max-w-sm gap-1.5">
        <Label htmlFor="label-organization">Organization name</Label>
        <Input id="label-organization" placeholder="Acme Inc." />
      </div>
    </Demo>
  );
}

export function RequiredLabelDemo() {
  return (
    <Demo>
      <div className="grid w-full max-w-sm gap-1.5">
        <Label htmlFor="label-billing-email">
          Billing email <span aria-hidden="true">*</span>
        </Label>
        <Input
          id="label-billing-email"
          type="email"
          required
          aria-describedby="label-billing-description"
          placeholder="billing@acme.com"
        />
        <p id="label-billing-description" className="text-pretty text-sm text-muted-foreground">
          Required. Receipts and usage alerts are sent here.
        </p>
      </div>
    </Demo>
  );
}

export function InlineLabelDemo() {
  return (
    <Demo>
      <div className="flex items-center gap-2">
        <Checkbox id="label-terms" />
        <Label htmlFor="label-terms">I accept the terms of service</Label>
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <RequiredLabelDemo />;
}
