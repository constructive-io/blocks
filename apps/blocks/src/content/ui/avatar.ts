import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiAvatar = {
  href: 'https://base-ui.com/react/components/avatar',
  label: 'Base UI Avatar props',
} as const;

export const avatarDocs = definePrimitiveDocs({
  name: 'avatar',
  stateModel: 'stateless',
  whenToUse: [
    'Use Avatar to represent a person, team, or other named entity with an image and a reliable fallback.',
    'Use a plain image for editorial content that does not represent an identity. Use an icon when the graphic describes an action rather than an entity.',
  ],
  usage: {
    demo: 'BasicAvatarDemo',
    description:
      'Place AvatarImage and AvatarFallback inside Avatar. Give the image useful alternative text and make the fallback identify the same entity when the image is unavailable.',
  },
  examples: [
    {
      title: 'Sizes',
      description: 'Set the Avatar dimensions with className; its image and fallback inherit the circular frame.',
      demo: 'AvatarSizesDemo',
    },
    {
      title: 'Avatar group',
      description: 'Overlap compact avatars to summarize a group, and give the group an accessible name that identifies its members.',
      demo: 'AvatarGroupDemo',
    },
  ],
  accessibility: [
    'Give AvatarImage an alt value that identifies the represented person or entity. Use alt="" only when adjacent text already provides the same name.',
    'Keep fallback text short but meaningful, such as recognizable initials. Do not rely on an unfamiliar abbreviation as the only accessible identity.',
    'When avatars form a group, label the group with the member names or provide the same names in visible text; overlapping images alone do not communicate membership.',
  ],
  api: [
    {
      name: 'Avatar',
      description: 'Root span that provides image loading state and clips its contents to a circular frame.',
      props: [
        {
          name: 'render',
          type: 'ReactElement | render function',
          description: 'Replaces the root span or composes Avatar with another element through the Base UI render API.',
        },
      ],
      upstream: baseUiAvatar,
    },
    {
      name: 'AvatarImage',
      description: 'Image shown after its source loads successfully.',
      props: [
        { name: 'src', type: 'string', description: 'Image source passed to the underlying img element.' },
        {
          name: 'alt',
          type: 'string',
          description: 'Native image alternative text; supply the represented name unless nearby text already does so.',
        },
        {
          name: 'onLoadingStatusChange',
          type: '(status: ImageLoadingStatus) => void',
          description: 'Runs when the image moves between idle, loading, loaded, and error states.',
        },
      ],
      upstream: baseUiAvatar,
    },
    {
      name: 'AvatarFallback',
      description: 'Fallback content shown when no image is available or loading fails.',
      props: [
        {
          name: 'delay',
          type: 'number',
          description: 'Milliseconds to wait before showing the fallback, which can prevent a brief flash during normal image loading.',
        },
        {
          name: 'delayMs',
          type: 'number',
          deprecated: true,
          description: 'Compatibility alias for delay. Use delay in new code; delay takes precedence when both are set.',
        },
      ],
      upstream: baseUiAvatar,
    },
  ],
});
