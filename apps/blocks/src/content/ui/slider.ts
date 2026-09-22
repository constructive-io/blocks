import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiSlider = {
  href: 'https://base-ui.com/react/components/slider',
  label: 'Base UI Slider props',
} as const;

export const sliderDocs = definePrimitiveDocs({
  name: 'slider',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Slider for a numeric value where position on a track communicates magnitude, such as a spend threshold, connection pool size, or retention window.',
    'Use Input when the exact value matters more than its position, when the range is unbounded, or when people need to paste or type a precise number.',
  ],
  usage: {
    demo: 'BasicSliderDemo',
    description:
      'Give every Slider an accessible name with aria-label or aria-labelledby. Use defaultValue when the control can own its initial value.',
  },
  state: {
    title: 'Controlled and uncontrolled value',
    description:
      'Use defaultValue when Slider can own its state. Pass value and onValueChange when the number is synchronized with application or server state. An array value renders one thumb per entry.',
    demo: 'ControlledSliderDemo',
  },
  examples: [
    {
      title: 'Setting with readout',
      description:
        'Pair the slider with a visible label and the formatted current value so the track never has to carry meaning alone.',
      demo: 'SliderFieldDemo',
    },
    {
      title: 'Range',
      description: 'Pass an array as the value to render multiple thumbs for a lower and upper bound.',
      demo: 'RangeSliderDemo',
    },
  ],
  accessibility: [
    'Give every Slider an accessible name. The aria-label on the root is forwarded to each thumb input; multi-thumb sliders receive per-thumb names.',
    'Arrow keys step the focused thumb, Page Up and Page Down move by larger steps, and Home and End jump to the bounds.',
    'Keep the current value visible as text near the slider so position alone is not the only signal.',
    'Do not use a slider when small step differences are consequential — a thumb is imprecise compared to typed input.',
  ],
  api: [
    {
      name: 'Slider',
      description: 'Base UI slider root with a Constructive track, indicator, and thumb treatment.',
      props: [
        {
          name: 'value',
          type: 'number | number[]',
          description: 'Controlled value. An array renders one thumb per entry.',
        },
        { name: 'defaultValue', type: 'number | number[]', description: 'Initial uncontrolled value.' },
        {
          name: 'onValueChange',
          type: '(value: number | number[], eventDetails) => void',
          description: 'Runs when the value changes.',
        },
        { name: 'min', type: 'number', default: '0', description: 'Minimum value.' },
        { name: 'max', type: 'number', default: '100', description: 'Maximum value.' },
        { name: 'step', type: 'number', default: '1', description: 'Step between selectable values.' },
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical'",
          default: "'horizontal'",
          description: 'Axis the track runs along.',
        },
        { name: 'disabled', type: 'boolean', default: 'false', description: 'Prevents interaction and form changes.' },
        { name: 'name', type: 'string', description: 'Name used by the hidden form input.' },
        {
          name: 'aria-label',
          type: 'string',
          description: 'Accessible name forwarded to each thumb input.',
        },
      ],
      upstream: baseUiSlider,
    },
  ],
});
