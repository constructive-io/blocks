import {
  BASE_PRIMITIVES,
  type BasePrimitiveName,
} from '@/lib/base-primitives';
import { AI_DOC } from '@/lib/ai-docs';
import { COMMAND_PALETTE_DOC } from '@/lib/command-palette-docs';

export type ComponentDocId = BasePrimitiveName | 'command-palette' | 'ai';

export type ComponentDocLink = Readonly<{
  description: string;
  href: string;
  id: ComponentDocId;
  title: string;
}>;

const primitiveLinks: readonly ComponentDocLink[] = BASE_PRIMITIVES.map(
  (primitive) => ({
    description: primitive.description,
    href: `/blocks/ui/${primitive.name}`,
    id: primitive.name,
    title: primitive.title,
  }),
);

const dialogIndex = primitiveLinks.findIndex(({ id }) => id === 'dialog');

export const COMPONENT_DOC_SEQUENCE: readonly ComponentDocLink[] = [
  ...primitiveLinks.slice(0, dialogIndex),
  {
    description: COMMAND_PALETTE_DOC.description,
    href: '/blocks/command-palette',
    id: 'command-palette',
    title: COMMAND_PALETTE_DOC.title,
  },
  {
    description: AI_DOC.description,
    href: '/blocks/ai',
    id: 'ai',
    title: AI_DOC.title,
  },
  ...primitiveLinks.slice(dialogIndex),
];

export function getComponentDocNeighbors(currentId: ComponentDocId) {
  const currentIndex = COMPONENT_DOC_SEQUENCE.findIndex(
    ({ id }) => id === currentId,
  );

  if (currentIndex === -1) {
    throw new Error(`Unknown component documentation route: ${currentId}`);
  }

  return {
    previous:
      currentIndex > 0
        ? COMPONENT_DOC_SEQUENCE[currentIndex - 1]
        : undefined,
    next:
      currentIndex < COMPONENT_DOC_SEQUENCE.length - 1
        ? COMPONENT_DOC_SEQUENCE[currentIndex + 1]
        : undefined,
  };
}
