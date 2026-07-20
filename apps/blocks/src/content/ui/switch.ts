import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiSwitch = {
  href: 'https://base-ui.com/react/components/switch',
  label: 'Base UI Switch props',
} as const;

export const switchDocs = definePrimitiveDocs({
  name: 'switch',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Switch for a binary setting whose effect applies immediately, such as enabling notifications or row-level security.',
    'Use Checkbox for acknowledgments, form choices applied on submit, or selecting items from a set.',
  ],
  usage: {
    demo: 'BasicSwitchDemo',
    description: 'Associate Switch with a visible Label by matching id and htmlFor. Use defaultChecked for a locally owned initial setting.',
  },
  state: {
    title: 'Controlled and uncontrolled checked state',
    description:
      'Use defaultChecked when Switch can own its state. Pass checked and onCheckedChange when the setting is synchronized with application or server state.',
    demo: 'ControlledSwitchDemo',
  },
  examples: [
    {
      title: 'Settings list',
      description: 'Pair each switch with a clear setting name and supporting text, and leave unavailable settings visible when their context matters.',
      demo: 'SwitchSettingsDemo',
    },
  ],
  accessibility: [
    'Give every Switch an accessible name with a visible Label, aria-label, or aria-labelledby.',
    'Connect supporting text or an unavailable-setting explanation with aria-describedby when it adds information beyond the Label.',
    'Describe the setting rather than the gesture. The checked state already communicates on or off, so labels such as “Enable notifications” remain clear in either state.',
    'Apply the setting when the checked value changes. If changes are deferred until form submission, Checkbox is usually the clearer control.',
  ],
  api: [
    {
      name: 'Switch',
      description: 'Base UI switch root with a Constructive track, thumb, and hidden form input.',
      props: [
        { name: 'checked', type: 'boolean', description: 'Controlled on or off state.' },
        { name: 'defaultChecked', type: 'boolean', default: 'false', description: 'Initial uncontrolled state.' },
        {
          name: 'onCheckedChange',
          type: '(checked: boolean, eventDetails) => void',
          description: 'Runs when the checked state changes.',
        },
        { name: 'disabled', type: 'boolean', default: 'false', description: 'Prevents interaction and form changes.' },
        { name: 'readOnly', type: 'boolean', default: 'false', description: 'Prevents changing the state while retaining focusability.' },
        { name: 'required', type: 'boolean', default: 'false', description: 'Requires the switch to be on before form submission.' },
        { name: 'name', type: 'string', description: 'Name used by the hidden form input.' },
        { name: 'value', type: 'string', description: 'Value submitted when the switch is on.' },
        { name: 'uncheckedValue', type: 'string', description: 'Optional value submitted when the switch is off.' },
      ],
      upstream: baseUiSwitch,
    },
  ],
});
