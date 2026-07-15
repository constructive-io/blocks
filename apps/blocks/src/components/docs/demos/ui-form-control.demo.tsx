'use client';

import { FormControl } from '@constructive-io/ui/form-control';
import { Input } from '@constructive-io/ui/input';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-md flex-col gap-5">
        <FormControl label="Organization name">
          <Input placeholder="Acme Inc." />
        </FormControl>

        <FormControl label="Workspace slug" layout="floating">
          <Input defaultValue="acme" />
        </FormControl>

        <FormControl label="Billing email" error="Enter a valid email address.">
          <Input type="email" defaultValue="billing@acme" />
        </FormControl>
      </div>
    </Demo>
  );
}
