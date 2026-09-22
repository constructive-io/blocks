import { CalendarIcon, CalculatorIcon, SettingsIcon, SmileIcon, UserIcon } from 'lucide-react';

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
} from '../../components/alert-dialog';
import { Button, buttonVariants } from '../../components/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandGroupLabel,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from '../../components/command';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../../components/dialog';
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '../../components/drawer';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from '../../components/dropdown-menu';
import { Input } from '../../components/input';
import { Label } from '../../components/label';
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '../../components/popover';
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../../components/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/tooltip';
import { Section, Specimen } from './sink-layout';

export function OverlaysSection() {
	return (
		<Section id='overlays' index='05' title='Overlays' description='Dialogs, menus, popovers, and panels — click to open'>
			<Specimen label='Dialog' center>
				<Dialog>
					<DialogTrigger render={<Button variant='outline' />}>Rename database</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Rename database</DialogTitle>
							<DialogDescription>Choose a new name. Existing connections keep working.</DialogDescription>
						</DialogHeader>
						<div className='grid gap-2 px-6 py-2'>
							<Label htmlFor='sink-dialog-name'>Name</Label>
							<Input id='sink-dialog-name' defaultValue='production-db' />
						</div>
						<DialogFooter>
							<DialogClose render={<Button variant='outline' />}>Cancel</DialogClose>
							<DialogClose render={<Button />}>Save changes</DialogClose>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</Specimen>
			<Specimen label='AlertDialog' center>
				<AlertDialog>
					<AlertDialogTrigger render={<Button variant='destructive-outline' />}>Delete project</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete constructive/prod?</AlertDialogTitle>
							<AlertDialogDescription>
								This permanently removes the project and all of its databases. This cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel render={<Button variant='outline' />}>Cancel</AlertDialogCancel>
							<AlertDialogAction render={<Button variant='destructive' />}>Delete</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</Specimen>
			<Specimen label='Sheet' center>
				<Sheet>
					<SheetTrigger render={<Button variant='outline' />}>Open right sheet</SheetTrigger>
					<SheetContent side='right'>
						<SheetHeader>
							<SheetTitle>Table settings</SheetTitle>
							<SheetDescription>Adjust how this table behaves.</SheetDescription>
						</SheetHeader>
						<div className='grid gap-2 px-6'>
							<Label htmlFor='sink-sheet-name'>Display name</Label>
							<Input id='sink-sheet-name' defaultValue='orders' />
						</div>
						<SheetFooter>
							<SheetClose render={<Button />}>Done</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			</Specimen>
			<Specimen label='Drawer' hint='bottom sheet' center>
				<Drawer>
					<DrawerTrigger className={buttonVariants({ variant: 'outline' })}>Open drawer</DrawerTrigger>
					<DrawerContent>
						<DrawerHeader>
							<DrawerTitle>Move items</DrawerTitle>
							<DrawerDescription>Choose a destination for 12 selected rows.</DrawerDescription>
						</DrawerHeader>
						<DrawerFooter>
							<DrawerClose className={buttonVariants()}>Done</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			</Specimen>
			<Specimen label='Popover' center>
				<Popover>
					<PopoverTrigger render={<Button variant='outline' />}>Dimensions</PopoverTrigger>
					<PopoverContent>
						<PopoverTitle>Dimensions</PopoverTitle>
						<PopoverDescription>Set the canvas width and height in pixels.</PopoverDescription>
					</PopoverContent>
				</Popover>
			</Specimen>
			<Specimen label='Tooltip' center>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger render={<Button variant='outline' />}>Hover me</TooltipTrigger>
						<TooltipContent>Reindex this table</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</Specimen>
			<Specimen label='DropdownMenu' center>
				<DropdownMenu>
					<DropdownMenuTrigger render={<Button variant='outline' />}>Actions</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuLabel>Table actions</DropdownMenuLabel>
						<DropdownMenuItem>
							Duplicate
							<DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem>
							Export CSV
							<DropdownMenuShortcut>⇧⌘E</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuCheckboxItem checked>Show system columns</DropdownMenuCheckboxItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem className='text-destructive'>Drop table</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</Specimen>
			<Specimen label='Command' hint='cmdk' wide>
				<Command className='mx-auto w-full max-w-md rounded-lg border'>
					<CommandInput placeholder='Type a command or search...' />
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandGroup>
							<CommandGroupLabel>Suggestions</CommandGroupLabel>
							<CommandItem value='calendar'>
								<CalendarIcon />
								<span>Calendar</span>
							</CommandItem>
							<CommandItem value='emoji'>
								<SmileIcon />
								<span>Search Emoji</span>
							</CommandItem>
							<CommandItem value='calculator'>
								<CalculatorIcon />
								<span>Calculator</span>
							</CommandItem>
						</CommandGroup>
						<CommandSeparator />
						<CommandGroup>
							<CommandGroupLabel>Settings</CommandGroupLabel>
							<CommandItem value='profile'>
								<UserIcon />
								<span>Profile</span>
								<CommandShortcut>⌘P</CommandShortcut>
							</CommandItem>
							<CommandItem value='settings'>
								<SettingsIcon />
								<span>Settings</span>
								<CommandShortcut>⌘S</CommandShortcut>
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</Specimen>
		</Section>
	);
}
