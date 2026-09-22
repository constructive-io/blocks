import { Plus } from 'lucide-react';

import { Avatar, AvatarFallback } from '@constructive-io/ui/avatar';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@constructive-io/ui/tooltip';

import { SinkCard } from './sink-card';

const MEMBERS = [
  { initials: 'AK', name: 'Ana Kaya', role: 'Owner', variant: 'default' },
  { initials: 'JM', name: 'Jon Meyer', role: 'Admin', variant: 'secondary' },
  { initials: 'RS', name: 'Rui Sato', role: 'Editor', variant: 'secondary' },
  { initials: 'LP', name: 'Lea Park', role: 'Viewer', variant: 'outline' },
] as const;

export function TeamCard() {
  return (
    <SinkCard
      title="Team"
      action={
        <Button variant="ghost" size="icon" aria-label="Invite member">
          <Plus aria-hidden />
        </Button>
      }
      contentClassName="flex flex-col divide-y divide-border/60"
    >
      <TooltipProvider>
        {MEMBERS.map((member) => (
          <div key={member.initials} className="flex items-center gap-3 py-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="size-7">
                  <AvatarFallback className="text-[10px]">{member.initials}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{member.name}</TooltipContent>
            </Tooltip>
            <span className="flex-1 text-[13px] font-medium">{member.name}</span>
            <Badge variant={member.variant}>{member.role}</Badge>
          </div>
        ))}
      </TooltipProvider>
    </SinkCard>
  );
}
