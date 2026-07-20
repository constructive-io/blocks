'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@constructive-io/ui/dropdown-menu';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicDropdownMenuDemo() {
  return (
    <Demo>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />} nativeButton>
          Actions
          <ChevronDown aria-hidden="true" data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Database</DropdownMenuLabel>
            <DropdownMenuItem>
              Open console
              <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem>Export schema</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive">Delete database</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Demo>
  );
}

export function ControlledDropdownMenuDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Demo>
      <div className="flex flex-col items-center gap-3">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger render={<Button variant="outline" />}>Choose an action</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem>Open console</DropdownMenuItem>
              <DropdownMenuItem>View metrics</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <p className="text-pretty text-sm text-muted-foreground">Menu is {open ? 'open' : 'closed'}.</p>
      </div>
    </Demo>
  );
}

export function SelectionDropdownMenuDemo() {
  const [metrics, setMetrics] = useState(true);
  const [region, setRegion] = useState('us-east-1');

  return (
    <Demo>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>View options</DropdownMenuTrigger>
        <DropdownMenuContent className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Panels</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={metrics} onCheckedChange={setMetrics}>
              Show metrics
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Region</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={region} onValueChange={setRegion}>
              <DropdownMenuRadioItem value="us-east-1">US East</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="eu-west-1">EU West</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Demo>
  );
}

export function SubmenuDropdownMenuDemo() {
  return (
    <Demo>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>Move database</DropdownMenuTrigger>
        <DropdownMenuContent className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuItem>Move to project</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Change region</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuGroup>
                  <DropdownMenuItem>US East</DropdownMenuItem>
                  <DropdownMenuItem>US West</DropdownMenuItem>
                  <DropdownMenuItem>EU West</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicDropdownMenuDemo />;
}
