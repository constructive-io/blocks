'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@constructive-io/ui/avatar';

import { Demo } from '@/components/docs/showcase-kit';

const TEAM = [
  { initials: 'AC', name: 'Ari Chen' },
  { initials: 'JD', name: 'Jordan Díaz' },
  { initials: 'MK', name: 'Mina Kim' },
  { initials: 'RS', name: 'Ravi Shah' },
] as const;

export function BasicAvatarDemo() {
  return (
    <Demo>
      <Avatar className="size-12">
        <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
        <AvatarFallback>SC</AvatarFallback>
      </Avatar>
    </Demo>
  );
}

export function AvatarSizesDemo() {
  return (
    <Demo>
      <div className="flex items-end gap-4">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">SM</AvatarFallback>
        </Avatar>
        <Avatar className="size-10">
          <AvatarFallback>MD</AvatarFallback>
        </Avatar>
        <Avatar className="size-14">
          <AvatarFallback className="text-base">LG</AvatarFallback>
        </Avatar>
        <Avatar className="size-20">
          <AvatarFallback className="text-xl">XL</AvatarFallback>
        </Avatar>
      </div>
    </Demo>
  );
}

export function AvatarGroupDemo() {
  return (
    <Demo>
      <div
        role="group"
        className="flex -space-x-2"
        aria-label={`Project members: ${TEAM.map(({ name }) => name).join(', ')}, and 6 more`}
      >
        {TEAM.map(({ initials, name }) => (
          <Avatar key={name} aria-hidden="true" className="size-9 border-2 border-background">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        ))}
        <Avatar aria-hidden="true" className="size-9 border-2 border-background">
          <AvatarFallback className="bg-primary/10 text-xs text-primary">+6</AvatarFallback>
        </Avatar>
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicAvatarDemo />;
}
