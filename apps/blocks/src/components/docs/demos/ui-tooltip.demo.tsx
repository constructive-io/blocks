'use client';

import { Plus } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@constructive-io/ui/tooltip';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <TooltipProvider>
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" aria-label="New database">
                <Plus className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create a database</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover for details</Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" showArrow>
              Backups run nightly at 02:00 UTC
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </Demo>
  );
}
