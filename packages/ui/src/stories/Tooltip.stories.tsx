import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/tooltip';

const meta: Meta<typeof Tooltip> = {
	title: 'UI/Tooltip',
	component: Tooltip,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant='outline'>Hover me</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>This is a tooltip</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	),
};

export const WithArrow: Story = {
	render: () => (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant='outline'>Hover for arrow tooltip</Button>
				</TooltipTrigger>
				<TooltipContent showArrow>
					<p>Tooltip with arrow</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	),
};

export const DifferentSides: Story = {
	render: () => (
		<TooltipProvider>
			<div className='grid h-[300px] w-[400px] grid-cols-2 place-items-center gap-8'>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant='outline'>Top</Button>
					</TooltipTrigger>
					<TooltipContent side='top'>
						<p>Tooltip on top</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant='outline'>Right</Button>
					</TooltipTrigger>
					<TooltipContent side='right'>
						<p>Tooltip on right</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant='outline'>Bottom</Button>
					</TooltipTrigger>
					<TooltipContent side='bottom'>
						<p>Tooltip on bottom</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant='outline'>Left</Button>
					</TooltipTrigger>
					<TooltipContent side='left'>
						<p>Tooltip on left</p>
					</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	),
};

export const LongContent: Story = {
	render: () => (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant='outline'>Hover for detailed info</Button>
				</TooltipTrigger>
				<TooltipContent className='max-w-xs'>
					<p>
						This is a longer tooltip with more detailed information that wraps to multiple lines when the content is too
						long to fit on a single line.
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	),
};

export const WithIcon: Story = {
	render: () => (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant='outline' size='icon'>
						ℹ️
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>This is an information icon</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	),
};

export const HelpText: Story = {
	render: () => (
		<TooltipProvider>
			<div className='space-y-4'>
				<div className='flex items-center gap-2'>
					<label htmlFor='username' className='text-sm font-medium'>
						Username
					</label>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant='ghost' size='sm' className='h-4 w-4 p-0'>
								?
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Your username must be unique and contain only letters, numbers, and underscores.</p>
						</TooltipContent>
					</Tooltip>
				</div>

				<div className='flex items-center gap-2'>
					<label htmlFor='password' className='text-sm font-medium'>
						Password
					</label>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant='ghost' size='sm' className='h-4 w-4 p-0'>
								?
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</div>
		</TooltipProvider>
	),
};

export const DisabledButton: Story = {
	render: () => (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span>
						<Button disabled>Disabled Button</Button>
					</span>
				</TooltipTrigger>
				<TooltipContent>
					<p>This action is currently unavailable</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	),
};

export const ActionButtons: Story = {
	render: () => (
		<TooltipProvider>
			<div className='flex space-x-2'>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant='outline' size='icon'>
							✏️
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Edit item</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant='outline' size='icon'>
							🗑️
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Delete item</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant='outline' size='icon'>
							📋
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Copy to clipboard</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant='outline' size='icon'>
							📤
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Share item</p>
					</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	),
};

export const CustomDelay: Story = {
	render: () => (
		<div className='space-y-4'>
			<TooltipProvider delayDuration={0}>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant='outline'>Instant tooltip</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>This tooltip appears instantly</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<TooltipProvider delayDuration={1000}>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant='outline'>Delayed tooltip</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>This tooltip has a 1 second delay</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	),
};

export const StatusIndicators: Story = {
	render: () => (
		<TooltipProvider>
			<div className='flex space-x-4'>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className='h-3 w-3 cursor-help rounded-full bg-green-500'></div>
					</TooltipTrigger>
					<TooltipContent>
						<p>Service is online</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<div className='h-3 w-3 cursor-help rounded-full bg-yellow-500'></div>
					</TooltipTrigger>
					<TooltipContent>
						<p>Service is degraded</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<div className='h-3 w-3 cursor-help rounded-full bg-red-500'></div>
					</TooltipTrigger>
					<TooltipContent>
						<p>Service is offline</p>
					</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	),
};

export const ComplexContent: Story = {
	render: () => (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant='outline'>User Profile</Button>
				</TooltipTrigger>
				<TooltipContent className='max-w-sm'>
					<div className='space-y-2'>
						<div className='font-semibold'>John Doe</div>
						<div className='text-muted-foreground text-sm'>Software Engineer</div>
						<div className='text-xs'>Last seen: 2 hours ago</div>
						<div className='text-xs'>Status: Available</div>
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	),
};
