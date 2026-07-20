'use client';

import { useState } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIcon,
  CollapsibleTrigger,
} from '@constructive-io/ui/collapsible';

import { Demo } from '@/components/docs/showcase-kit';

const SECURITY_ANSWER =
  'Every table ships with row-level security policies derived from your access rules.';

export function BasicCollapsibleDemo() {
  return (
    <Demo>
      <Collapsible className="w-full max-w-lg rounded-lg border bg-background">
        <CollapsibleTrigger className="px-4 py-3 hover:bg-accent/50">
          <span>How is row-level security enforced?</span>
          <CollapsibleIcon aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent innerClassName="border-t px-4">
          <p className="text-pretty text-muted-foreground">{SECURITY_ANSWER}</p>
        </CollapsibleContent>
      </Collapsible>
    </Demo>
  );
}

export function ControlledCollapsibleDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Demo>
      <div className="flex w-full max-w-lg flex-col gap-3">
        <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border bg-background">
          <CollapsibleTrigger className="px-4 py-3 hover:bg-accent/50">
            <span>{open ? 'Hide security details' : 'Show security details'}</span>
            <CollapsibleIcon aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent innerClassName="border-t px-4">
            <p className="text-pretty text-sm text-muted-foreground">{SECURITY_ANSWER}</p>
          </CollapsibleContent>
        </Collapsible>
        <p className="text-pretty text-sm text-muted-foreground">Panel is {open ? 'open' : 'closed'}.</p>
      </div>
    </Demo>
  );
}

export function DefaultOpenCollapsibleDemo() {
  return (
    <Demo>
      <Collapsible defaultOpen className="w-full max-w-lg rounded-lg border bg-background">
        <CollapsibleTrigger className="px-4 py-3 hover:bg-accent/50">
          <span>Database location</span>
          <CollapsibleIcon aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent innerClassName="border-t px-4">
          <p className="text-pretty text-muted-foreground">
            Your data remains in your PostgreSQL database and chosen deployment region.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicCollapsibleDemo />;
}
