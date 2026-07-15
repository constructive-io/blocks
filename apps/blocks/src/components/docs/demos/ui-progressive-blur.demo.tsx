'use client';

import { ProgressiveBlur } from '@constructive-io/ui/progressive-blur';

import { Demo } from '@/components/docs/showcase-kit';

const EVENTS = [
  'production-db created',
  'users table provisioned',
  'RLS policies applied',
  'api_keys table provisioned',
  'read-only role added',
  'organizations table provisioned',
  'sessions table provisioned',
  'GraphQL API published',
  'first row inserted',
  'backup completed',
];

export function BlockDemo() {
  return (
    <Demo>
      <div className="relative h-64 w-full max-w-sm overflow-hidden rounded-lg border bg-background">
        <div className="h-full overflow-y-auto p-4">
          <ul className="space-y-3 text-sm">
            {EVENTS.map((e, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                {e}
              </li>
            ))}
          </ul>
        </div>
        <ProgressiveBlur position="bottom" height="72px" surface="background" />
      </div>
    </Demo>
  );
}
