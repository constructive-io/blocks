'use client';

import { Label } from '@constructive-io/ui/label';
import { Textarea } from '@constructive-io/ui/textarea';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-md flex-col gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="ta-desc">Database description</Label>
          <Textarea
            id="ta-desc"
            rows={4}
            placeholder="What does this database power? Who should have access?"
          />
          <p className="text-sm text-muted-foreground">Shown to members on the database overview.</p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ta-readonly">Connection string</Label>
          <Textarea
            id="ta-readonly"
            readOnly
            defaultValue="Connection details are supplied securely at runtime and are not displayed here."
          />
        </div>
      </div>
    </Demo>
  );
}
