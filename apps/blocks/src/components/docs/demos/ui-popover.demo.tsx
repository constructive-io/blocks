'use client';

import { Settings2 } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@constructive-io/ui/popover';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <Settings2 className="size-4" />
            Connection limits
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <div className="space-y-3">
            <div className="space-y-1">
              <h4 className="text-balance text-sm font-medium leading-none">Connection limits</h4>
              <p className="text-pretty text-sm text-muted-foreground">Tune the pool for this database.</p>
            </div>
            <div className="grid gap-2">
              <div className="grid grid-cols-3 items-center gap-3">
                <Label htmlFor="max">Max</Label>
                <Input id="max" defaultValue="20" className="col-span-2 h-11 sm:h-10" />
              </div>
              <div className="grid grid-cols-3 items-center gap-3">
                <Label htmlFor="idle">Idle (s)</Label>
                <Input id="idle" defaultValue="300" className="col-span-2 h-11 sm:h-10" />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </Demo>
  );
}
