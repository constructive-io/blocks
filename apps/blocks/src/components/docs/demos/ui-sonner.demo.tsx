'use client';

import { Button } from '@constructive-io/ui/button';
import { Toaster } from '@constructive-io/ui/sonner';
import { toast } from '@constructive-io/ui/toast';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      {/* The Toaster host is mounted once; toasts fire into it from anywhere. */}
      <Toaster />
      <div className="flex flex-col items-center gap-4">
        <p className="text-pretty max-w-xs text-center text-sm text-muted-foreground">
          Mount one <code>Toaster</code> near your app root. Trigger a toast and it appears in the corner.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() =>
              toast.success({ message: 'Database created', description: 'production-db is ready to use.' })
            }
          >
            Show toast
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toast.info({
                message: 'Deployment queued',
                description: 'Your schema changes will roll out shortly.',
                action: { label: 'View', onClick: () => {} },
              })
            }
          >
            With action
          </Button>
        </div>
      </div>
    </Demo>
  );
}
