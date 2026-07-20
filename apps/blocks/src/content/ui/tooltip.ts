import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiTooltip = {
  href: 'https://base-ui.com/react/components/tooltip',
  label: 'Base UI Tooltip props',
} as const;

export const tooltipDocs = definePrimitiveDocs({
  name: 'tooltip',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Tooltip for a short, non-interactive hint that clarifies an otherwise understandable control.',
    'Use Popover when the surface needs links, fields, or actions. Keep essential instructions and error messages visible instead of placing them only in a tooltip.',
  ],
  usage: {
    demo: 'BasicTooltipDemo',
    description:
      'Wrap related tooltips in TooltipProvider, then compose TooltipTrigger and TooltipContent inside each Tooltip root. Use render for Base UI composition or asChild for compatibility, and match the visible hint to the trigger purpose.',
  },
  state: {
    title: 'Controlled and uncontrolled open state',
    description:
      'Tooltip normally owns its hover and focus state. Pass open and onOpenChange only when another interaction must synchronize the hint; keep pointer and keyboard access intact.',
    demo: 'ControlledTooltipDemo',
  },
  examples: [
    {
      title: 'Placement, arrow, and delay',
      description: 'Set delay on the provider or trigger, choose a side, and show the arrow when it improves spatial clarity.',
      demo: 'PositionedTooltipDemo',
    },
    {
      title: 'Disabled trigger',
      description: 'Render the trigger on a focusable wrapper when the disabled control cannot emit pointer or focus events.',
      demo: 'DisabledTriggerTooltipDemo',
    },
  ],
  accessibility: [
    'Keep TooltipContent concise and non-interactive. A tooltip supplements the trigger name and cannot replace a persistent label for unfamiliar controls.',
    'Make the trigger keyboard focusable. For disabled controls, attach TooltipTrigger to a wrapper that can receive pointer and focus events.',
    'Base UI opens tooltips from hover or focus, closes them on Escape, and preserves the relationship through the portal chain.',
  ],
  api: [
    {
      name: 'TooltipProvider',
      description: 'Coordinates open delays and behavior across related tooltips.',
      props: [
        { name: 'delay', type: 'number', default: '0', description: 'Delay in milliseconds before opening.' },
        { name: 'delayDuration', type: 'number', deprecated: true, description: 'Compatibility alias for delay.' },
      ],
      upstream: baseUiTooltip,
    },
    {
      name: 'Tooltip',
      description: 'Root that owns or receives tooltip visibility.',
      props: [
        { name: 'open', type: 'boolean', description: 'Controlled open state.' },
        { name: 'defaultOpen', type: 'boolean', description: 'Initial open state in uncontrolled usage.' },
        { name: 'onOpenChange', type: 'Base UI callback', description: 'Runs when visibility changes.' },
        { name: 'delayDuration', type: 'number', deprecated: true, description: 'Compatibility prop; set delay on TooltipTrigger instead.' },
      ],
      upstream: baseUiTooltip,
    },
    {
      name: 'TooltipTrigger',
      description: 'Element whose hover or focus state opens the tooltip.',
      props: [
        { name: 'delay', type: 'number', default: '0', description: 'Trigger-specific opening delay.' },
        { name: 'render', type: 'ReactElement | render function', description: 'Preferred Base UI composition API.' },
        { name: 'asChild', type: 'boolean', default: 'false', description: 'Compatibility composition API.' },
      ],
      upstream: baseUiTooltip,
    },
    {
      name: 'TooltipContent',
      description: 'Portal, positioner, popup, and optional arrow composition.',
      props: [
        { name: 'side', type: "'top' | 'right' | 'bottom' | 'left'", default: "'top'", description: 'Preferred side of the trigger.' },
        { name: 'align', type: "'start' | 'center' | 'end'", default: "'center'", description: 'Alignment along the trigger edge.' },
        { name: 'sideOffset', type: 'number', default: '4', description: 'Distance from the trigger.' },
        { name: 'showArrow', type: 'boolean', default: 'false', description: 'Renders an arrow pointing toward the trigger.' },
      ],
      upstream: baseUiTooltip,
    },
  ],
});
