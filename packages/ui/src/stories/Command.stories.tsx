import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	CalendarIcon,
	CreditCardIcon,
	SettingsIcon,
	UserIcon,
	MailIcon,
	FileIcon,
	CalculatorIcon,
	SmileIcon,
} from 'lucide-react';

import {
	Command,
	CommandDialog,
	CommandDialogPopup,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandGroupLabel,
	CommandItem,
	CommandSeparator,
	CommandShortcut,
	CommandFooter,
	CommandPanel,
} from '../components/command';
import { Button } from '../components/button';

const meta: Meta<typeof Command> = {
	title: 'UI/Command',
	component: Command,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Command className='w-[350px] rounded-lg border shadow-md'>
			<CommandInput placeholder='Type a command or search...' />
			<CommandList>
				<CommandGroup>
					<CommandGroupLabel>Suggestions</CommandGroupLabel>
					<CommandItem value='calendar'>
						<CalendarIcon className='mr-2 h-4 w-4' />
						<span>Calendar</span>
					</CommandItem>
					<CommandItem value='search-emoji'>
						<SmileIcon className='mr-2 h-4 w-4' />
						<span>Search Emoji</span>
					</CommandItem>
					<CommandItem value='calculator'>
						<CalculatorIcon className='mr-2 h-4 w-4' />
						<span>Calculator</span>
					</CommandItem>
				</CommandGroup>
				<CommandSeparator />
				<CommandGroup>
					<CommandGroupLabel>Settings</CommandGroupLabel>
					<CommandItem value='profile'>
						<UserIcon className='mr-2 h-4 w-4' />
						<span>Profile</span>
						<CommandShortcut>⌘P</CommandShortcut>
					</CommandItem>
					<CommandItem value='billing'>
						<CreditCardIcon className='mr-2 h-4 w-4' />
						<span>Billing</span>
						<CommandShortcut>⌘B</CommandShortcut>
					</CommandItem>
					<CommandItem value='settings'>
						<SettingsIcon className='mr-2 h-4 w-4' />
						<span>Settings</span>
						<CommandShortcut>⌘S</CommandShortcut>
					</CommandItem>
				</CommandGroup>
			</CommandList>
			<CommandEmpty>No results found.</CommandEmpty>
		</Command>
	),
};

export const InDialog: Story = {
	render: function DialogExample() {
		const [open, setOpen] = useState(false);

		return (
			<>
				<Button variant='outline' onClick={() => setOpen(true)}>
					Open Command Palette
					<kbd className='ml-2 rounded border bg-muted px-1.5 py-0.5 font-mono text-xs'>⌘K</kbd>
				</Button>
				<CommandDialog open={open} onOpenChange={setOpen}>
					<CommandDialogPopup>
						<Command>
							<CommandInput placeholder='Type a command or search...' />
							<CommandPanel>
								<CommandList>
									<CommandGroup>
										<CommandGroupLabel>Suggestions</CommandGroupLabel>
										<CommandItem value='calendar'>
											<CalendarIcon className='mr-2 h-4 w-4' />
											<span>Calendar</span>
										</CommandItem>
										<CommandItem value='search-emoji'>
											<SmileIcon className='mr-2 h-4 w-4' />
											<span>Search Emoji</span>
										</CommandItem>
									</CommandGroup>
									<CommandSeparator />
									<CommandGroup>
										<CommandGroupLabel>Settings</CommandGroupLabel>
										<CommandItem value='profile'>
											<UserIcon className='mr-2 h-4 w-4' />
											<span>Profile</span>
											<CommandShortcut>⌘P</CommandShortcut>
										</CommandItem>
										<CommandItem value='settings'>
											<SettingsIcon className='mr-2 h-4 w-4' />
											<span>Settings</span>
											<CommandShortcut>⌘S</CommandShortcut>
										</CommandItem>
									</CommandGroup>
								</CommandList>
								<CommandEmpty>No results found.</CommandEmpty>
							</CommandPanel>
							<CommandFooter>
								<span>Press ↵ to select</span>
								<span>ESC to close</span>
							</CommandFooter>
						</Command>
					</CommandDialogPopup>
				</CommandDialog>
			</>
		);
	},
};

export const QuickActions: Story = {
	render: () => (
		<Command className='w-[350px] rounded-lg border shadow-md'>
			<CommandInput placeholder='Type a command or search...' />
			<CommandList>
				<CommandGroup>
					<CommandGroupLabel>Quick Actions</CommandGroupLabel>
					<CommandItem value='new-file'>
						<FileIcon className='mr-2 h-4 w-4' />
						<span>New File</span>
						<CommandShortcut>⌘N</CommandShortcut>
					</CommandItem>
					<CommandItem value='new-mail'>
						<MailIcon className='mr-2 h-4 w-4' />
						<span>New Email</span>
						<CommandShortcut>⌘M</CommandShortcut>
					</CommandItem>
				</CommandGroup>
			</CommandList>
			<CommandEmpty>No results found.</CommandEmpty>
		</Command>
	),
};

