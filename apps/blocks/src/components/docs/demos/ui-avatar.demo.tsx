'use client';

import { Avatar, AvatarFallback } from '@constructive-io/ui/avatar';

import { Demo } from '@/components/docs/showcase-kit';

const TEAM = ['AC', 'JD', 'MK', 'RS'];

export function BlockDemo() {
  return (
    <Demo>
      <div className="flex flex-col items-center gap-8">
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

        <div className="flex -space-x-2">
          {TEAM.map((initials) => (
            <Avatar key={initials} className="size-9 border-2 border-background">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          ))}
          <Avatar className="size-9 border-2 border-background">
            <AvatarFallback className="bg-primary/10 text-xs text-primary">+6</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </Demo>
  );
}
