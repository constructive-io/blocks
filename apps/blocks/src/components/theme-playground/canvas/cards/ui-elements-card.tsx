import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, Search } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@constructive-io/ui/alert-dialog';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { ButtonGroup } from '@constructive-io/ui/button-group';
import { Checkbox } from '@constructive-io/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@constructive-io/ui/dropdown-menu';
import { Field, FieldLabel } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@constructive-io/ui/input-group';
import { Kbd } from '@constructive-io/ui/kbd';
import { Radio, RadioGroup } from '@constructive-io/ui/radio-group';
import { Slider } from '@constructive-io/ui/slider';
import { Switch } from '@constructive-io/ui/switch';
import { Textarea } from '@constructive-io/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@constructive-io/ui/toggle-group';

import { SinkCard } from './sink-card';

function TrayRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 py-4 first:pt-0 last:pb-0">
      <p className="text-[11px] font-medium tracking-wide text-subtle-foreground uppercase">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function UiElementsCard() {
  return (
    <SinkCard contentClassName="divide-y divide-border/60 px-4 pt-4 pb-4">
      <TrayRow label="Buttons">
        <Button size="sm">Default</Button>
        <Button variant="secondary" size="sm">
          Secondary
        </Button>
        <Button variant="outline" size="sm">
          Outline
        </Button>
        <Button variant="ghost" size="sm">
          Ghost
        </Button>
        <Button variant="destructive" size="sm">
          Destructive
        </Button>
        <ButtonGroup aria-label="Pagination controls">
          <Button variant="outline" size="sm">
            <ChevronLeft aria-hidden /> Prev
          </Button>
          <Button variant="outline" size="sm">
            Next <ChevronRight aria-hidden />
          </Button>
        </ButtonGroup>
      </TrayRow>
      <TrayRow label="Badges">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="error">Error</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </TrayRow>
      <TrayRow label="Inputs">
        <div className="grid w-full grid-cols-2 gap-2">
          <Input placeholder="Project name" aria-label="Project name" />
          <InputGroup>
            <InputGroupAddon>
              <Search aria-hidden />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search" aria-label="Search" />
            <InputGroupAddon align="inline-end">
              <Kbd>⌘K</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <Textarea placeholder="Notes" aria-label="Notes" rows={2} className="col-span-2" />
        </div>
      </TrayRow>
      <TrayRow label="Choice controls">
        <div className="flex items-center gap-2">
          <Checkbox id="tray-cb-1" defaultChecked aria-label="Enable cache" />
          <FieldLabel htmlFor="tray-cb-1" className="text-[13px] font-normal">
            Cache
          </FieldLabel>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="tray-cb-2" aria-label="Enable telemetry" />
          <FieldLabel htmlFor="tray-cb-2" className="text-[13px] font-normal">
            Telemetry
          </FieldLabel>
        </div>
        <RadioGroup defaultValue="eu" className="flex flex-row items-center gap-3" aria-label="Region">
          <div className="flex items-center gap-1.5">
            <Radio value="eu" aria-label="EU" />
            <span className="text-[13px]">EU</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio value="us" aria-label="US" />
            <span className="text-[13px]">US</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio value="ap" aria-label="APAC" />
            <span className="text-[13px]">APAC</span>
          </div>
        </RadioGroup>
        <div className="flex items-center gap-2">
          <Switch defaultChecked aria-label="Public project" />
          <span className="text-[13px]">Public</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch aria-label="Beta features" />
          <span className="text-[13px]">Beta</span>
        </div>
      </TrayRow>
      <TrayRow label="Range & segmented">
        <div className="flex w-full items-center gap-4">
          <Slider defaultValue={40} aria-label="Sample level" className="min-w-0 flex-1" />
          <ToggleGroup defaultValue={['week']} variant="outline" aria-label="Range">
            <ToggleGroupItem value="day" size="sm">
              Day
            </ToggleGroupItem>
            <ToggleGroupItem value="week" size="sm">
              Week
            </ToggleGroupItem>
            <ToggleGroupItem value="month" size="sm">
              Month
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </TrayRow>
      <TrayRow label="Overlays">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Actions <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem>Rename</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive-outline" size="sm">
              Delete table
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete table?</AlertDialogTitle>
              <AlertDialogDescription>
                This drops `orders` and all of its rows. The action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Delete table</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TrayRow>
    </SinkCard>
  );
}
