import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiAccordion = {
  href: 'https://base-ui.com/react/components/accordion',
  label: 'Base UI Accordion props',
} as const;

export const accordionDocs = definePrimitiveDocs({
  name: 'accordion',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Accordion for a stack of sections that expand in place, such as FAQs, advanced settings, or grouped filter panels.',
    'Use Collapsible for a single standalone disclosure. Use Tabs when only one panel is visible at a time and the options are peers rather than a scrollable list.',
  ],
  usage: {
    demo: 'BasicAccordionDemo',
    description:
      'Each AccordionItem needs a unique value. AccordionTrigger renders the row header with a rotating chevron; AccordionContent holds the panel.',
  },
  state: {
    title: 'Open items',
    description:
      'Use defaultValue for uncontrolled open items. Pass value and onValueChange when open state is synchronized with the route or application state, and set multiple to allow several open panels.',
    demo: 'AccordionMultipleDemo',
  },
  examples: [
    {
      title: 'Frequently asked questions',
      description: 'A muted accordion with concise answers works well for documentation and onboarding surfaces.',
      demo: 'AccordionFaqDemo',
    },
  ],
  accessibility: [
    'AccordionTrigger renders a real button inside a heading — keep trigger text short and descriptive because it is announced as the section name.',
    'Set multiple intentionally. Single-open accordions collapse a previously opened panel, which can disorient keyboard users moving through the list.',
    'Do not place focusable content inside the trigger. Interactive elements belong in AccordionContent.',
  ],
  api: [
    {
      name: 'Accordion',
      description: 'Base UI accordion root that owns the set of items.',
      props: [
        { name: 'value', type: 'string[]', description: 'Controlled open item values.' },
        { name: 'defaultValue', type: 'string[]', description: 'Initially open items.' },
        {
          name: 'onValueChange',
          type: '(value: string[], eventDetails) => void',
          description: 'Runs when the set of open items changes.',
        },
        { name: 'multiple', type: 'boolean', default: 'false', description: 'Allows more than one open panel.' },
      ],
      upstream: baseUiAccordion,
    },
    {
      name: 'AccordionItem',
      description: 'One section of the accordion.',
      props: [
        {
          name: 'value',
          type: 'string',
          required: true,
          description: 'Value that identifies the item in the open set.',
        },
        { name: 'disabled', type: 'boolean', default: 'false', description: 'Prevents opening this item.' },
      ],
      upstream: baseUiAccordion,
    },
    {
      name: 'AccordionTrigger',
      description: 'The button that toggles its item, rendered inside a heading with a chevron icon.',
      upstream: baseUiAccordion,
    },
    {
      name: 'AccordionContent',
      description: 'The collapsible panel for an item.',
      upstream: baseUiAccordion,
    },
  ],
});
