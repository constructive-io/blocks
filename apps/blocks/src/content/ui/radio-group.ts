import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiRadio = {
  href: 'https://base-ui.com/react/components/radio',
  label: 'Base UI Radio props',
} as const;

export const radioGroupDocs = definePrimitiveDocs({
  name: 'radio-group',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Radio Group when someone must choose exactly one option from a short set that benefits from staying visible.',
    'Use Select when the list is long or space is limited. Use Checkbox when choices are independent and more than one may be selected.',
  ],
  usage: {
    demo: 'BasicRadioGroupDemo',
    description: 'Place Radio or RadioGroupItem inside RadioGroup, give the group a shared accessible name, and label every item.',
  },
  state: {
    title: 'Controlled and uncontrolled value',
    description:
      'Use defaultValue when RadioGroup can own the initial selection. Pass value and onValueChange when application state is authoritative.',
    demo: 'ControlledRadioGroupDemo',
  },
  examples: [
    {
      title: 'Rich options',
      description: 'Keep supporting details next to each labeled radio while the RadioGroup continues to own one shared value.',
      demo: 'RichRadioGroupDemo',
    },
    {
      title: 'Disabled options',
      description: 'Disable the group or individual items when a choice is unavailable without removing its context.',
      demo: 'DisabledRadioGroupDemo',
    },
  ],
  accessibility: [
    'Give RadioGroup a shared accessible name with aria-label or aria-labelledby, and associate a visible Label with every radio id.',
    'Keep related radios inside one RadioGroup. Base UI manages single selection and arrow-key navigation between enabled items.',
    'Explain why an option is unavailable in nearby text when disabled status is not self-evident.',
  ],
  api: [
    {
      name: 'RadioGroup',
      description: 'Root that coordinates one selected value across a set of radios.',
      props: [
        { name: 'value', type: 'unknown', description: 'Controlled selected item value.' },
        { name: 'defaultValue', type: 'unknown', description: 'Initial selected item value.' },
        {
          name: 'onValueChange',
          type: '(value: unknown, eventDetails) => void',
          description: 'Runs when the selected value changes.',
        },
        { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables every radio in the group.' },
        { name: 'readOnly', type: 'boolean', default: 'false', description: 'Prevents changing the selected value.' },
        { name: 'required', type: 'boolean', default: 'false', description: 'Requires one value before form submission.' },
        { name: 'name', type: 'string', description: 'Name used by the group’s hidden form input.' },
      ],
      upstream: baseUiRadio,
    },
    {
      name: 'Radio',
      description: 'Radio item with a built-in circular control, selected indicator, and hidden form input.',
      props: [
        { name: 'value', type: 'unknown', required: true, description: 'Unique value represented by this item.' },
        { name: 'disabled', type: 'boolean', description: 'Prevents focus and selection for this item.' },
        { name: 'readOnly', type: 'boolean', description: 'Prevents selecting this item.' },
      ],
      upstream: baseUiRadio,
    },
    {
      name: 'RadioGroupItem',
      description: 'Compatibility alias for Radio.',
      upstream: baseUiRadio,
    },
  ],
});
