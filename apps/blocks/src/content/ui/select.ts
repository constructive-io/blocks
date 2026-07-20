import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiSelect = {
  href: 'https://base-ui.com/react/components/select',
  label: 'Base UI Select props',
} as const;

export const selectDocs = definePrimitiveDocs({
  name: 'select',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Select when someone must choose one value from a fixed list and the options do not need to remain visible.',
    'Use Radio Group for a short set of options that benefits from direct comparison. Use a combobox when the list is long enough to require filtering or free-form input.',
  ],
  usage: {
    demo: 'BasicSelectDemo',
    description:
      'Compose SelectTrigger, SelectValue, SelectContent, and a SelectGroup inside Select. Put every SelectItem, SelectRichItem, or SelectFieldItem inside a group, and associate the trigger with a visible Label when the surrounding context does not already name it.',
  },
  state: {
    title: 'Controlled and uncontrolled value',
    description:
      'Use defaultValue when Select can own its initial value. Pass value and onValueChange when application state is authoritative; open, defaultOpen, and onOpenChange provide the same choice for popup visibility.',
    demo: 'ControlledSelectDemo',
  },
  examples: [
    {
      title: 'Grouped options',
      description: 'Use SelectGroup and SelectLabel to give related options a shared accessible heading.',
      demo: 'GroupedSelectDemo',
    },
    {
      title: 'Trigger sizes',
      description: 'Set size on SelectTrigger without changing the popup or item semantics.',
      demo: 'SelectSizesDemo',
    },
    {
      title: 'Rich items',
      description: 'Use the rich and field item helpers when an option needs supporting metadata.',
      demo: 'RichSelectItemsDemo',
    },
  ],
  accessibility: [
    'Give SelectTrigger an accessible name with a visible Label, aria-label, or aria-labelledby.',
    'Keep every option inside a SelectGroup within SelectContent. Put SelectLabel inside its group when the options need a shared accessible heading.',
    'Do not rely on placeholder text as the only label. Base UI manages focus, arrow-key navigation, typeahead, selection, and focus return.',
  ],
  api: [
    {
      name: 'Select',
      description: 'Root component that manages the selected value and popup state.',
      props: [
        { name: 'value', type: 'string', description: 'Controlled selected value.' },
        { name: 'defaultValue', type: 'string', description: 'Initial value in uncontrolled usage.' },
        {
          name: 'onValueChange',
          type: '(value: string) => void',
          description: 'Runs when the selected value changes.',
        },
        { name: 'open', type: 'boolean', description: 'Controlled popup visibility.' },
        { name: 'defaultOpen', type: 'boolean', description: 'Initial popup visibility.' },
        {
          name: 'onOpenChange',
          type: 'Base UI callback',
          description: 'Runs when popup visibility changes and includes Base UI event details.',
        },
      ],
      upstream: baseUiSelect,
    },
    {
      name: 'SelectTrigger',
      description: 'Button that opens the list and displays the current value.',
      props: [
        {
          name: 'size',
          type: "'sm' | 'default' | 'lg'",
          default: "'default'",
          description: 'Sets the trigger height and horizontal spacing.',
        },
        { name: 'render', type: 'ReactElement | render function', description: 'Base UI composition API.' },
        {
          name: 'nativeButton',
          type: 'boolean',
          default: 'true',
          description: 'Set to false when render resolves to a non-button element.',
        },
      ],
      upstream: baseUiSelect,
    },
    {
      name: 'SelectValue',
      description: 'Renders the selected item text or a placeholder.',
      props: [
        {
          name: 'placeholder',
          type: 'string',
          description: 'Text shown before a value is selected.',
        },
      ],
      upstream: baseUiSelect,
    },
    {
      name: 'SelectPopup',
      description: 'Popup composition that includes the portal, positioner, scroll controls, and option list.',
      props: [
        { name: 'sideOffset', type: 'number', default: '4', description: 'Distance from the trigger.' },
        {
          name: 'alignItemWithTrigger',
          type: 'boolean',
          default: 'false',
          description: 'Aligns the selected item with the trigger when enabled.',
        },
        {
          name: 'position',
          type: "'item-aligned' | 'popper'",
          deprecated: true,
          description: 'Compatibility prop retained from the former implementation; Base UI ignores it.',
        },
      ],
      upstream: baseUiSelect,
    },
    {
      name: 'SelectContent',
      description: 'Compatibility alias for SelectPopup.',
      upstream: baseUiSelect,
    },
    {
      name: 'SelectItem',
      description: 'Selectable option with an indicator and item text.',
      props: [
        { name: 'value', type: 'string', required: true, description: 'Value represented by the option.' },
        { name: 'disabled', type: 'boolean', description: 'Prevents focus and selection.' },
      ],
      upstream: baseUiSelect,
    },
    {
      name: 'SelectRichItem',
      description: 'Select item with optional icon, label, and secondary description.',
      props: [
        { name: 'value', type: 'string', required: true, description: 'Value represented by the option.' },
        { name: 'label', type: 'ReactNode', description: 'Primary option label.' },
        { name: 'description', type: 'ReactNode', description: 'Supporting text under the label.' },
        { name: 'icon', type: 'ReactNode', description: 'Decorative or contextual icon beside the label.' },
      ],
      upstream: baseUiSelect,
    },
    {
      name: 'SelectFieldItem',
      description: 'Select item specialized for a field name and optional type annotation.',
      props: [
        { name: 'value', type: 'string', required: true, description: 'Value represented by the option.' },
        { name: 'name', type: 'string', required: true, description: 'Field name shown as the option label.' },
        { name: 'type', type: 'string', description: 'Muted type annotation aligned to the end.' },
      ],
      upstream: baseUiSelect,
    },
    { name: 'SelectSeparator', description: 'Visual and semantic divider between option groups.', upstream: baseUiSelect },
    { name: 'SelectGroup', description: 'Groups related options under a shared label.', upstream: baseUiSelect },
    { name: 'SelectGroupLabel', description: 'Accessible label for a SelectGroup.', upstream: baseUiSelect },
    { name: 'SelectLabel', description: 'Compatibility alias for SelectGroupLabel.', upstream: baseUiSelect },
  ],
});
