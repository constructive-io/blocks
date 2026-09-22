'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@constructive-io/ui/accordion';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicAccordionDemo() {
  return (
    <Demo>
      <Accordion defaultValue={['item-1']} className="w-full max-w-sm">
        <AccordionItem value="item-1">
          <AccordionTrigger>What is a feature pack?</AccordionTrigger>
          <AccordionContent>
            A bundle of schema, blocks, and presets that installs together as one product surface.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>How do previews stay isolated?</AccordionTrigger>
          <AccordionContent>
            Each preview renders in an iframe with its own color mode and portal root.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Demo>
  );
}

export function AccordionMultipleDemo() {
  return (
    <Demo>
      <Accordion multiple defaultValue={['compute']} className="w-full max-w-sm">
        <AccordionItem value="compute">
          <AccordionTrigger>Compute</AccordionTrigger>
          <AccordionContent>Autoscaling, pooling, and read replica settings.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="storage">
          <AccordionTrigger>Storage</AccordionTrigger>
          <AccordionContent>Quotas, backups, and point-in-time recovery windows.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="network">
          <AccordionTrigger>Network</AccordionTrigger>
          <AccordionContent>Regions, egress budgets, and connection limits.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </Demo>
  );
}

export function AccordionFaqDemo() {
  return (
    <Demo>
      <div className="w-full max-w-md rounded-lg border bg-background p-5">
        <p className="mb-2 text-sm font-medium">Billing FAQ</p>
        <Accordion>
          <AccordionItem value="faq-1">
            <AccordionTrigger>When am I charged?</AccordionTrigger>
            <AccordionContent>Usage accrues hourly and invoices settle on the first of each month.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-2">
            <AccordionTrigger>Do unused credits roll over?</AccordionTrigger>
            <AccordionContent>
              Compute credits expire after 12 months; transferred credits keep their original expiry.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-3">
            <AccordionTrigger>Can I export invoices?</AccordionTrigger>
            <AccordionContent>Every invoice is available as a PDF and through the billing API.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <AccordionFaqDemo />;
}
