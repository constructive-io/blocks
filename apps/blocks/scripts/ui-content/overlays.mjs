/**
 * ui-content — Overlays family.
 *
 * Per-item docs content for the `ui` category pages. See ./index.mjs for the
 * full contract. `intro: null` / `usage: null` means "not yet authored" — the
 * generator skips the page and the parity test fails until it is filled in.
 */

export const ITEMS = {
  'tooltip': {
    tier: 'showcase',
    intro: `A small label that appears on hover or focus to explain a control — for hints, never essential text, since some assistive tech skips it.`,
    usage: `import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@constructive-io/ui/tooltip';
import { Button } from '@constructive-io/ui/button';

export function Example() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Add a new database</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}`,
    parts: [
      { name: 'TooltipProvider', description: 'Shares hover-delay timing across the tooltips it wraps; mount it once near the root.' },
      { name: 'TooltipTrigger', description: 'The element that reveals the tooltip. Use asChild to wrap your own button instead of rendering one.' },
      { name: 'TooltipContent', description: 'The floating label. Accepts side, align, sideOffset, and showArrow.' },
    ],
  },
  'popover': {
    tier: 'showcase',
    intro: `A floating panel anchored to a trigger, for non-modal content that doesn't warrant a full dialog — a settings cluster or date picker.`,
    usage: `import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@constructive-io/ui/popover';
import { Button } from '@constructive-io/ui/button';

export function Example() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm">Anchored, non-modal content.</p>
      </PopoverContent>
    </Popover>
  );
}`,
    parts: [
      { name: 'PopoverTrigger', description: 'The anchor that toggles the panel. Use asChild to keep your own button.' },
      { name: 'PopoverContent', description: 'The floating panel. Accepts side, align, sideOffset, and showArrow.' },
      { name: 'PopoverAnchor', description: 'Optional element to position against when the anchor differs from the trigger.' },
    ],
  },
  'dialog': {
    tier: 'showcase',
    intro: `A modal window that opens over the page and traps focus until dismissed, for focused tasks like editing a record or confirming details.`,
    usage: `import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@constructive-io/ui/dialog';
import { Button } from '@constructive-io/ui/button';

export function Example() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Edit profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update your details and save.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}`,
    parts: [
      { name: 'DialogTrigger', description: 'Opens the dialog. Use asChild to wrap your own button.' },
      { name: 'DialogContent', description: 'The modal panel; renders the backdrop and a close button. (Alias of DialogPopup.)' },
      { name: 'DialogHeader / DialogTitle / DialogDescription', description: 'The titled header region; Title and Description are wired up for screen readers.' },
      { name: 'DialogFooter', description: 'The action row; right-aligns buttons on wider screens.' },
      { name: 'DialogPanel', description: 'A scrollable body region for long content between header and footer.' },
      { name: 'DialogClose', description: 'Dismisses the dialog; wrap your own button with asChild.' },
    ],
  },
  'alert-dialog': {
    tier: 'showcase',
    intro: `A modal that interrupts to confirm a consequential or destructive action, offering an explicit confirm and cancel.`,
    usage: `import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@constructive-io/ui/alert-dialog';
import { Button } from '@constructive-io/ui/button';

export function Example() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete database</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the database and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}`,
    parts: [
      { name: 'AlertDialogTrigger', description: 'Opens the confirmation. Use asChild to wrap your own button.' },
      { name: 'AlertDialogContent', description: 'The modal panel with its backdrop.' },
      { name: 'AlertDialogHeader / AlertDialogTitle / AlertDialogDescription', description: 'The titled header stating the question and its consequence.' },
      { name: 'AlertDialogAction', description: 'The confirm button; closes the dialog and carries primary styling.' },
      { name: 'AlertDialogCancel', description: 'The dismiss button; closes without acting, styled as outline.' },
    ],
  },
  'dropdown-menu': {
    tier: 'showcase',
    intro: `A menu of actions that opens from a trigger — a list of commands rather than a value picker.`,
    usage: `import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '@constructive-io/ui/dropdown-menu';
import { Button } from '@constructive-io/ui/button';

export function Example() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>
          Settings
          <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}`,
    parts: [
      { name: 'DropdownMenuTrigger', description: 'Opens the menu. Use asChild to wrap your own button.' },
      { name: 'DropdownMenuContent', description: 'The floating menu surface; accepts side, align, and sideOffset.' },
      { name: 'DropdownMenuItem', description: 'A single command. Supports inset and a destructive variant.' },
      { name: 'DropdownMenuCheckboxItem / DropdownMenuRadioGroup / DropdownMenuRadioItem', description: 'Toggleable and single-choice items for stateful menus.' },
      { name: 'DropdownMenuLabel / DropdownMenuSeparator / DropdownMenuShortcut', description: 'A section heading, a divider, and a trailing keyboard hint.' },
      { name: 'DropdownMenuSub / DropdownMenuSubTrigger / DropdownMenuSubContent', description: 'A nested submenu opened from within the menu.' },
    ],
  },
  'sheet': {
    tier: 'showcase',
    intro: `A panel that slides in from a screen edge, for secondary flows that need more room than a popover — filters, a detail editor, navigation.`,
    usage: `import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@constructive-io/ui/sheet';
import { Button } from '@constructive-io/ui/button';

export function Example() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open panel</Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit settings</SheetTitle>
          <SheetDescription>Changes apply on save.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="submit">Save</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}`,
    props: [
      { name: 'side (on SheetContent)', type: `'top' | 'right' | 'bottom' | 'left'`, default: `'right'`, description: 'Which edge the panel slides in from.' },
      { name: 'showClose (on SheetContent)', type: `boolean`, default: `true`, description: 'Render the built-in close button.' },
    ],
    parts: [
      { name: 'SheetTrigger', description: 'Opens the sheet. Use asChild to wrap your own button.' },
      { name: 'SheetContent', description: 'The sliding panel. Set side to choose the edge.' },
      { name: 'SheetHeader / SheetTitle / SheetDescription', description: 'The titled header region.' },
      { name: 'SheetFooter', description: 'The action row pinned to the bottom of the panel.' },
      { name: 'SheetClose', description: 'Dismisses the sheet; wrap your own button with asChild.' },
      { name: 'SheetStackProvider', description: 'Opt-in wrapper that lets nested sheets stack and offset instead of replacing each other.' },
    ],
  },
  'drawer': {
    tier: 'showcase',
    intro: `An edge-anchored panel with a drag handle and momentum, built on Vaul — a touch-friendly bottom or side sheet users can flick open and closed.`,
    usage: `import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@constructive-io/ui/drawer';
import { Button } from '@constructive-io/ui/button';

export function Example() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Quick actions</DrawerTitle>
          <DrawerDescription>Swipe down to dismiss.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}`,
    props: [
      { name: 'direction (on Drawer)', type: `'top' | 'right' | 'bottom' | 'left'`, default: `'bottom'`, description: 'Which edge the drawer animates from (a Vaul prop).' },
    ],
    parts: [
      { name: 'DrawerTrigger', description: 'Opens the drawer. Use asChild to wrap your own button.' },
      { name: 'DrawerContent', description: 'The sliding panel; the drag handle appears when it opens from the bottom.' },
      { name: 'DrawerHeader / DrawerTitle / DrawerDescription', description: 'The titled header region.' },
      { name: 'DrawerFooter', description: 'The action row at the bottom of the panel.' },
      { name: 'DrawerClose', description: 'Dismisses the drawer; wrap your own button with asChild.' },
    ],
  },
  'command': {
    tier: 'showcase',
    intro: `A keyboard-first command palette: a search box over grouped, filterable items, built on cmdk. Shown inline; wrap in CommandDialog for a command-K launcher.`,
    usage: `import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@constructive-io/ui/command';

export function Example() {
  return (
    <Command className="rounded-lg border shadow-md">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          <CommandGroupLabel>Navigation</CommandGroupLabel>
          <CommandItem value="dashboard">Go to dashboard</CommandItem>
          <CommandItem value="settings">
            Open settings
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup>
          <CommandGroupLabel>Account</CommandGroupLabel>
          <CommandItem value="sign-out">Sign out</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}`,
    parts: [
      { name: 'CommandInput', description: 'The search field that filters the list as you type.' },
      { name: 'CommandList / CommandItem', description: 'The scrollable result list and its selectable rows; give each item a value to make it searchable.' },
      { name: 'CommandGroup / CommandGroupLabel', description: 'Group related items under a heading.' },
      { name: 'CommandEmpty', description: 'Shown when the query matches nothing.' },
      { name: 'CommandSeparator / CommandShortcut', description: 'A divider between groups and a trailing keyboard hint.' },
      { name: 'CommandDialog', description: 'Wraps the palette in a floating modal for a command-K launcher.' },
    ],
  },
};
