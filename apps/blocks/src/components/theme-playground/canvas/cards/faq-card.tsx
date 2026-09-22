import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@constructive-io/ui/accordion';
import { Button } from '@constructive-io/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';

import { SinkCard } from './sink-card';

const FAQS: Record<string, [string, string][]> = {
  general: [
    ['What counts as a compute hour?', 'One vCPU running for one hour, billed per second.'],
    ['Can I pause a project?', 'Yes — pausing stops compute billing while storage stays reserved.'],
    ['Where are my backups?', 'Nightly snapshots land in your configured destination.'],
  ],
  billing: [
    ['How do read replicas bill?', 'Each replica is billed at ~$48/mo, prorated by the minute.'],
    ['When do credits expire?', 'Purchased credits expire 12 months after the invoice date.'],
    ['Can I get an invoice copy?', 'Invoices are emailed monthly and archived under Billing.'],
  ],
  security: [
    ['Do you support SSO?', 'SAML and OIDC are available on the Scale plan.'],
    ['How are secrets stored?', 'Secrets are encrypted at rest and rotated on deploy.'],
    ['Can I restrict API keys?', 'Yes — scope keys per project and per role from Access.'],
  ],
};

export function FaqCard() {
  return (
    <SinkCard
      contentClassName="px-4 pt-4"
      footer={
        <Button variant="ghost" size="sm" className="-ml-2">
          Still stuck? Contact support
        </Button>
      }
    >
      <Tabs defaultValue="general">
        <TabsList className="w-full">
          <TabsTrigger value="general" className="flex-1">
            General
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex-1">
            Billing
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-1">
            Security
          </TabsTrigger>
        </TabsList>
        {Object.entries(FAQS).map(([key, items]) => (
          <TabsContent key={key} value={key} className="pt-2">
            <Accordion>
              {items.map(([q, a], index) => (
                <AccordionItem key={index} value={`${key}-${index}`}>
                  <AccordionTrigger className="py-2.5 text-left text-[13px]">{q}</AccordionTrigger>
                  <AccordionContent className="text-[13px]">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        ))}
      </Tabs>
    </SinkCard>
  );
}
