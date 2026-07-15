'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIcon,
  CollapsibleTrigger,
} from '@constructive-io/ui/collapsible';

import { Demo } from '@/components/docs/showcase-kit';

const FAQ = [
  {
    q: 'How is row-level security enforced?',
    a: 'Every table ships with RLS policies derived from your access rules, so reads and writes are scoped per actor at the database level.',
  },
  {
    q: 'Can I bring my own auth?',
    a: 'Yes. The auth flows are optional building blocks — wire them up, or call the GraphQL API with your own tokens.',
  },
  {
    q: 'Where does my data live?',
    a: 'In your own PostgreSQL database. Constructive generates the schema, policies, and API on top of it.',
  },
];

export function BlockDemo() {
  return (
    <Demo>
      <div className="w-full max-w-lg divide-y rounded-lg border bg-background">
        {FAQ.map((item) => (
          <Collapsible key={item.q}>
            <CollapsibleTrigger className="px-4 py-3 hover:bg-accent/50">
              <span>{item.q}</span>
              <CollapsibleIcon />
            </CollapsibleTrigger>
            <CollapsibleContent innerClassName="border-t px-4">
              <p className="text-pretty text-muted-foreground">{item.a}</p>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </Demo>
  );
}
