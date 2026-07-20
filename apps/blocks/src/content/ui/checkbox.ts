import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiCheckbox = {
  href: 'https://base-ui.com/react/components/checkbox',
  label: 'Base UI Checkbox props',
} as const;

export const checkboxDocs = definePrimitiveDocs({
  name: 'checkbox',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Checkbox for an independent choice, a form acknowledgment, or selecting any number of options from a set.',
    'Use Radio Group when exactly one option may be selected. Use Switch when changing the value should take effect immediately as a setting.',
  ],
  usage: {
    demo: 'BasicCheckboxDemo',
    description: 'Associate Checkbox with a visible Label by matching id and htmlFor. Use defaultChecked when the control can own its initial value.',
  },
  state: {
    title: 'Controlled and uncontrolled checked state',
    description:
      'Use defaultChecked when Checkbox can own its state. Pass checked and onCheckedChange when application state is authoritative; indeterminate is a separate mixed-state signal.',
    demo: 'ControlledCheckboxDemo',
  },
  examples: [
    {
      title: 'Indeterminate selection',
      description: 'Set indeterminate on a parent choice when only some of its child choices are checked.',
      demo: 'CheckboxGroupDemo',
    },
  ],
  accessibility: [
    'Give every Checkbox an accessible name with a visible Label, an enclosing label, aria-label, or aria-labelledby.',
    'Wrap related choices in a fieldset with a legend so the set has a shared accessible name. Keep each Checkbox individually labeled.',
    'Indeterminate communicates a mixed visual and semantic state but does not calculate child values. Update the parent and child checked states together in application logic.',
  ],
  api: [
    {
      name: 'Checkbox',
      description: 'Base UI checkbox root with a built-in control, check indicator, mixed-state indicator, and hidden form input.',
      props: [
        { name: 'checked', type: 'boolean', description: 'Controlled checked state.' },
        { name: 'defaultChecked', type: 'boolean', default: 'false', description: 'Initial checked state.' },
        {
          name: 'onCheckedChange',
          type: '(checked: boolean, eventDetails) => void',
          description: 'Runs when the checked state changes.',
        },
        {
          name: 'indeterminate',
          type: 'boolean',
          default: 'false',
          description: 'Shows and exposes the mixed state independently of checked.',
        },
        { name: 'disabled', type: 'boolean', default: 'false', description: 'Prevents interaction and form changes.' },
        {
          name: 'parent',
          type: 'boolean',
          default: 'false',
          description: 'Marks the control as a parent when it participates in Base UI Checkbox Group.',
        },
        { name: 'name', type: 'string', description: 'Name used by the hidden form input.' },
        { name: 'value', type: 'string', description: 'Value submitted when the checkbox is checked.' },
        { name: 'uncheckedValue', type: 'string', description: 'Optional value submitted when the checkbox is unchecked.' },
      ],
      upstream: baseUiCheckbox,
    },
  ],
});
