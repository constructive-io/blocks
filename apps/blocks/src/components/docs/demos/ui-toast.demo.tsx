'use client';

import { Button } from '@constructive-io/ui/button';
import { Toaster } from '@constructive-io/ui/sonner';
import { toast } from '@constructive-io/ui/toast';

import { Demo } from '@/components/docs/showcase-kit';

const VARIANTS = [
  {
    key: 'success' as const,
    label: 'Success',
    fire: () => toast.success({ message: 'Changes saved', description: 'Your settings were updated.' }),
  },
  {
    key: 'error' as const,
    label: 'Error',
    fire: () =>
      toast.error({ message: 'Request failed', description: 'The database rejected the connection.' }),
  },
  {
    key: 'info' as const,
    label: 'Info',
    fire: () => toast.info({ message: 'New version available', description: 'Reload to get the latest.' }),
  },
  {
    key: 'warning' as const,
    label: 'Warning',
    fire: () => toast.warning({ message: 'Approaching quota', description: 'You are at 90% of your row limit.' }),
  },
];

export function BlockDemo() {
  return (
    <Demo>
      <Toaster />
      <div className="flex flex-col items-center gap-4">
        <p className="text-pretty text-sm text-muted-foreground">Four styled helpers — one per severity.</p>
        <div className="grid grid-cols-2 gap-2">
          {VARIANTS.map((v) => (
            <Button key={v.key} size="sm" variant="outline" onClick={v.fire}>
              toast.{v.key}
            </Button>
          ))}
        </div>
      </div>
    </Demo>
  );
}