export const GroupedCommands: Story = {
	render: () => (
		<Command className='w-[400px] rounded-lg border shadow-md'>
			<CommandInput placeholder='Search pages, actions, settings...' />
			<CommandList>
				<CommandGroup>
					<CommandGroupLabel>Pages</CommandGroupLabel>
					<CommandItem value='home'>Home</CommandItem>
					<CommandItem value='dashboard'>Dashboard</CommandItem>
					<CommandItem value='projects'>Projects</CommandItem>
					<CommandItem value='tasks'>Tasks</CommandItem>
					<CommandItem value='reports'>Reports</CommandItem>
				</CommandGroup>
				<CommandSeparator />
				<CommandGroup>
					<CommandGroupLabel>Actions</CommandGroupLabel>
					<CommandItem value='create-project'>Create Project</CommandItem>
					<CommandItem value='invite-member'>Invite Team Member</CommandItem>
					<CommandItem value='export-data'>Export Data</CommandItem>
				</CommandGroup>
				<CommandSeparator />
				<CommandGroup>
					<CommandGroupLabel>Settings</CommandGroupLabel>
					<CommandItem value='account'>Account Settings</CommandItem>
					<CommandItem value='notifications'>Notifications</CommandItem>
					<CommandItem value='security'>Security</CommandItem>
					<CommandItem value='integrations'>Integrations</CommandItem>
				</CommandGroup>
			</CommandList>
			<CommandEmpty>No results found.</CommandEmpty>
		</Command>
	),
};

export const WithFooter: Story = {
	render: () => (
		<Command className='w-[400px] rounded-lg border shadow-md'>
			<CommandInput placeholder='Type a command or search...' />
			<CommandList>
				<CommandGroup>
					<CommandGroupLabel>Results</CommandGroupLabel>
					<CommandItem value='linear'>Linear</CommandItem>
					<CommandItem value='figma'>Figma</CommandItem>
					<CommandItem value='notion'>Notion</CommandItem>
					<CommandItem value='slack'>Slack</CommandItem>
				</CommandGroup>
			</CommandList>
			<CommandEmpty>No results found.</CommandEmpty>
			<CommandFooter>
				<div className='flex items-center gap-4'>
					<span className='flex items-center gap-1'>
						<kbd className='rounded border bg-muted px-1'>↑</kbd>
						<kbd className='rounded border bg-muted px-1'>↓</kbd>
						Navigate
					</span>
					<span className='flex items-center gap-1'>
						<kbd className='rounded border bg-muted px-1'>↵</kbd>
						Select
					</span>
					<span className='flex items-center gap-1'>
						<kbd className='rounded border bg-muted px-1'>esc</kbd>
						Close
					</span>
				</div>
			</CommandFooter>
		</Command>
	),
};

export const Empty: Story = {
	render: () => (
		<Command className='w-[350px] rounded-lg border shadow-md'>
			<CommandInput placeholder='Search for something...' />
			<CommandList />
			<CommandEmpty>
				<div className='flex flex-col items-center gap-2 py-4'>
					<SmileIcon className='h-8 w-8 text-muted-foreground' />
					<p className='text-sm'>No results found</p>
					<p className='text-muted-foreground text-xs'>Try a different search term</p>
				</div>
			</CommandEmpty>
		</Command>
	),
};

export const SearchableList: Story = {
	render: () => (
		<Command className='w-[300px] rounded-lg border shadow-md'>
			<CommandInput placeholder='Search frameworks...' />
			<CommandList>
				<CommandGroup>
					<CommandGroupLabel>Frameworks</CommandGroupLabel>
					<CommandItem value='nextjs'>Next.js</CommandItem>
					<CommandItem value='react'>React</CommandItem>
					<CommandItem value='vue'>Vue</CommandItem>
					<CommandItem value='nuxt'>Nuxt</CommandItem>
					<CommandItem value='svelte'>Svelte</CommandItem>
					<CommandItem value='sveltekit'>SvelteKit</CommandItem>
					<CommandItem value='angular'>Angular</CommandItem>
					<CommandItem value='remix'>Remix</CommandItem>
					<CommandItem value='astro'>Astro</CommandItem>
					<CommandItem value='solid'>Solid</CommandItem>
					<CommandItem value='qwik'>Qwik</CommandItem>
					<CommandItem value='gatsby'>Gatsby</CommandItem>
				</CommandGroup>
			</CommandList>
			<CommandEmpty>No framework found.</CommandEmpty>
		</Command>
	),
};
