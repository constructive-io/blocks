import { definePrimitiveDocs } from '@/lib/primitive-docs';

const htmlLabel = {
  href: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/label',
  label: 'HTML label attributes',
} as const;

export const labelDocs = definePrimitiveDocs({
  name: 'label',
  stateModel: 'stateless',
  whenToUse: [
    'Use Label to give a form control a visible name and a larger click or tap target.',
    'Use a fieldset and legend for the shared name of a checkbox or radio group. Use aria-label only when a visible label would repeat clear surrounding context.',
  ],
  usage: {
    demo: 'BasicLabelDemo',
    description: 'Set htmlFor to the id of one labelable form control so activating the Label focuses or toggles that control.',
  },
  examples: [
    {
      title: 'Required fields',
      description: 'Show required status in text while keeping the native required attribute on the control.',
      demo: 'RequiredLabelDemo',
    },
    {
      title: 'Inline controls',
      description: 'Place Label beside a checkbox or switch when the label should toggle the control.',
      demo: 'InlineLabelDemo',
    },
  ],
  accessibility: [
    'Match Label htmlFor to the id of exactly one labelable control. Do not point a Label at a layout container.',
    'Keep labels visible and specific. Placeholder text disappears during entry and does not provide a reliable accessible name.',
    'Indicate required status in readable text or with a explained symbol, and set required or aria-required on the associated control.',
  ],
  api: [
    {
      name: 'Label',
      description: 'Styled native label element that inherits disabled styling from common field compositions.',
      props: [
        {
          name: 'htmlFor',
          type: 'string',
          description: 'Id of the form control this label names and activates.',
        },
      ],
      upstream: htmlLabel,
    },
  ],
});
